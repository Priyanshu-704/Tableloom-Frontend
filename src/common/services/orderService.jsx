import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
const orderRequestCache = createRequestCache(10000);
export const orderService = {
  getOrderById: async orderId => {
    try {
      const response = await axiosInstance.get(`/orders/${orderId}`);
      return response?.data ?? {
        success: true,
        data: null
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch order details");
    }
  },
  getOrderBySession: async sessionId => {
    try {
      const response = await axiosInstance.get(`/orders/session/${sessionId}`);
      return response?.data ?? {
        success: true,
        data: null
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch current session order");
    }
  },
  getOrderHistoryBySession: async (sessionId, filters = {}) => {
    try {
      return await orderRequestCache.run({
        scope: `orders:history:${sessionId}`,
        filters
      }, async () => {
        const response = await axiosInstance.get(`/orders/session/${sessionId}/history`, {
          params: filters
        });
        return response?.data ?? {
          success: true,
          data: []
        };
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch order history");
    }
  },
  getOrders: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/orders", {
        params: filters
      });
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch orders");
    }
  },
  getOrderStatistics: async (filters = {}) => {
    try {
      return await orderRequestCache.run({
        scope: "orders:statistics",
        filters
      }, async () => {
        const response = await axiosInstance.get("/orders/dashboard/stats", {
          params: filters
        });
        return response?.data ?? {
          success: true,
          data: {}
        };
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch order statistics");
    }
  },
  updateOrderStatus: async (orderId, status, notes = "") => {
    try {
      const response = await axiosInstance.put(`/orders/${orderId}/status`, {
        status,
        notes
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to update order status");
    }
  }
};
export default orderService;
