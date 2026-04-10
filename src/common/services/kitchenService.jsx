import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
const kitchenRequestCache = createRequestCache(10000);
export const kitchenService = {
  getAnalytics: async (filters = {}) => {
    try {
      return await kitchenRequestCache.run({
        scope: "kitchen:analytics",
        filters
      }, async () => {
        const response = await axiosInstance.get("/kitchen/analytics", {
          params: filters
        });
        return response?.data ?? {
          success: true,
          data: {}
        };
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch kitchen analytics");
    }
  },
  getStationOrders: async (stationId, filters = {}) => {
    try {
      const response = await axiosInstance.get(`/kitchen/stations/${stationId}/orders`, {
        params: filters
      });
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch station orders");
    }
  },
  getDelayedOrders: async stationId => {
    try {
      const response = await axiosInstance.get(`/kitchen/stations/${stationId}/delayed-orders`);
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch delayed orders");
    }
  },
  getDelayMonitorStatus: async () => {
    try {
      const response = await axiosInstance.get("/kitchen/delay-monitor/status");
      return response?.data ?? {
        success: true,
        data: {}
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch delay monitor status");
    }
  },
  runDelayMonitorCheck: async () => {
    try {
      const response = await axiosInstance.post("/kitchen/check-delayed");
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to run delay monitor check");
    }
  },
  getStationStatistics: async (stationId, days = 7) => {
    try {
      const response = await axiosInstance.get(`/kitchen/stations/${stationId}/statistics`, {
        params: {
          days
        }
      });
      return response?.data ?? {
        success: true,
        data: {}
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch station statistics");
    }
  },
  startPreparingItem: async (kitchenOrderId, itemId) => {
    try {
      const response = await axiosInstance.put(`/kitchen/orders/${kitchenOrderId}/items/${itemId}/start`);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to start preparing item");
    }
  },
  markItemReady: async (kitchenOrderId, itemId) => {
    try {
      const response = await axiosInstance.put(`/kitchen/orders/${kitchenOrderId}/items/${itemId}/ready`);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to mark item as ready");
    }
  },
  markItemServed: async (kitchenOrderId, itemId) => {
    try {
      const response = await axiosInstance.put(`/kitchen/orders/${kitchenOrderId}/items/${itemId}/served`);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to mark item as served");
    }
  }
};
export default kitchenService;
