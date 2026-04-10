import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
export const reportService = {
  getReportDataset: async (params = {}) => {
    try {
      const response = await axiosInstance.get("/reports/dataset", {
        params
      });
      return response?.data ?? {
        success: true,
        data: {}
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch report dataset");
    }
  },
  generateAnalyticsReport: async (payload = {}, config = {}) => {
    try {
      return await axiosInstance.post("/reports/analytics/generate", payload, config);
    } catch (error) {
      handleApiError(error, "Failed to generate report");
    }
  },
  downloadGeneratedReport: async reportId => {
    try {
      const response = await axiosInstance.get(`/reports/download/${reportId}`, {
        responseType: "blob"
      });
      return response;
    } catch (error) {
      handleApiError(error, "Failed to download generated report");
    }
  }
};
export default reportService;
