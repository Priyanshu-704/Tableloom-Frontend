import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
const permissionRequestCache = createRequestCache(15000);
const permissionState = {
  permissions: null,
  allPermissions: null,
  permissionDetails: null,
  permissionDependencyMap: null,
  rolePermissions: null,
  roles: null,
  permissionCategories: null,
  permissionDisplayNames: null,
  myAccess: null,
};
const normalizePermission = (permission) =>
  String(permission || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/\./g, "_")
    .toLowerCase();
const getCurrentUser = () => {
  try {
    const data = sessionStorage.getItem("user");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};
const generateDisplayNames = () => {
  if (!permissionState.permissionDetails) {
    return;
  }
  permissionState.permissionDisplayNames = {};
  permissionState.permissionDetails.forEach((permission) => {
    permissionState.permissionDisplayNames[permission.key] =
      permission.name || permission.key;
  });
};
const generateDependencyMap = () => {
  if (!permissionState.permissionDetails) {
    return;
  }
  permissionState.permissionDependencyMap =
    permissionState.permissionDetails.reduce((accumulator, permission) => {
      const normalizedKey = normalizePermission(permission.key);
      if (!normalizedKey) {
        return accumulator;
      }
      accumulator[normalizedKey] = Array.isArray(permission.impliedPermissions)
        ? permission.impliedPermissions.filter(Boolean)
        : [];
      return accumulator;
    }, {});
};
const getCategoryName = (prefix) => {
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
    WAITER_CALL: "Waiter Call Management",
    NOTIFICATION: "Notifications",
    DASHBOARD: "Dashboard",
    ANALYTICS: "Analytics",
    VIEW: "Reports & Analytics",
    SYSTEM: "System",
    BACKUP: "Backup & Restore",
  };
  return names[prefix] || `${prefix} Management`;
};
const generateCategories = () => {
  if (!permissionState.permissionDetails) {
    return;
  }
  const categoryMap = {};
  permissionState.permissionDetails.forEach((permission) => {
    const prefix = String(permission.key || "").split(".")?.[0]?.toUpperCase();
    if (!categoryMap[prefix]) {
      categoryMap[prefix] = [];
    }
    categoryMap[prefix].push(permission.key);
  });
  permissionState.permissionCategories = Object.entries(categoryMap).map(
    ([prefix, permissions]) => ({
      name: getCategoryName(prefix),
      permissions,
    }),
  );
};
export const permissionService = {
  clearCache: () => {
    permissionState.permissions = null;
    permissionState.allPermissions = null;
    permissionState.permissionDetails = null;
    permissionState.permissionDependencyMap = null;
    permissionState.rolePermissions = null;
    permissionState.roles = null;
    permissionState.permissionCategories = null;
    permissionState.permissionDisplayNames = null;
    permissionState.myAccess = null;
    permissionRequestCache.clear();
  },
  fetchAllPermissions: async () => {
    try {
      return await permissionRequestCache.run(
        "permissions-available",
        async () => {
          const response = await axiosInstance.get("/permissions/available");
          const data = response?.data?.data || response?.data || {};
          permissionState.permissions = data?.permissions || {};
          permissionState.allPermissions = data?.allPermissions || [];
          permissionState.permissionDetails =
            data?.permissionDetails ||
            permissionState.allPermissions.map((permission) => ({
              key: permission,
              name: permission,
              description: "",
            }));
          permissionState.rolePermissions = data?.rolePermissions || {};
          permissionState.roles = data?.roles || [];
          generateDisplayNames();
          generateDependencyMap();
          generateCategories();
          return data;
        },
      );
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
  getRoles: async () => {
    if (!permissionState.roles) {
      await permissionService.fetchAllPermissions();
    }
    return permissionState.roles || [];
  },
  getPermissionDetails: async () => {
    if (!permissionState.permissionDetails) {
      await permissionService.fetchAllPermissions();
    }
    return permissionState.permissionDetails || [];
  },
  expandPermissionSelection: async (permissions = []) => {
    if (!permissionState.permissionDependencyMap) {
      await permissionService.fetchAllPermissions();
    }
    const dependencyMap = permissionState.permissionDependencyMap || {};
    const permissionKeyByNormalized = (permissionState.permissionDetails || []).reduce(
      (accumulator, permission) => {
        accumulator[normalizePermission(permission.key)] = permission.key;
        return accumulator;
      },
      {},
    );
    const expandedPermissions = new Set();
    const stack = [...permissions];
    while (stack.length > 0) {
      const currentPermission = stack.pop();
      const normalizedPermission = normalizePermission(currentPermission);
      if (!normalizedPermission || expandedPermissions.has(normalizedPermission)) {
        continue;
      }
      expandedPermissions.add(normalizedPermission);
      (dependencyMap[normalizedPermission] || []).forEach((dependency) => {
        const normalizedDependency = normalizePermission(dependency);
        if (
          normalizedDependency &&
          !expandedPermissions.has(normalizedDependency)
        ) {
          stack.push(dependency);
        }
      });
    }
    return Array.from(expandedPermissions).map(
      (permission) => permissionKeyByNormalized[permission] || permission,
    );
  },
  getMyPermissions: async () => {
    try {
      return await permissionRequestCache.run("permissions-me", async () => {
        const response = await axiosInstance.get("/permissions/me");
        const access = response?.data?.data || {};
        permissionState.myAccess = access;
        return access?.permissions || [];
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch your permissions");
    }
  },
  getMyAccess: async () => {
    if (permissionState.myAccess) {
      return permissionState.myAccess;
    }
    await permissionService.getMyPermissions();
    return permissionState.myAccess || {
      permissions: [],
      roles: [],
    };
  },
  getUserPermissions: async (userId) => {
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
        permissions,
      });
      permissionRequestCache.invalidate("permissions-me");
      permissionState.myAccess = null;
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to update user permissions");
    }
  },
  resetUserPermissions: async (userId) => {
    try {
      const response = await axiosInstance.post(
        `/permissions/user/${userId}/reset`,
      );
      permissionRequestCache.invalidate("permissions-me");
      permissionState.myAccess = null;
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to reset user permissions");
    }
  },
  hasPermission: async (permission) => {
    const myPerms = await permissionService.getMyPermissions();
    return myPerms.some(
      (userPermission) =>
        normalizePermission(userPermission) === normalizePermission(permission),
    );
  },
  getPermissionDisplayName: async (permission) => {
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
  getDefaultPermissionsForRole: async (role) => {
    const rolePerms = await permissionService.getRolePermissions();
    return rolePerms?.[role] || [];
  },
  getCurrentUser,
};
export default permissionService;
