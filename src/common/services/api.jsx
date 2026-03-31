import { logger } from "../utils/logger.js";
import axios from "axios";
import {
  buildAdminPath,
  buildPlatformAdminPath,
  extractTenantFromPath,
  isSuperAdminMonitoringPath,
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
const API_URL = import.meta.env.VITE_APP_API_URL;
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true
});
export const axiosInstance = api;
const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isReadOnlyMonitoringRequest = config => {
  const user = getStoredUser();
  if (!isSuperAdminMonitoringPath(window.location.pathname, user?.role)) {
    return false;
  }

  const method = String(config?.method || "get").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return false;
  }

  const url = String(config?.url || "");
  return !url.includes("/users/logout");
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
const subscribeTokenRefresh = cb => refreshSubscribers.push(cb);
const onRefreshed = token => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};
api.interceptors.request.use(config => {
  if (isReadOnlyMonitoringRequest(config)) {
    showNotification("Super admin monitoring mode is read-only in tenant workspaces.", "warning");
    return Promise.reject(new Error("Monitoring mode is read-only"));
  }

  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  Object.assign(config.headers, getTenantHeaders());
  return config;
}, error => Promise.reject(error));
api.interceptors.response.use(response => {
  saveOfflineApiResponse(response?.config, response);
  return response;
}, async error => {
  const originalRequest = error.config;
  if (error.response?.status === 401 && !originalRequest._retry) {
    if (isRefreshing) {
      return new Promise(resolve => {
        subscribeTokenRefresh(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }
    originalRequest._retry = true;
    isRefreshing = true;
    try {
      const refreshResponse = await axios.post(`${API_URL}/users/refresh-token`, {}, {
        withCredentials: true
      });
      if (refreshResponse.data.success) {
        const newToken = refreshResponse.data.accessToken;
        sessionStorage.setItem("token", newToken);
        if (refreshResponse.data.data) {
          sessionStorage.setItem("user", JSON.stringify(refreshResponse.data.data));
          syncStoredTenantId(refreshResponse.data.data);
        }
        onRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
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
    const cachedResponse = method === "GET" ? getOfflineApiResponse(originalRequest) : null;

    if (cachedResponse) {
      showNotification("Showing cached data because the network is unavailable.", "warning");
      return Promise.resolve({
        data: cachedResponse.data,
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {},
        config: {
          ...originalRequest,
          offlineCached: true
        },
        request: null
      });
    }

    handleNetworkError();
  }
  return Promise.reject(error);
});
const handleUnauthorized = () => {
  const user = getStoredUser();
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token");
  clearStoredTenantId();
  window.location.href = String(user?.role || "").toLowerCase() === "super_admin" ? buildPlatformAdminPath("/login") : buildAdminPath("/login");
};
const handleForbidden = () => showNotification("You do not have permission to perform this action", "error");
const handleNetworkError = () => showNotification("Network error. Please check your internet connection.", "error");
const handleRateLimit = () => showNotification("Too many requests. Please try again later.", "warning");
const handleServerError = () => showNotification("Server error. Please try again later.", "error");
const showNotification = (message, type = "info") => {
  if (window.showNotification) {
    window.showNotification(message, type);
  }
};
export default api;
