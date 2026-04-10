import { extractTenantFromPath } from "./routes.js";
export const withTenantQueryParams = (url = "", pathname = typeof window !== "undefined" ? window.location.pathname : "/") => {
  if (!url) {
    return "";
  }
  const tenant = extractTenantFromPath(pathname);
  if (!tenant?.tenantSlug || !tenant?.tenantKey) {
    return url;
  }
  try {
    const resolvedUrl = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    resolvedUrl.searchParams.set("tenantSlug", tenant.tenantSlug);
    resolvedUrl.searchParams.set("tenantKey", tenant.tenantKey);
    return resolvedUrl.toString();
  } catch {
    return url;
  }
};
