import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import toServiceResponse from "./serviceResponse";

export const supportService = {
  getSupportRequests: async (params = {}) => {
    try {
      const response = await axiosInstance.get("/support", {
        params,
      });
      return toServiceResponse(response, {
        data: [],
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch support requests");
    }
  },
  createSupportRequest: async (payload = {}) => {
    try {
      const response = await axiosInstance.post("/support", payload);
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to send support request");
    }
  },
  updateSupportRequestStatus: async (requestId, payload = {}) => {
    try {
      const response = await axiosInstance.patch(`/support/${requestId}/status`, payload);
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to update support request");
    }
  },
};

export default supportService;
