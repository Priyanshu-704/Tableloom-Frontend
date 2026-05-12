import { logger } from "../utils/logger.js";
import axios from "axios";
import { API_BASE_URL } from "../utils/env.js";
import {
  buildAdminPath,
  buildCustomerPath,
  buildPlatformAdminPath,
  extractTenantFromPath,
  isSuperAdminMonitoringPath,
  isSuperAdminPath,
  isTenantAdminPath,
  isTenantOperationalApiPath,
  stripAppBasePath,
} from "../utils/routes.js";
import {
  clearStoredTenantId,
  getStoredTenantId,
  syncStoredTenantId,
} from "../utils/tenantStorage.js";
import {
  getOfflineApiResponse,
  saveOfflineApiResponse,
} from "../utils/offlineCache.js";
const API_URL = API_BASE_URL;
const ACCESS_TOKEN_STORAGE_KEY = "auth.accessToken";
const REFRESH_TOKEN_STORAGE_KEY = "auth.refreshToken";
const COMPLETED_VISIT_STORAGE_KEY = "tableloom_completed_visit";
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});
export const axiosInstance = api;
const canUseSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
const readStoredToken = (storageKey) => {
  if (!canUseSessionStorage()) {
    return "";
  }

  return String(window.sessionStorage.getItem(storageKey) || "").trim();
};
export const getStoredAuthTokens = () => ({
  accessToken: readStoredToken(ACCESS_TOKEN_STORAGE_KEY),
  refreshToken: readStoredToken(REFRESH_TOKEN_STORAGE_KEY),
});
export const setStoredAuthTokens = ({
  accessToken,
  refreshToken,
} = {}) => {
  if (!canUseSessionStorage()) {
    return;
  }

  if (accessToken) {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  } else if (accessToken === null) {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  if (refreshToken) {
    window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  } else if (refreshToken === null) {
    window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
};
export const clearStoredAuthTokens = () =>
  setStoredAuthTokens({
    accessToken: null,
    refreshToken: null,
  });
const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const getStoredCompletedVisit = () => {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(COMPLETED_VISIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const isReadOnlyMonitoringRequest = (config) => {
  const user = getStoredUser();
  if (String(user?.role || "").toLowerCase() !== "super_admin") {
    return false;
  }
  if (!isSuperAdminMonitoringPath(window.location.pathname, user?.role)) {
    return false;
  }
  const method = String(config?.method || "get").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return false;
  }
  const url = String(config?.url || "");
  if (url.includes("/backups/clone")) {
    return false;
  }
  return isTenantOperationalApiPath(url) && !url.includes("/users/logout");
};
export const getTenantHeaders = () => {
  const tenant = extractTenantFromPath(window.location.pathname);
  if (tenant) {
    return {
      "x-tenant-slug": tenant.tenantSlug,
      "x-tenant-key": tenant.tenantKey,
    };
  }
  const currentPath = stripAppBasePath(window.location.pathname || "/");
  if (currentPath.startsWith("/admin")) {
    return {};
  }
  const storedTenantId = getStoredTenantId();
  if (!storedTenantId) return {};
  return {
    "x-tenant-id": storedTenantId,
  };
};
let isRefreshing = false;
let refreshSubscribers = [];
const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const onRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};
const isAuthRoute = (url = "") => {
  const normalizedUrl = String(url || "").trim();
  return (
    normalizedUrl.includes("/users/login") ||
    normalizedUrl.includes("/users/refresh-token") ||
    normalizedUrl.includes("/users/logout")
  );
};
api.interceptors.request.use(
  (config) => {
    if (isReadOnlyMonitoringRequest(config)) {
      showNotification(
        "Super admin monitoring mode is read-only. Write actions are blocked.",
        "warning",
      );
      return Promise.reject(new Error("Monitoring mode is read-only"));
    }
    config.headers = config.headers || {};
    const { accessToken } = getStoredAuthTokens();
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    Object.assign(config.headers, getTenantHeaders());
    return config;
  },
  (error) => Promise.reject(error),
);
api.interceptors.response.use(
  (response) => {
    saveOfflineApiResponse(response?.config, response);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(api(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { refreshToken } = getStoredAuthTokens();
        const refreshResponse = await axios.post(
          `${API_URL}/users/refresh-token`,
          refreshToken
            ? {
                refreshToken,
              }
            : {},
          {
            headers: getTenantHeaders(),
            withCredentials: true,
          },
        );
        if (refreshResponse.data.success) {
          setStoredAuthTokens({
            accessToken: refreshResponse.data.accessToken || null,
            refreshToken: refreshResponse.data.refreshToken || null,
          });
          if (refreshResponse.data.data) {
            sessionStorage.setItem(
              "user",
              JSON.stringify(refreshResponse.data.data),
            );
            syncStoredTenantId(refreshResponse.data.data);
          }
          onRefreshed();
          return api(originalRequest);
        }
      } catch (refreshErr) {
        handleUnauthorized();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    if (error.response) {
      switch (error.response.status) {
        case 403:
          handleForbidden();
          break;
        case 404:
          logger.warn("404 Not Found:", error.config.url);
          break;
        case 429:
          handleRateLimit();
          break;
        case 500:
          handleServerError();
          break;
      }
    } else {
      const method = String(originalRequest?.method || "GET").toUpperCase();
      const cachedResponse =
        method === "GET" ? getOfflineApiResponse(originalRequest) : null;
      if (cachedResponse) {
        showNotification(
          "Showing cached data because the network is unavailable.",
          "warning",
        );
        return Promise.resolve({
          data: cachedResponse.data,
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: {},
          config: {
            ...originalRequest,
            offlineCached: true,
          },
          request: null,
        });
      }
      handleNetworkError();
    }
    return Promise.reject(error);
  },
);
const handleUnauthorized = () => {
  const user = getStoredUser();
  const completedVisit = getStoredCompletedVisit();
  const currentPath = window.location.pathname || "/";
  const isAdminContext = isTenantAdminPath(currentPath);
  const isPlatformAdminContext = isSuperAdminPath(currentPath);
  sessionStorage.removeItem("user");
  clearStoredTenantId();
  clearStoredAuthTokens();
  if (!isAdminContext && !isPlatformAdminContext && completedVisit?.completedAt) {
    window.location.href = buildCustomerPath("/thank-you");
    return;
  }
  window.location.href =
    String(user?.role || "").toLowerCase() === "super_admin" ||
    isPlatformAdminContext
      ? buildPlatformAdminPath("/login")
      : isAdminContext
        ? buildAdminPath("/login")
        : buildCustomerPath("/");
};
const handleForbidden = () =>
  showNotification(
    "You do not have permission to perform this action",
    "error",
  );
const handleNetworkError = () =>
  showNotification(
    "Network error. Please check your internet connection.",
    "error",
  );
const handleRateLimit = () =>
  showNotification("Too many requests. Please try again later.", "warning");
const handleServerError = () =>
  showNotification("Server error. Please try again later.", "error");
const showNotification = (message, type = "info") => {
  if (window.showNotification) {
    window.showNotification(message, type);
  }
};
export default api;
