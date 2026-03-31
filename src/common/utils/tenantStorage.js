const TENANT_ID_STORAGE_KEY = "tenantId";

const hasBrowserStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

export const getStoredTenantId = () => {
  if (!hasBrowserStorage()) {
    return "";
  }

  return window.localStorage.getItem(TENANT_ID_STORAGE_KEY) || "";
};

export const setStoredTenantId = tenantId => {
  if (!hasBrowserStorage()) {
    return;
  }

  const normalizedTenantId = String(tenantId || "").trim();

  if (!normalizedTenantId) {
    window.localStorage.removeItem(TENANT_ID_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TENANT_ID_STORAGE_KEY, normalizedTenantId);
};

export const syncStoredTenantId = user => {
  setStoredTenantId(user?.tenantId || "");
};

export const clearStoredTenantId = () => {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(TENANT_ID_STORAGE_KEY);
};

export { TENANT_ID_STORAGE_KEY };
