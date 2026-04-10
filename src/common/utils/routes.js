const normalizePath = (path = "/") => {
  const normalized = `/${String(path || "/").replace(/^\/+/, "")}`;
  return normalized === "//" ? "/" : normalized;
};
const normalizeBasePath = (path = "/") => {
  const normalized = normalizePath(path);
  return normalized === "/" ? "" : normalized.replace(/\/+$/, "");
};
const TENANT_OPERATIONAL_API_PREFIXES = ["/menu", "/inventory", "/tables", "/customers", "/cart", "/orders", "/feedback", "/waiter-calls", "/kitchen", "/kitchen-stations", "/images", "/bills", "/notifications", "/push-notifications", "/settings", "/dashboard", "/reports", "/backups"];
export const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL || "/");
export const stripAppBasePath = (pathname = "") => {
  const normalizedPath = normalizePath(pathname || "/");
  if (!APP_BASE_PATH || !normalizedPath.startsWith(APP_BASE_PATH)) {
    return normalizedPath;
  }
  const strippedPath = normalizedPath.slice(APP_BASE_PATH.length) || "/";
  return normalizePath(strippedPath);
};
export const prependAppBasePath = (path = "/") => {
  const normalizedPath = normalizePath(path);
  if (!APP_BASE_PATH) {
    return normalizedPath;
  }
  return normalizedPath === "/" ? `${APP_BASE_PATH}/` : `${APP_BASE_PATH}${normalizedPath}`;
};
export const withAppBasePath = (path = "/") => prependAppBasePath(path);
export const extractTenantFromPath = (pathname = "") => {
  const segments = String(stripAppBasePath(pathname) || "").split("/").filter(Boolean);
  if (segments[0] === "super-admin" || segments[0] === "admin" || segments.length < 2) {
    return null;
  }
  return {
    tenantSlug: segments[0],
    tenantKey: segments[1]
  };
};
export const getTenantBasePath = (pathname = window.location.pathname) => {
  const tenant = extractTenantFromPath(pathname);
  return tenant ? `/${tenant.tenantSlug}/${tenant.tenantKey}` : "";
};
export const getAppBasePath = () => getTenantBasePath();
export const buildTenantPath = (path = "/", tenant = extractTenantFromPath(window.location.pathname)) => {
  const normalizedPath = normalizePath(path);
  if (!tenant?.tenantSlug || !tenant?.tenantKey) {
    return prependAppBasePath(normalizedPath);
  }
  return prependAppBasePath(`/${tenant.tenantSlug}/${tenant.tenantKey}${normalizedPath === "/" ? "" : normalizedPath}`);
};
export const buildAppPath = (path = "/") => buildTenantPath(path);
export const buildAdminPath = (path = "/login") => buildTenantPath(`/admin/${String(path || "/login").replace(/^\/+/, "")}`);
export const buildPlatformAdminPath = (path = "/login") => prependAppBasePath(`/admin/${String(path || "/login").replace(/^\/+/, "")}`);
export const buildCustomerPath = (path = "/") => buildTenantPath(path);
export const buildSuperAdminPath = (path = "/login") => prependAppBasePath(`/super-admin/${String(path || "/login").replace(/^\/+/, "")}`);
export const stripTenantPrefix = (pathname = "") => {
  const strippedAppPath = stripAppBasePath(pathname);
  const tenantBasePath = getTenantBasePath(strippedAppPath);
  if (!tenantBasePath) {
    return normalizePath(strippedAppPath || "/");
  }
  const trimmed = String(strippedAppPath || "/").slice(tenantBasePath.length) || "/";
  return normalizePath(trimmed);
};
export const stripAdminRoutePrefix = (pathname = "") => {
  const strippedPath = stripTenantPrefix(pathname);
  if (strippedPath.startsWith("/admin")) {
    return normalizePath(strippedPath.slice("/admin".length) || "/");
  }
  return strippedPath;
};
export const isTenantAdminPath = (pathname = "") => stripTenantPrefix(pathname).startsWith("/admin") || stripAppBasePath(pathname).startsWith("/admin");
export const isSuperAdminPath = (pathname = "") => stripAppBasePath(pathname).startsWith("/super-admin");
export const isTenantContextPath = (pathname = "") => Boolean(extractTenantFromPath(pathname));
export const isSuperAdminMonitoringPath = (pathname = "", role = "") => String(role || "").toLowerCase() === "super_admin" && isTenantContextPath(pathname);
export const isTenantOperationalApiPath = (url = "") => {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) {
    return false;
  }
  const apiPath = normalizedUrl.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/api/, "");
  return TENANT_OPERATIONAL_API_PREFIXES.some(prefix => apiPath === prefix || apiPath.startsWith(`${prefix}/`));
};
export const resolveAdminHomePath = (role = "") => {
  switch (String(role || "").toLowerCase()) {
    case "super_admin":
      return buildPlatformAdminPath("/tenant-management");
    case "waiter":
      return buildAdminPath("/tables/list");
    case "chef":
      return buildAdminPath("/kitchen/dashboard");
    case "manager":
    case "admin":
    default:
      return buildAdminPath("/dashboard");
  }
};
