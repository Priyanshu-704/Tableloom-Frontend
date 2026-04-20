import { axiosInstance } from "./api";
import axios from "axios";
import handleApiError from "../utils/handleApiError";
import toServiceResponse from "./serviceResponse";
const apiBaseUrl = import.meta.env.VITE_APP_API_URL;
export const tenantService = {
  getTenants: async (params = {}) => {
    try {
      const response = await axiosInstance.get("/tenants", {
        params,
      });
      return toServiceResponse(response, {
        data: [],
        pagination: {
          page: 1,
          pages: 1,
          total: 0,
          limit: Number(params?.limit || 10),
        },
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch tenants");
    }
  },
  createTenant: async (payload) => {
    try {
      const response = await axiosInstance.post("/tenants", payload);
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to create tenant");
    }
  },
  getTenantOverview: async (tenantId) => {
    try {
      const response = await axiosInstance.get(`/tenants/${tenantId}/overview`);
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch tenant overview");
    }
  },
  verifyTenant: async (tenantId) => {
    try {
      const response = await axiosInstance.patch(`/tenants/${tenantId}/verify`);
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to verify tenant");
    }
  },
  rejectTenant: async (tenantId, payload = {}) => {
    try {
      const response = await axiosInstance.patch(
        `/tenants/${tenantId}/reject`,
        payload,
      );
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to reject tenant");
    }
  },
  updateTenantStatus: async (tenantId, status) => {
    try {
      const response = await axiosInstance.patch(
        `/tenants/${tenantId}/status`,
        {
          status,
        },
      );
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to update tenant status");
    }
  },
  registerTenant: async (payload) => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/tenants/register`,
        payload,
        {
          withCredentials: true,
        },
      );
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to submit tenant registration");
    }
  },
  createRegistrationPaymentOrder: async (tenantId, paymentAccessToken = "") => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/tenants/${tenantId}/registration-payment-order`,
        {
          paymentAccessToken,
        },
        {
          withCredentials: true,
        },
      );
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to create tenant registration payment order");
    }
  },
  verifyRegistrationPayment: async (tenantId, payload) => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/tenants/${tenantId}/registration-payment-verify`,
        {
          ...payload,
          paymentAccessToken: payload?.paymentAccessToken || "",
        },
        {
          withCredentials: true,
        },
      );
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to verify tenant registration payment");
    }
  },
};
export default tenantService;
