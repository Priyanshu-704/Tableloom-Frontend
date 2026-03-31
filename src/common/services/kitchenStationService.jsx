import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";

const kitchenStationRequestCache = createRequestCache(5000);
export const kitchenStationService = {
  getKitchenStations: async () => {
    try {
      return await kitchenStationRequestCache.run("kitchen-stations:list", async () => {
        const response = await axiosInstance.get("/kitchen-stations");
        return response?.data ?? {
          success: true,
          data: []
        };
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch kitchen stations");
    }
  },
  getKitchenStation: async stationId => {
    try {
      const response = await axiosInstance.get(`/kitchen-stations/${stationId}`);
      return response?.data ?? {
        success: true,
        data: null
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch kitchen station");
    }
  },
  createKitchenStation: async (data = {}) => {
    try {
      const response = await axiosInstance.post("/kitchen-stations", data);
      kitchenStationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to create kitchen station");
    }
  },
  updateKitchenStation: async (stationId, data = {}) => {
    try {
      const response = await axiosInstance.put(`/kitchen-stations/${stationId}`, data);
      kitchenStationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to update kitchen station");
    }
  },
  deleteKitchenStation: async stationId => {
    try {
      const response = await axiosInstance.delete(`/kitchen-stations/${stationId}`);
      kitchenStationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to delete kitchen station");
    }
  },
  assignCategoryToStation: async (stationId, categoryId) => {
    try {
      const response = await axiosInstance.put(`/kitchen-stations/${stationId}/assign-category/${categoryId}`);
      kitchenStationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to assign category to station");
    }
  },
  removeCategoryFromStation: async (stationId, categoryId) => {
    try {
      const response = await axiosInstance.delete(`/kitchen-stations/${stationId}/remove-category/${categoryId}`);
      kitchenStationRequestCache.clear();
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to remove category from station");
    }
  },
  getStationDashboard: async stationId => {
    try {
      const response = await axiosInstance.get(`/kitchen-stations/${stationId}/dashboard`);
      return response?.data ?? {
        success: true,
        data: {}
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch station dashboard");
    }
  }
};
export default kitchenStationService;
