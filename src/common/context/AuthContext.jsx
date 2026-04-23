import { logger } from "../utils/logger.js";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import userService from "../services/userService";
import permissionService from "../services/permissionService";
const AuthContext = createContext();
let profileBootstrapPromise = null;
let permissionBootstrapPromise = null;
const normalizePermission = (permission) =>
  String(permission || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toLowerCase()
    .replace(/\./g, "_");
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const requiresPasswordChange = Boolean(user?.forcePasswordChange);
  const hasLoadedProfileRef = useRef(false);
  const loadProfile = async () => {
    try {
      setLoading(true);
      const storedUser = sessionStorage.getItem("user");
      if (!storedUser) {
        setIsAuthenticated(false);
        setUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }
      if (!profileBootstrapPromise) {
        profileBootstrapPromise = userService
          .getProfile()
          .then((response) => response)
          .finally(() => {
            profileBootstrapPromise = null;
          });
      }
      const response = await profileBootstrapPromise;
      const profile = response?.data;
      if (profile) {
        if (!permissionBootstrapPromise) {
          permissionBootstrapPromise = permissionService
            .getMyAccess()
            .then((result) => result)
            .finally(() => {
              permissionBootstrapPromise = null;
            });
        }
        const access = await permissionBootstrapPromise;
        const userPerms = access?.permissions || profile?.permissions || [];
        setPermissions(userPerms);
        setUser({
          ...profile,
          permissions: userPerms,
          roles: access?.roles || profile.roles || [],
        });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setPermissions([]);
      }
    } catch (err) {
      logger.error("Profile load failed:", err);
      userService.clearLocalAuth();
      permissionService.clearCache();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (hasLoadedProfileRef.current) {
      return;
    }
    hasLoadedProfileRef.current = true;
    loadProfile();
  }, []);
  const login = async (email, password) => {
    const res = await userService.login(email, password);
    if (res.success) {
      await loadProfile();
    }
    return res;
  };
  const logout = () => {
    userService.logout();
    permissionService.clearCache();
    profileBootstrapPromise = null;
    permissionBootstrapPromise = null;
    setUser(null);
    setPermissions([]);
    setIsAuthenticated(false);
  };
  const hasPermission = (perm) => {
    if (!perm) return true;
    const normalizedTarget = normalizePermission(perm);
    return permissions.some(
      (userPermission) =>
        normalizePermission(userPermission) === normalizedTarget,
    );
  };
  const hasAnyPermission = (...requiredPermissions) => {
    if (!requiredPermissions.length) return true;
    return requiredPermissions.some((permission) => hasPermission(permission));
  };
  const can = hasPermission;
  const cannot = (permission) => !hasPermission(permission);
  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        isAuthenticated,
        requiresPasswordChange,
        login,
        logout,
        can,
        cannot,
        hasPermission,
        hasAnyPermission,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
