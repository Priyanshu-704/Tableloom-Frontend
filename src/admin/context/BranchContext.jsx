import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../common/context/AuthContext";
import branchService from "../../common/services/branchService";
import {
  clearStoredBranchSelection,
  getStoredBranchSelection,
  setStoredBranchSelection,
} from "../../common/utils/branchStorage";
import { logger } from "../../common/utils/logger";

/** @type {React.Context} */
const BranchContext = createContext(null);

/**
 * Derive whether this user can see/use the branch switcher at all.
 *
 * Rules (matching backend):
 *   - super_admin  → global scope, no branch switcher needed
 *   - admin        → branchScope "all", can switch + see all
 *   - manager/chef/waiter → branchScope "own", one branch, no switcher
 */
const deriveUserBranchScope = (user = {}) => {
  const role = String(user?.role || "").toLowerCase();
  const scope = String(user?.branchScope || "own").toLowerCase();
  if (role === "super_admin" || scope === "global") return "global";
  if (role === "admin" || scope === "all") return "all";
  return "own";
};

export function BranchProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [isAllBranches, setIsAllBranches] = useState(false);
  const [branchSummary, setBranchSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const tenantId = user?.tenantId || null;
  const mode = deriveUserBranchScope(user);
  const userAssignedBranchId = user?.homeBranchId || user?.branchId || null;

  // Whether this user is allowed to load/switch branches at all
  const canLoadBranches = isAuthenticated && mode !== "global";
  // Whether this user can switch between branches
  const canUseAllBranches = mode === "all";
  // Branch limit from subscription summary
  const branchLimit = branchSummary?.branchLimit ?? null;

  // Prevent duplicate concurrent fetches
  const loadingRef = useRef(false);

  /** Helper to get branch URL slug */
  const getBranchUrlSlug = (branch) => branch?.slug || branch?._id || "";

  /** Helper to sync route URL when switching branch */
  const syncRouteWithBranch = useCallback(
    (targetBranch, isAll = false) => {
      const currentPath = location.pathname;
      const branchMatch = currentPath.match(/\/branch\/([^/]+)/);

      let newPath = currentPath;
      if (isAll) {
        if (branchMatch) {
          newPath = currentPath.replace(/\/branch\/[^/]+/, "");
        }
      } else if (targetBranch) {
        const slug = getBranchUrlSlug(targetBranch);
        if (slug) {
          if (branchMatch) {
            newPath = currentPath.replace(/\/branch\/[^/]+/, `/branch/${slug}`);
          } else {
            newPath = currentPath.replace(
              /(\/[^/]+\/[^/]+)(\/admin.*)?$/,
              `$1/branch/${slug}$2`,
            );
          }
        }
      }

      if (newPath !== currentPath) {
        navigate(newPath, { replace: true });
      }
    },
    [location.pathname, navigate],
  );

  /** Restore persisted selection from localStorage or URL route */
  const restoreSelection = useCallback(
    (loadedBranches) => {
      if (!tenantId || !loadedBranches.length) return;

      // Branch-scoped user: lock strictly to assigned branch
      if (mode === "own" && userAssignedBranchId) {
        const ownBranch = loadedBranches.find(
          (b) => String(b._id) === String(userAssignedBranchId),
        ) || loadedBranches[0];
        setActiveBranch(ownBranch || null);
        setIsAllBranches(false);
        if (ownBranch) {
          try { window.sessionStorage.setItem("branch.activeHeader", String(ownBranch._id)); } catch {}
        }
        return;
      }

      // Main Admin: check URL route for /branch/:branchSlug
      const branchMatch = location.pathname.match(/\/branch\/([^/]+)/);
      if (branchMatch && branchMatch[1]) {
        const routeSlug = branchMatch[1];
        const routeMatchedBranch = loadedBranches.find(
          (b) => b.slug === routeSlug || String(b._id) === routeSlug,
        );
        if (routeMatchedBranch) {
          setActiveBranch(routeMatchedBranch);
          setIsAllBranches(false);
          try { window.sessionStorage.setItem("branch.activeHeader", String(routeMatchedBranch._id)); } catch {}
          return;
        }
      }

      const stored = getStoredBranchSelection(tenantId);
      if (!stored) {
        const first = loadedBranches[0] || null;
        setActiveBranch(first);
        setIsAllBranches(false);
        if (first) try { window.sessionStorage.setItem("branch.activeHeader", String(first._id)); } catch {}
        return;
      }

      if (stored.isAllBranches && canUseAllBranches) {
        setIsAllBranches(true);
        setActiveBranch(null);
        try { window.sessionStorage.setItem("branch.activeHeader", "all"); } catch {}
        return;
      }

      if (stored.branchId) {
        const found = loadedBranches.find(
          (b) => String(b._id) === String(stored.branchId),
        );
        const target = found || loadedBranches[0] || null;
        setActiveBranch(target);
        setIsAllBranches(false);
        if (target) try { window.sessionStorage.setItem("branch.activeHeader", String(target._id)); } catch {}
        return;
      }

      const first = loadedBranches[0] || null;
      setActiveBranch(first);
      setIsAllBranches(false);
      if (first) try { window.sessionStorage.setItem("branch.activeHeader", String(first._id)); } catch {}
    },
    [tenantId, canUseAllBranches, mode, userAssignedBranchId, location.pathname],
  );

  /** Load branches + subscription summary from API */
  const loadBranches = useCallback(
    async ({ silent = false } = {}) => {
      if (!canLoadBranches || loadingRef.current) return;
      loadingRef.current = true;
      if (!silent) setIsLoading(true);
      setError(null);

      try {
        const [listRes, summaryRes] = await Promise.all([
          branchService.listBranches(),
          branchService.getBranchSummary().catch(() => null),
        ]);

        let loaded = Array.isArray(listRes?.data) ? listRes.data : [];
        // Sort: main branch first, then alphabetically
        loaded.sort((a, b) => {
          if (a.type === "main" && b.type !== "main") return -1;
          if (b.type === "main" && a.type !== "main") return 1;
          return String(a.name).localeCompare(String(b.name));
        });

        // Filter for branch-scoped user (own branch only)
        if (mode === "own" && userAssignedBranchId) {
          const ownBranch = loaded.find(
            (b) => String(b._id) === String(userAssignedBranchId),
          );
          loaded = ownBranch ? [ownBranch] : loaded.slice(0, 1);
        }

        setBranches(loaded);

        if (summaryRes?.data) {
          setBranchSummary(summaryRes.data);
        }

        // Restore persisted selection
        restoreSelection(loaded);
      } catch (err) {
        logger.error("[BranchContext] Failed to load branches:", err);
        setError(err?.response?.data?.message || "Failed to load branches");
      } finally {
        loadingRef.current = false;
        if (!silent) setIsLoading(false);
      }
    },
    [canLoadBranches, restoreSelection, mode, userAssignedBranchId],
  );

  /** Select a specific branch by id */
  const selectBranch = useCallback(
    (branchId, syncUrl = true) => {
      // Reject selecting other branches if restricted to own branch
      if (mode === "own" && userAssignedBranchId && String(branchId) !== String(userAssignedBranchId)) {
        return;
      }

      const found = branches.find(
        (b) => String(b._id) === String(branchId) || b.slug === branchId,
      );
      if (!found) return;
      setActiveBranch(found);
      setIsAllBranches(false);
      try { window.sessionStorage.setItem("branch.activeHeader", String(found._id)); } catch {}
      if (tenantId) {
        setStoredBranchSelection(tenantId, { branchId: String(found._id), isAllBranches: false });
      }
      if (syncUrl && canUseAllBranches) {
        syncRouteWithBranch(found, false);
      }
    },
    [branches, tenantId, mode, userAssignedBranchId, canUseAllBranches, syncRouteWithBranch],
  );

  /** Select "all branches" mode (admin only) */
  const selectAllBranches = useCallback((syncUrl = true) => {
    if (!canUseAllBranches) return;
    setActiveBranch(null);
    setIsAllBranches(true);
    try { window.sessionStorage.setItem("branch.activeHeader", "all"); } catch {}
    if (tenantId) {
      setStoredBranchSelection(tenantId, { isAllBranches: true });
    }
    if (syncUrl) {
      syncRouteWithBranch(null, true);
    }
  }, [canUseAllBranches, tenantId, syncRouteWithBranch]);

  /** Return the header value to send with API requests */
  const getBranchHeader = useCallback(() => {
    if (isAllBranches && canUseAllBranches) return "all";
    return activeBranch?._id ? String(activeBranch._id) : "";
  }, [isAllBranches, canUseAllBranches, activeBranch]);

  // Load on mount / when user changes
  useEffect(() => {
    if (!isAuthenticated) {
      setBranches([]);
      setActiveBranch(null);
      setIsAllBranches(false);
      setBranchSummary(null);
      if (tenantId) clearStoredBranchSelection(tenantId);
      return;
    }
    loadBranches();
  }, [isAuthenticated, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync active branch when route URL changes
  useEffect(() => {
    if (!branches.length || mode === "own") return;
    const branchMatch = location.pathname.match(/\/branch\/([^/]+)/);
    if (branchMatch && branchMatch[1]) {
      const routeSlug = branchMatch[1];
      const match = branches.find(
        (b) => b.slug === routeSlug || String(b._id) === routeSlug,
      );
      if (match && String(match._id) !== String(activeBranch?._id)) {
        setActiveBranch(match);
        setIsAllBranches(false);
        try { window.sessionStorage.setItem("branch.activeHeader", String(match._id)); } catch {}
      }
    }
  }, [location.pathname, branches, activeBranch, mode]);

  const value = useMemo(
    () => ({
      // State
      branches,
      activeBranch,
      isAllBranches,
      branchSummary,
      branchLimit,
      isLoading,
      error,
      mode,

      // Derived flags
      canLoadBranches,
      canUseAllBranches,
      canCreateBranch: Boolean(branchSummary?.canCreateBranch),
      branchLimitReached: Boolean(branchSummary?.branchLimitReached),
      subscriptionState: branchSummary?.subscriptionState || null,

      // Actions
      selectBranch,
      selectAllBranches,
      getBranchHeader,
      reload: loadBranches,
    }),
    [
      branches,
      activeBranch,
      isAllBranches,
      branchSummary,
      branchLimit,
      isLoading,
      error,
      mode,
      canLoadBranches,
      canUseAllBranches,
      selectBranch,
      selectAllBranches,
      getBranchHeader,
      loadBranches,
    ],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranch must be used inside <BranchProvider>");
  }
  return ctx;
};

export default BranchContext;
