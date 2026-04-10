import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
const permissionRequestCache = createRequestCache(15000);
const permissionState = {
  permissions: null,
  allPermissions: null,
  rolePermissions: null,
  permissionCategories: null,
  permissionDisplayNames: null
};
const getCurrentUser = () => {
  try {
    const data = sessionStorage.getItem("user");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};
const hasFullAdminAccess = role => ["super_admin", "admin"].includes(String(role || "").toLowerCase());
const generateDisplayNames = () => {
  if (!permissionState.permissions) {
    return;
  }
  permissionState.permissionDisplayNames = {};
  Object.entries(permissionState.permissions).forEach(([key, value]) => {
    permissionState.permissionDisplayNames[value] = key.toLowerCase().split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  });
};
const getCategoryName = prefix => {
  const names = {
    USER: "User Management",
    MENU: "Menu Management",
    ORDER: "Order Management",
    TABLE: "Table Management",
    SESSION: "Session Management",
    KITCHEN: "Kitchen Management",
    CART: "Cart Management",
    FEEDBACK: "Feedback Management",
    WAITER: "Waiter Call Management",
    VIEW: "Reports & Analytics",
    SYSTEM: "System",
    BACKUP: "Backup & Restore"
  };
  return names[prefix] || `${prefix} Management`;
};
const generateCategories = () => {
  if (!permissionState.permissions) {
    return;
  }
  const categoryMap = {};
  Object.entries(permissionState.permissions).forEach(([key, value]) => {
    const prefix = key.split("_")?.[0];
    if (!categoryMap[prefix]) {
      categoryMap[prefix] = [];
    }
    categoryMap[prefix].push(value);
  });
  permissionState.permissionCategories = Object.entries(categoryMap).map(([prefix, permissions]) => ({
    name: getCategoryName(prefix),
    permissions
  }));
};
export const permissionService = {
  fetchAllPermissions: async () => {
    try {
      return await permissionRequestCache.run("permissions-available", async () => {
        const response = await axiosInstance.get("/permissions/available");
        const data = response?.data?.data || response?.data || {};
        permissionState.permissions = data?.permissions || {};
        permissionState.allPermissions = data?.allPermissions || [];
        permissionState.rolePermissions = data?.rolePermissions || {};
        generateDisplayNames();
        generateCategories();
        return data;
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch permissions");
    }
  },
  getPermissions: async () => {
    if (!permissionState.permissions) {
      await permissionService.fetchAllPermissions();
    }
    return permissionState.permissions || {};
  },
  getAllPermissionsList: async () => {
    if (!permissionState.allPermissions) {
      await permissionService.fetchAllPermissions();
    }
    return permissionState.allPermissions || [];
  },
  getRolePermissions: async () => {
    if (!permissionState.rolePermissions) {
      await permissionService.fetchAllPermissions();
    }
    return permissionState.rolePermissions || {};
  },
  getMyPermissions: async () => {
    try {
      const currentUser = getCurrentUser();
      if (hasFullAdminAccess(currentUser?.role)) {
        return (await permissionService.getAllPermissionsList()) || [];
      }
      return await permissionRequestCache.run("permissions-me", async () => {
        const response = await axiosInstance.get("/permissions/me");
        return response?.data?.data?.permissions || [];
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch your permissions");
    }
  },
  getUserPermissions: async userId => {
    try {
      const response = await axiosInstance.get(`/permissions/user/${userId}`);
      return response?.data?.permissions || response?.data?.data || [];
    } catch {
      const rolePerms = await permissionService.getRolePermissions();
      return rolePerms?.[getCurrentUser()?.role] || [];
    }
  },
  updateUserPermissions: async (userId, permissions = []) => {
    try {
      const response = await axiosInstance.put(`/permissions/user/${userId}`, {
        permissions
      });
      permissionRequestCache.invalidate("permissions-me");
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to update user permissions");
    }
  },
  resetUserPermissions: async userId => {
    try {
      const response = await axiosInstance.post(`/permissions/user/${userId}/reset`);
      permissionRequestCache.invalidate("permissions-me");
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to reset user permissions");
    }
  },
  hasPermission: async permission => {
    if (hasFullAdminAccess(getCurrentUser()?.role)) {
      return true;
    }
    const myPerms = await permissionService.getMyPermissions();
    return myPerms.includes(permission);
  },
  getPermissionDisplayName: async permission => {
    if (!permissionState.permissionDisplayNames) {
      await permissionService.fetchAllPermissions();
    }
    return permissionState.permissionDisplayNames?.[permission] || permission;
  },
  getPermissionsByCategory: async () => {
    if (!permissionState.permissionCategories) {
      await permissionService.fetchAllPermissions();
    }
    return permissionState.permissionCategories || [];
  },
  getDefaultPermissionsForRole: async role => {
    const rolePerms = await permissionService.getRolePermissions();
    return rolePerms?.[role] || [];
  },
  getCurrentUser
};
export default permissionService;
