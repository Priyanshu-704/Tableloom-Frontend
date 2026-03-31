import { axiosInstance } from "./api";
import axios from "axios";
import handleApiError from "../utils/handleApiError";
import toServiceResponse from "./serviceResponse";

const apiBaseUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:5000/api";

export const tenantService = {
  getTenants: async () => {
    try {
      const response = await axiosInstance.get("/tenants");
      return toServiceResponse(response, {
        data: []
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch tenants");
    }
  },
  createTenant: async payload => {
    try {
      const response = await axiosInstance.post("/tenants", payload);
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to create tenant");
    }
  },
  getTenantOverview: async tenantId => {
    try {
      const response = await axiosInstance.get(`/tenants/${tenantId}/overview`);
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch tenant overview");
    }
  },
  verifyTenant: async tenantId => {
    try {
      const response = await axiosInstance.patch(`/tenants/${tenantId}/verify`);
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to verify tenant");
    }
  },
  registerTenant: async payload => {
    try {
      const response = await axios.post(`${apiBaseUrl}/tenants/register`, payload, {
        withCredentials: true
      });
      return toServiceResponse(response, {
        data: null
      });
    } catch (error) {
      handleApiError(error, "Failed to submit tenant registration");
    }
  }
};

export default tenantService;
