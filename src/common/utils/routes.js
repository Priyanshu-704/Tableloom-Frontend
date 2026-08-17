const normalizePath = (path = "/") => {
  const normalized = `/${String(path || "/").replace(/^\/+/, "")}`;
  return normalized === "//" ? "/" : normalized;
};
const normalizeBasePath = (path = "/") => {
  const normalized = normalizePath(path);
  return normalized === "/" ? "" : normalized.replace(/\/+$/, "");
};
const TENANT_OPERATIONAL_API_PREFIXES = [
  "/menu",
  "/inventory",
  "/tables",
  "/customers",
  "/cart",
  "/orders",
  "/feedback",
  "/waiter-calls",
  "/kitchen",
  "/kitchen-stations",
  "/images",
  "/bills",
  "/notifications",
  "/push-notifications",
  "/settings",
  "/dashboard",
  "/reports",
  "/backups",
];
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
  return normalizedPath === "/"
    ? `${APP_BASE_PATH}/`
    : `${APP_BASE_PATH}${normalizedPath}`;
};
export const withAppBasePath = (path = "/") => prependAppBasePath(path);
export const extractTenantFromPath = (pathname = "") => {
  const segments = String(stripAppBasePath(pathname) || "")
    .split("/")
    .filter(Boolean);
  if (
    segments[0] === "super-admin" ||
    segments[0] === "admin" ||
    segments.length < 2
  ) {
    return null;
  }
  let branchSlug = null;
  const branchIdx = segments.indexOf("branch");
  if (branchIdx !== -1 && segments[branchIdx + 1]) {
    branchSlug = segments[branchIdx + 1];
  }
  return {
    tenantSlug: segments[0],
    tenantKey: segments[1],
    branchSlug,
  };
};
export const getTenantBasePath = (pathname = window.location.pathname) => {
  const tenant = extractTenantFromPath(pathname);
  return tenant ? `/${tenant.tenantSlug}/${tenant.tenantKey}` : "";
};
export const getAppBasePath = () => getTenantBasePath();
export const buildTenantPath = (
  path = "/",
  tenant = extractTenantFromPath(window.location.pathname),
) => {
  const normalizedPath = normalizePath(path);
  if (!tenant?.tenantSlug || !tenant?.tenantKey) {
    return prependAppBasePath(normalizedPath);
  }

  const currentPath = window.location.pathname;
  const branchMatch = currentPath.match(/\/branch\/([^/]+)/);
  const tableMatch = currentPath.match(/\/table\/([^/]+)/);

  let branchPrefix = branchMatch ? `/branch/${branchMatch[1]}` : "";
  let tablePrefix = "";

  const isCustomerRoute =
    !normalizedPath.startsWith("/admin") &&
    !normalizedPath.includes("/subscription-renewal");

  if (isCustomerRoute && tableMatch) {
    tablePrefix = `/table/${tableMatch[1]}`;
  }

  if (normalizedPath.startsWith("/admin")) {
    const subAdminPath =
      normalizedPath === "/admin"
        ? ""
        : normalizedPath.replace(/^\/admin/, "");
    return prependAppBasePath(
      `/${tenant.tenantSlug}/${tenant.tenantKey}${branchPrefix}/admin${subAdminPath}`,
    );
  }

  if (normalizedPath === "/" && isCustomerRoute) {
    return prependAppBasePath(
      `/${tenant.tenantSlug}/${tenant.tenantKey}${branchPrefix}${tablePrefix}`,
    );
  }

  return prependAppBasePath(
    `/${tenant.tenantSlug}/${tenant.tenantKey}${branchPrefix}${tablePrefix}${normalizedPath === "/" ? "" : normalizedPath}`,
  );
};
export const buildAppPath = (path = "/") => buildTenantPath(path);
export const buildAdminPath = (path = "/login") =>
  buildTenantPath(`/admin/${String(path || "/login").replace(/^\/+/, "")}`);
export const buildPlatformAdminPath = (path = "/login") =>
  prependAppBasePath(`/admin/${String(path || "/login").replace(/^\/+/, "")}`);
export const buildCustomerPath = (path = "/") => buildTenantPath(path);
export const buildSuperAdminPath = (path = "/login") =>
  prependAppBasePath(
    `/super-admin/${String(path || "/login").replace(/^\/+/, "")}`,
  );
export const stripTenantPrefix = (pathname = "") => {
  const strippedAppPath = stripAppBasePath(pathname);
  const tenantBasePath = getTenantBasePath(strippedAppPath);
  if (!tenantBasePath) {
    return normalizePath(strippedAppPath || "/");
  }
  const trimmed =
    String(strippedAppPath || "/").slice(tenantBasePath.length) || "/";
  return normalizePath(trimmed);
};
export const stripAdminRoutePrefix = (pathname = "") => {
  const strippedPath = stripTenantPrefix(pathname);
  const cleanPath = strippedPath.replace(/^\/branch\/[^/]+/, "");
  if (cleanPath.startsWith("/admin")) {
    return normalizePath(cleanPath.slice("/admin".length) || "/");
  }
  return normalizePath(cleanPath);
};
export const isTenantAdminPath = (pathname = "") => {
  const cleanPath = stripTenantPrefix(pathname).replace(/^\/branch\/[^/]+/, "");
  return (
    cleanPath.startsWith("/admin") ||
    stripAppBasePath(pathname).startsWith("/admin")
  );
};
export const isSuperAdminPath = (pathname = "") =>
  stripAppBasePath(pathname).startsWith("/super-admin");
export const isTenantContextPath = (pathname = "") =>
  Boolean(extractTenantFromPath(pathname));
export const isSuperAdminMonitoringPath = (pathname = "", role = "") =>
  String(role || "").toLowerCase() === "super_admin" &&
  isTenantContextPath(pathname);
export const isTenantOperationalApiPath = (url = "") => {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) {
    return false;
  }
  const apiPath = normalizedUrl
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/api/, "");
  return TENANT_OPERATIONAL_API_PREFIXES.some(
    (prefix) => apiPath === prefix || apiPath.startsWith(`${prefix}/`),
  );
};
export const resolveAdminHomePath = (role = "") => {
  switch (String(role || "").toLowerCase()) {
    case "super_admin":
      return buildPlatformAdminPath("/tenant-management");
    case "waiter":
      return buildAdminPath("/waiter-calls");
    case "chef":
      return buildAdminPath("/kitchen/dashboard");
    case "cashier":
      return buildAdminPath("/customers/bills");
    case "manager":
    case "admin":
    default:
      return buildAdminPath("/dashboard");
  }
};
