import api from "./api.jsx";

/**
 * Inject the branch selector header so the backend `resolveBranch`
 * middleware can scope every request to the right branch.
 *
 * Pass `"all"` to request cross-branch (admin-only) data.
 */
export const withBranchHeader = (branchId = "") => ({
  headers: branchId ? { "x-branch-id": String(branchId) } : {},
});

const branchService = {
  /**
   * GET /branches/summary
   * Returns { currentBranchCount, branchLimit, canCreateBranch,
   *           branchLimitReached, subscriptionState, plan }
   */
  getBranchSummary: async () => {
    const res = await api.get("/branches/summary");
    return res.data;
  },

  /**
   * GET /branches
   * Admins get all branches; staff get only their own.
   */
  listBranches: async () => {
    const res = await api.get("/branches");
    return res.data;
  },

  /**
   * GET /branches/:id
   */
  getBranch: async (id) => {
    const res = await api.get(`/branches/${id}`);
    return res.data;
  },

  /**
   * POST /branches
   * Body: { name, slug?, timezone?, currency?, phone?, email?,
   *         address?, geo?, operatingHours?, status? }
   */
  createBranch: async (payload) => {
    const res = await api.post("/branches", payload);
    return res.data;
  },

  /**
   * PATCH /branches/:id
   * Body: any subset of allowed fields
   */
  updateBranch: async (id, payload) => {
    const res = await api.patch(`/branches/${id}`, payload);
    return res.data;
  },

  /**
   * PATCH /branches/:id/status
   * Body: { status: "active" | "inactive" | "suspended" }
   */
  updateBranchStatus: async (id, status) => {
    const res = await api.patch(`/branches/${id}/status`, { status });
    return res.data;
  },
};

export default branchService;
