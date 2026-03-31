import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
export const inventoryService = {
  getInventoryItems: async (params = {}) => {
    try {
      const response = await axiosInstance.get("/inventory", {
        params
      });
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch inventory items");
    }
  },
  createInventoryItem: async (payload = {}) => {
    try {
      const response = await axiosInstance.post("/inventory", payload);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to create inventory item");
    }
  },
  updateInventoryItem: async (id, payload = {}) => {
    try {
      const response = await axiosInstance.put(`/inventory/${id}`, payload);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to update inventory item");
    }
  },
  adjustInventoryStock: async (id, payload = {}) => {
    try {
      const response = await axiosInstance.patch(`/inventory/${id}/adjust`, payload);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to adjust inventory stock");
    }
  },
  deleteInventoryItem: async id => {
    try {
      const response = await axiosInstance.delete(`/inventory/${id}`);
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to delete inventory item");
    }
  }
};
export default inventoryService;
