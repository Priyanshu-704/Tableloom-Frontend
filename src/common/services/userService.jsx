import { logger } from "../utils/logger.js";
import axios from "axios";
import { axiosInstance, getTenantHeaders } from "./api";
import handleApiError from "../utils/handleApiError";
import pushNotificationService from "./pushNotificationService";
import { clearStoredTenantId, syncStoredTenantId } from "../utils/tenantStorage.js";
import { createRequestCache } from "../utils/requestCache";
import { buildAdminPath, buildPlatformAdminPath, buildSuperAdminPath, isSuperAdminPath } from "../utils/routes.js";
import toServiceResponse from "./serviceResponse";
const apiBaseUrl = import.meta.env.VITE_APP_API_URL;
const authRequestCache = createRequestCache(5000);
const externalRequest = async (method, path, data, config = {}) => {
  const response = await axios({
    method,
    url: `${apiBaseUrl}${path}`,
    data,
    headers: {
      ...(config.headers || {}),
      ...getTenantHeaders()
    },
    withCredentials: true,
    ...config
  });
  return toServiceResponse(response, {
    success: false,
    message: "Invalid server response",
    data: null
  });
};
const getCurrentUser = () => {
  try {
    const userStr = sessionStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};
const getToken = () => sessionStorage.getItem("token");
const clearLocalAuth = () => {
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token");
  clearStoredTenantId();
  authRequestCache.clear();
};
const syncStoredUser = (partialUser = {}) => {
  const currentUser = getCurrentUser() || {};
  const nextUser = {
    ...currentUser,
    ...(partialUser || {})
  };
  sessionStorage.setItem("user", JSON.stringify(nextUser));
  syncStoredTenantId(nextUser);
};
export const userService = {
  login: async (email, password) => {
    try {
      const response = await externalRequest("post", "/users/login", {
        email,
        password
      });
      if (response?.success) {
        authRequestCache.invalidate("auth:profile");
        if (response?.data) {
          sessionStorage.setItem("user", JSON.stringify(response.data));
          syncStoredTenantId(response.data);
        }
        if (response?.accessToken) {
          sessionStorage.setItem("token", response.accessToken);
        }
      }
      return response;
    } catch (error) {
      handleApiError(error, "Failed to login");
    }
  },
  registerStaff: async (staffData = {}) => {
    try {
      const response = await axiosInstance.post("/users/register", staffData);
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to register staff");
    }
  },
  logout: async () => {
    try {
      await pushNotificationService.clearAllStoredTokens();
      await axiosInstance.post("/users/logout");
    } catch (error) {
      logger.error("Logout error:", error);
    } finally {
      clearLocalAuth();
      pushNotificationService.clearAllStoredTokens();
      window.location.href = getCurrentUser()?.role === "super_admin" ? buildPlatformAdminPath("/login") : isSuperAdminPath(window.location.pathname) ? buildSuperAdminPath("/login") : buildAdminPath("/login");
    }
  },
  getProfile: async () => {
    try {
      const response = await authRequestCache.run("auth:profile", async () => axiosInstance.get("/users/profile"));
      if (response?.data?.success && response?.data?.data) {
        syncStoredUser(response.data.data);
      }
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch profile");
    }
  },
  updateProfile: async (profileData = {}) => {
    try {
      const response = await axiosInstance.put("/users/profile", profileData);
      authRequestCache.invalidate("auth:profile");
      if (response?.data?.success && response?.data?.data) {
        syncStoredUser(response.data.data);
      }
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to update profile");
    }
  },
  updatePassword: async (currentPassword, newPassword) => {
    try {
      const response = await axiosInstance.put("/users/update-password", {
        currentPassword,
        newPassword
      });
      authRequestCache.invalidate("auth:profile");
      if (response?.data?.success && response?.data?.logoutRequired !== false) {
        clearLocalAuth();
      }
      if (response?.data?.success && response?.data?.data) {
        syncStoredUser(response.data.data);
      }
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to update password");
    }
  },
  refreshToken: async () => {
    try {
      const response = await axiosInstance.post("/users/refresh-token");
      authRequestCache.invalidate("auth:profile");
      if (response?.data?.success && response?.data?.accessToken) {
        sessionStorage.setItem("token", response.data.accessToken);
      }
      if (response?.data?.success && response?.data?.data) {
        syncStoredUser(response.data.data);
      }
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to refresh token");
    }
  },
  forgotPassword: async email => {
    try {
      return await externalRequest("post", "/users/forgot-password", {
        email
      });
    } catch (error) {
      handleApiError(error, "Failed to request password reset");
    }
  },
  resetPassword: async (token, password) => {
    try {
      const response = await externalRequest("put", `/users/reset-password/${token}`, {
        password
      });
      if (response?.success) {
        clearLocalAuth();
      }
      return response;
    } catch (error) {
      handleApiError(error, "Failed to reset password");
    }
  },
  validateResetToken: async token => {
    try {
      return await externalRequest("post", `/users/validate-reset-token/${token}`, {});
    } catch (error) {
      handleApiError(error, "Failed to validate reset token");
    }
  },
  getAllStaff: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/users/staff", {
        params: filters
      });
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch staff");
    }
  },
  toggleStaffStatus: async (userId, isActive) => {
    try {
      const response = await axiosInstance.put(`/users/${userId}/status`, {
        isActive
      });
      const currentUser = getCurrentUser();
      if (currentUser?._id === userId && !isActive) {
        clearLocalAuth();
      }
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to update staff status");
    }
  },
  deleteStaff: async userId => {
    try {
      const response = await axiosInstance.delete(`/users/${userId}`);
      const currentUser = getCurrentUser();
      if (currentUser?._id === userId) {
        clearLocalAuth();
      }
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to delete staff");
    }
  },
  updateUserRole: async (userId, role) => {
    try {
      const response = await axiosInstance.put(`/users/${userId}/role`, {
        role
      });
      if (response?.data?.success && response?.data?.data) {
        const currentUser = getCurrentUser();
        if (currentUser?._id === userId) {
          syncStoredUser({
            role: response?.data?.data?.role,
            permissions: response?.data?.data?.permissions
          });
        }
      }
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to update user role");
    }
  },
  getCurrentUser,
  getToken,
  isAuthenticated: () => {
    const token = getToken();
    const user = getCurrentUser();
    if (!token || !user) {
      return false;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")?.[1] || ""));
      return (payload?.exp || 0) * 1000 > Date.now();
    } catch {
      return true;
    }
  },
  hasRole: role => getCurrentUser()?.role === role,
  hasAnyRole: (roles = []) => roles.includes(getCurrentUser()?.role),
  isAdmin: () => getCurrentUser()?.role === "admin",
  isManagerOrAdmin: () => ["super_admin", "admin", "manager"].includes(getCurrentUser()?.role),
  canRegisterStaff: () => Boolean(getCurrentUser()?.permissions?.includes("user_create")),
  canManageStaff: () => Boolean(getCurrentUser()?.permissions?.includes("user_edit") || getCurrentUser()?.permissions?.includes("user_delete") || getCurrentUser()?.permissions?.includes("user_change_status")),
  clearLocalAuth,
  canManagePermissions: () => Boolean(getCurrentUser()?.permissions?.includes("user_manage_permissions")),
  checkAuth: async () => {
    try {
      await userService.getProfile();
      return true;
    } catch {
      return false;
    }
  }
};
export default userService;
