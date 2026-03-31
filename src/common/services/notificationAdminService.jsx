import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";

const notificationRequestCache = createRequestCache(5000);
export const notificationAdminService = {
  getNotifications: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/notifications", {
        params: filters
      });
      return response?.data ?? {
        success: true,
        data: [],
        unreadCount: 0
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch notifications");
    }
  },
  getStats: async (period = "today") => {
    try {
      return await notificationRequestCache.run(`notifications:stats:${period}`, async () => {
        const response = await axiosInstance.get("/notifications/stats", {
          params: {
            period
          }
        });
        return response?.data ?? {
          success: true,
          data: {}
        };
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch notification stats");
    }
  },
  markAsRead: async notificationId => {
    try {
      const response = await axiosInstance.put(`/notifications/${notificationId}/read`);
      notificationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to mark notification as read");
    }
  },
  acknowledge: async notificationId => {
    try {
      const response = await axiosInstance.put(`/notifications/${notificationId}/acknowledge`);
      notificationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to acknowledge notification");
    }
  },
  markAllAsRead: async () => {
    try {
      const response = await axiosInstance.put("/notifications/mark-all-read");
      notificationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to mark all notifications as read");
    }
  },
  dismiss: async notificationId => {
    try {
      const response = await axiosInstance.put(`/notifications/${notificationId}/dismiss`);
      notificationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to clear notification");
    }
  },
  clearAll: async () => {
    try {
      const response = await axiosInstance.put("/notifications/clear-all");
      notificationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to clear notifications");
    }
  },
  createAnnouncement: async (payload = {}) => {
    try {
      const response = await axiosInstance.post("/notifications/announcement", payload);
      notificationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to create announcement");
    }
  },
  cleanup: async () => {
    try {
      const response = await axiosInstance.post("/notifications/cleanup");
      notificationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to cleanup notifications");
    }
  }
};
export default notificationAdminService;
