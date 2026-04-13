import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
const dashboardRequestCache = createRequestCache(10000);
export const dashboardService = {
  getOverview: async () => {
    try {
      return await dashboardRequestCache.run("dashboard:overview", async () => {
        const response = await axiosInstance.get("/dashboard/overview");
        return (
          response?.data ?? {
            success: true,
            data: {
              stats: {},
              recentActivity: [],
              orderStats: {},
              customerAnalytics: {},
              feedbackDashboard: {},
              waiterDashboard: {},
            },
          }
        );
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch dashboard");
    }
  },
};
export default dashboardService;
