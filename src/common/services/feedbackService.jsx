import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
const feedbackRequestCache = createRequestCache(10000);
export const feedbackService = {
  submitFeedback: async (payload = {}) => {
    try {
      const response = await axiosInstance.post("/feedback", payload);
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to submit feedback");
    }
  },
  getSessionFeedback: async (sessionId) => {
    try {
      const response = await axiosInstance.get(
        `/feedback/session/${sessionId}`,
      );
      return (
        response?.data ?? {
          success: true,
          data: [],
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch session feedback");
    }
  },
  updateSessionFeedback: async (sessionId, feedbackId, payload = {}) => {
    try {
      const response = await axiosInstance.put(
        `/feedback/session/${sessionId}/${feedbackId}`,
        payload,
      );
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to update feedback");
    }
  },
  deleteSessionFeedback: async (sessionId, feedbackId) => {
    try {
      const response = await axiosInstance.delete(
        `/feedback/session/${sessionId}/${feedbackId}`,
      );
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to delete feedback");
    }
  },
  getFeedback: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/feedback", {
        params: filters,
      });
      return (
        response?.data ?? {
          success: true,
          data: [],
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch feedback");
    }
  },
  getDashboard: async () => {
    try {
      return await feedbackRequestCache.run("feedback:dashboard", async () => {
        const response = await axiosInstance.get("/feedback/dashboard");
        return (
          response?.data ?? {
            success: true,
            data: {},
          }
        );
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch feedback dashboard");
    }
  },
  getStatistics: async (options = "30days") => {
    try {
      const params =
        typeof options === "string"
          ? {
              period: options,
            }
          : {
              ...(options || {}),
            };
      return await feedbackRequestCache.run(
        {
          scope: "feedback:statistics",
          params,
        },
        async () => {
          const response = await axiosInstance.get("/feedback/statistics", {
            params,
          });
          return (
            response?.data ?? {
              success: true,
              data: {},
            }
          );
        },
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch feedback statistics");
    }
  },
  getNps: async (options = "30days") => {
    try {
      const params =
        typeof options === "string"
          ? {
              period: options,
            }
          : {
              ...(options || {}),
            };
      return await feedbackRequestCache.run(
        {
          scope: "feedback:nps",
          params,
        },
        async () => {
          const response = await axiosInstance.get("/feedback/nps", {
            params,
          });
          return (
            response?.data ?? {
              success: true,
              data: {},
            }
          );
        },
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch feedback NPS");
    }
  },
  updateStatus: async (feedbackId, payload = {}) => {
    try {
      const response = await axiosInstance.put(
        `/feedback/${feedbackId}/status`,
        payload,
      );
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to update feedback status");
    }
  },
  respond: async (feedbackId, message) => {
    try {
      const response = await axiosInstance.put(
        `/feedback/${feedbackId}/respond`,
        {
          message,
        },
      );
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to respond to feedback");
    }
  },
};
export default feedbackService;
