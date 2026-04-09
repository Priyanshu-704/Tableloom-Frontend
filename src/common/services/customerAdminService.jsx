import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";

const customerAdminRequestCache = createRequestCache(10000);
export const customerAdminService = {
  getSessions: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/customers/sessions", {
        params: filters
      });
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch customer sessions");
    }
  },
  getAnalytics: async (options = "today") => {
    try {
      const params = typeof options === "string" ? {
        period: options
      } : {
        ...(options || {})
      };
      return await customerAdminRequestCache.run({
        scope: "customers:analytics",
        params
      }, async () => {
        const response = await axiosInstance.get("/customers/analytics", {
          params
        });
        return response?.data ?? {
          success: true,
          data: {}
        };
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch session analytics");
    }
  },
  extendSession: async (sessionId, minutes = 30) => {
    try {
      const response = await axiosInstance.put(`/customers/session/${sessionId}/extend`, {
        minutes
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to extend session");
    }
  },
  cancelSession: async (sessionId, reason = "") => {
    try {
      const response = await axiosInstance.put(`/customers/session/${sessionId}/cancel`, {
        reason
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to cancel session");
    }
  },
  completeSessionOffline: async (sessionId, notes = "") => {
    try {
      const response = await axiosInstance.put(`/customers/session/${sessionId}/complete-offline`, {
        notes
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to complete session");
    }
  }
};
export default customerAdminService;
