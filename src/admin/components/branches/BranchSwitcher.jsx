import React from "react";
import { Building2, ChevronDown, GitBranch, Loader2 } from "lucide-react";
import { useBranch } from "../../context/BranchContext";

/** Friendly display label for a branch object */
const branchLabel = (branch = {}) =>
  branch?.name || (branch?.type === "main" ? "Main Branch" : "Branch");

/**
 * Branch switcher dropdown rendered in the admin header.
 *
 * Rules (mirrors backend):
 * - Hidden entirely when `canLoadBranches` is false (super_admin, staff
 *   with only one branch, etc.)
 * - Hidden when branchLimit <= 1 (starter plan — only main branch)
 * - Shows "All Branches" option for admins with `canUseAllBranches`
 */
export function BranchSwitcher() {
  const {
    activeBranch,
    branches,
    branchLimit,
    canLoadBranches,
    canUseAllBranches,
    isAllBranches,
    isLoading,
    mode,
    selectAllBranches,
    selectBranch,
  } = useBranch();

  // Don't render if user scope is "own" (single branch) or loading fails
  if (
    !canLoadBranches ||
    (branchLimit !== null && branchLimit !== undefined && Number(branchLimit || 0) <= 1)
  ) {
    return null;
  }

  const value = isAllBranches ? "all" : activeBranch?._id || "";

  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (nextValue === "all") {
      selectAllBranches();
      return;
    }
    selectBranch(nextValue);
  };

  return (
    <label
      className="relative hidden min-w-[12rem] max-w-[18rem] items-center sm:flex"
      aria-label="Switch branch"
    >
      {/* Icon prefix */}
      <span className="pointer-events-none absolute left-3 flex items-center gap-1 text-gray-400">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAllBranches ? (
          <GitBranch className="h-4 w-4" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
      </span>

      {/* Native select for widest browser + keyboard support */}
      <select
        id="branch-switcher"
        value={value}
        onChange={handleChange}
        disabled={isLoading}
        className="
          w-full appearance-none rounded-xl border border-gray-200
          bg-white/80 py-2 pl-9 pr-8 text-sm font-medium
          text-gray-700 shadow-sm backdrop-blur-sm
          transition focus:border-primary-400 focus:outline-none
          focus:ring-2 focus:ring-primary-200
          disabled:cursor-not-allowed disabled:opacity-60
        "
      >
        {/* "All branches" option for admin scope */}
        {canUseAllBranches && (
          <option value="all">All Branches</option>
        )}

        {/* Individual branch options */}
        {branches.map((branch) => (
          <option key={branch._id} value={branch._id}>
            {branchLabel(branch)}
            {branch.type === "main" ? " (Main)" : ""}
          </option>
        ))}
      </select>

      {/* Chevron suffix */}
      <span className="pointer-events-none absolute right-3 text-gray-400">
        <ChevronDown className="h-4 w-4" />
      </span>
    </label>
  );
}

export default BranchSwitcher;
