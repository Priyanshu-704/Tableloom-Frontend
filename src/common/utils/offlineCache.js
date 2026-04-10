const CACHE_PREFIX = "tableloom:offline-api:";
const MAX_AGE_MS = 1000 * 60 * 30;
const isStorageAvailable = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const toAbsoluteUrl = (url = "") => {
  if (typeof window === "undefined") {
    return String(url || "");
  }
  return new URL(String(url || ""), window.location.origin).toString();
};
const toCacheKey = ({
  url = "",
  method = "GET",
  params,
  tenantHeaders
} = {}) => {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const normalizedUrl = toAbsoluteUrl(url);
  return `${CACHE_PREFIX}${JSON.stringify({
    method: normalizedMethod,
    url: normalizedUrl,
    params: params || {},
    tenantHeaders: tenantHeaders || {}
  })}`;
};
export const getOfflineCacheKey = config => toCacheKey({
  url: config?.url,
  method: config?.method,
  params: config?.params,
  tenantHeaders: {
    tenantSlug: config?.headers?.["x-tenant-slug"] || "",
    tenantKey: config?.headers?.["x-tenant-key"] || "",
    tenantId: config?.headers?.["x-tenant-id"] || ""
  }
});
export const saveOfflineApiResponse = (config, response) => {
  if (!isStorageAvailable() || !config || !response) {
    return;
  }
  const method = String(config?.method || "GET").toUpperCase();
  if (method !== "GET") {
    return;
  }
  try {
    const payload = {
      timestamp: Date.now(),
      status: response.status || 200,
      statusText: response.statusText || "OK",
      data: response.data
    };
    window.localStorage.setItem(getOfflineCacheKey(config), JSON.stringify(payload));
  } catch {}
};
export const getOfflineApiResponse = config => {
  if (!isStorageAvailable() || !config) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(getOfflineCacheKey(config));
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw);
    if (!payload?.timestamp || Date.now() - payload.timestamp > MAX_AGE_MS) {
      window.localStorage.removeItem(getOfflineCacheKey(config));
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
