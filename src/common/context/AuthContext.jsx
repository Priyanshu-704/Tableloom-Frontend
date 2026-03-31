import { logger } from "../utils/logger.js";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import userService from "../services/userService";
import permissionService from "../services/permissionService";
const AuthContext = createContext();
let profileBootstrapPromise = null;
let profileBootstrapResult = null;
let permissionBootstrapPromise = null;
let permissionBootstrapResult = null;
const normalizePermission = permission => String(permission || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
export const AuthProvider = ({
  children
}) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const requiresPasswordChange = Boolean(user?.forcePasswordChange);
  const hasLoadedProfileRef = useRef(false);
  const loadProfile = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }
      if (!profileBootstrapPromise) {
        profileBootstrapPromise = userService.getProfile().then(response => {
          profileBootstrapResult = response;
          return response;
        }).finally(() => {
          profileBootstrapPromise = null;
        });
      }
      const response = profileBootstrapResult || (await profileBootstrapPromise);
      const profile = response?.data;
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
        if (!permissionBootstrapPromise) {
          permissionBootstrapPromise = permissionService.getMyPermissions().then(result => {
            permissionBootstrapResult = result;
            return result;
          }).finally(() => {
            permissionBootstrapPromise = null;
          });
        }
        const userPerms = permissionBootstrapResult || (await permissionBootstrapPromise);
        setPermissions(userPerms);
      }
    } catch (err) {
      logger.error("Profile load failed:", err);
      userService.clearLocalAuth();
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
    profileBootstrapPromise = null;
    profileBootstrapResult = null;
    permissionBootstrapPromise = null;
    permissionBootstrapResult = null;
    setUser(null);
    setPermissions([]);
    setIsAuthenticated(false);
  };
  const hasPermission = perm => {
    if (!perm) return true;
    if (user?.role === "super_admin") return true;
    const normalizedTarget = normalizePermission(perm);
    return permissions.some(userPermission => normalizePermission(userPermission) === normalizedTarget);
  };
  const hasAnyPermission = (...requiredPermissions) => {
    if (!requiredPermissions.length) return true;
    return requiredPermissions.some(permission => hasPermission(permission));
  };
  return <AuthContext.Provider value={{
    user,
    permissions,
    loading,
    isAuthenticated,
    requiresPasswordChange,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    refreshProfile: loadProfile
  }}>
      {children}
    </AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
