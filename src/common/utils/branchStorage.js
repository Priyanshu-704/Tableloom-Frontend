/**
 * Persists the active branch selection in localStorage so it
 * survives page refreshes. The selection is keyed per-tenant so
 * switching tenants never bleeds data across workspaces.
 */

const BRANCH_STORAGE_PREFIX = "branch.active";

const hasBrowserStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const makeKey = (tenantId = "") =>
  tenantId ? `${BRANCH_STORAGE_PREFIX}.${tenantId}` : BRANCH_STORAGE_PREFIX;

/**
 * Returns the stored branch selection for a tenant.
 * Shape: { branchId, isAllBranches } | null
 */
export const getStoredBranchSelection = (tenantId = "") => {
  if (!hasBrowserStorage()) return null;
  try {
    const raw = window.localStorage.getItem(makeKey(tenantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Saves branch selection for a tenant.
 * @param {string} tenantId
 * @param {{ branchId?: string, isAllBranches?: boolean }} selection
 */
export const setStoredBranchSelection = (tenantId = "", selection = {}) => {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.setItem(makeKey(tenantId), JSON.stringify(selection));
  } catch {
    /* quota exceeded — silently ignore */
  }
};

export const clearStoredBranchSelection = (tenantId = "") => {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(makeKey(tenantId));
};
