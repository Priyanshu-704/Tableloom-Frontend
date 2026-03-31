import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
const getSessionId = () => sessionStorage.getItem("sessionId") || localStorage.getItem("sessionId") || "";
export const customerNotificationService = {
  getNotifications: async (filters = {}) => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        return {
          success: true,
          data: [],
          unreadCount: 0,
          pagination: null
        };
      }
      const response = await axiosInstance.get(`/notifications/session/${sessionId}`, {
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
  markAsRead: async notificationId => {
    try {
      const sessionId = getSessionId();
      const response = await axiosInstance.put(`/notifications/session/${sessionId}/${notificationId}/read`);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to mark notification as read");
    }
  },
  markAllAsRead: async () => {
    try {
      const sessionId = getSessionId();
      const response = await axiosInstance.put(`/notifications/session/${sessionId}/mark-all-read`);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to mark all notifications as read");
    }
  },
  clearAll: async () => {
    try {
      const sessionId = getSessionId();
      const response = await axiosInstance.put(`/notifications/session/${sessionId}/clear-all`);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to clear notifications");
    }
  }
};
export default customerNotificationService;
