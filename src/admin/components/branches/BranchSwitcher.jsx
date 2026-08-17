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

  // Don't render if loading branches not allowed
  if (!canLoadBranches) {
    return null;
  }

  // Branch-scoped admin/staff or single branch plan: display non-interactive branch badge
  if (
    !canUseAllBranches ||
    mode === "own" ||
    branches.length <= 1 ||
    (branchLimit !== null && branchLimit !== undefined && Number(branchLimit || 0) <= 1)
  ) {
    if (!activeBranch) return null;
    return (
      <div
        className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs backdrop-blur-xs sm:flex"
        title="Your Assigned Branch"
      >
        <Building2 className="h-4 w-4 text-sky-600 shrink-0" />
        <span className="truncate max-w-[10rem]">{branchLabel(activeBranch)}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
          {activeBranch.type === "main" ? "Main" : "Branch"}
        </span>
      </div>
    );
  }

  const value = isAllBranches ? "all" : activeBranch?._id || "";

  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (nextValue === "all") {
      selectAllBranches(true);
      return;
    }
    selectBranch(nextValue, true);
  };

  return (
    <label
      className="relative hidden min-w-[12rem] max-w-[18rem] items-center sm:flex"
      aria-label="Switch branch"
    >
      {/* Icon prefix */}
      <span className="pointer-events-none absolute left-3 flex items-center gap-1 text-slate-400">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAllBranches ? (
          <GitBranch className="h-4 w-4 text-sky-600" />
        ) : (
          <Building2 className="h-4 w-4 text-sky-600" />
        )}
      </span>

      {/* Native select for widest browser + keyboard support */}
      <select
        id="branch-switcher"
        value={value}
        onChange={handleChange}
        disabled={isLoading}
        className="
          w-full appearance-none rounded-xl border border-slate-200
          bg-white/90 py-2 pl-9 pr-8 text-xs font-semibold
          text-slate-700 shadow-2xs backdrop-blur-xs
          transition focus:border-sky-400 focus:outline-hidden
          focus:ring-2 focus:ring-sky-200
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
      <span className="pointer-events-none absolute right-3 text-slate-400">
        <ChevronDown className="h-4 w-4" />
      </span>
    </label>
  );
}

export default BranchSwitcher;
