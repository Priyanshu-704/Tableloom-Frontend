import { axiosInstance } from "./api";
import axios from "axios";
import handleApiError from "../utils/handleApiError";
import toServiceResponse from "./serviceResponse";

const apiBaseUrl = import.meta.env.VITE_APP_API_URL;

export const tenantService = {
  /* ─── Super-admin CRUD ─── */
  getTenants: async (params = {}) => {
    try {
      const response = await axiosInstance.get("/tenants", { params });
      return toServiceResponse(response, {
        data: [],
        pagination: { page: 1, pages: 1, total: 0, limit: Number(params?.limit || 10) },
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch tenants");
    }
  },

  createTenant: async (payload) => {
    try {
      const response = await axiosInstance.post("/tenants", payload);
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to create tenant");
    }
  },

  getTenantOverview: async (tenantId) => {
    try {
      const response = await axiosInstance.get(`/tenants/${tenantId}/overview`);
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to fetch tenant overview");
    }
  },

  verifyTenant: async (tenantId) => {
    try {
      const response = await axiosInstance.patch(`/tenants/${tenantId}/verify`);
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to verify tenant");
    }
  },

  rejectTenant: async (tenantId, payload = {}) => {
    try {
      const response = await axiosInstance.patch(`/tenants/${tenantId}/reject`, payload);
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to reject tenant");
    }
  },

  updateTenantStatus: async (tenantId, status) => {
    try {
      const response = await axiosInstance.patch(`/tenants/${tenantId}/status`, { status });
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to update tenant status");
    }
  },

  /* ─── Public: no auth required ─── */

  /**
   * GET /tenants/subscription-plans
   * Returns: { plans, billingPeriods, trialDays, currency }
   */
  getSubscriptionPlans: async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/tenants/subscription-plans`, {
        withCredentials: false,
      });
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to load subscription plans");
    }
  },

  /**
   * POST /tenants/register
   * Self-service registration — creates a pending tenant.
   * Returns: { tenantId, paymentAccessToken }
   */
  registerTenant: async (payload) => {
    try {
      const response = await axios.post(`${apiBaseUrl}/tenants/register`, payload, {
        withCredentials: true,
      });
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to submit tenant registration");
    }
  },

  /**
   * POST /tenants/:id/registration-payment-order
   * Creates a Razorpay order for the initial registration fee.
   */
  createRegistrationPaymentOrder: async (tenantId, paymentAccessToken = "") => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/tenants/${tenantId}/registration-payment-order`,
        { paymentAccessToken },
        { withCredentials: true },
      );
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to create registration payment order");
    }
  },

  /**
   * POST /tenants/:id/registration-payment-verify
   * Verifies a completed Razorpay registration payment.
   */
  verifyRegistrationPayment: async (tenantId, payload) => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/tenants/${tenantId}/registration-payment-verify`,
        { ...payload, paymentAccessToken: payload?.paymentAccessToken || "" },
        { withCredentials: true },
      );
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to verify registration payment");
    }
  },

  /* ─── Authenticated admin (requires login) ─── */

  /** GET /tenants/me/subscription */
  getMySubscription: async () => {
    try {
      const response = await axiosInstance.get("/tenants/me/subscription");
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to load subscription details");
    }
  },

  /** POST /tenants/me/subscription-renewal-order */
  createMyRenewalOrder: async (payload = {}) => {
    try {
      const response = await axiosInstance.post(
        "/tenants/me/subscription-renewal-order",
        payload,
      );
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to create renewal payment order");
    }
  },

  /** POST /tenants/me/subscription-renewal-verify */
  verifyMyRenewalPayment: async (payload = {}) => {
    try {
      const response = await axiosInstance.post(
        "/tenants/me/subscription-renewal-verify",
        payload,
      );
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to verify renewal payment");
    }
  },

  /* ─── Token-based renewal (email-link, no login) ─── */

  /** GET /tenants/subscription-renewal/:slug/:key?token=... */
  getSubscriptionRenewal: async (tenantSlug, tenantKey, token = "") => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}/tenants/subscription-renewal/${tenantSlug}/${tenantKey}`,
        { params: { token }, withCredentials: true },
      );
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to load renewal details");
    }
  },

  /** POST /tenants/:id/subscription-renewal-order */
  createRenewalOrder: async (tenantId, payload = {}) => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/tenants/${tenantId}/subscription-renewal-order`,
        payload,
        { withCredentials: true },
      );
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to create renewal order");
    }
  },

  /** POST /tenants/:id/subscription-renewal-verify */
  verifyRenewalPayment: async (tenantId, payload = {}) => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/tenants/${tenantId}/subscription-renewal-verify`,
        payload,
        { withCredentials: true },
      );
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to verify renewal payment");
    }
  },

  getSubscriptionReport: async () => {
    try {
      const response = await axiosInstance.get("/tenants/subscriptions/report");
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to fetch subscription report");
    }
  },

  sendExpiredSubscriptionEmails: async () => {
    try {
      const response = await axiosInstance.post("/tenants/expired-subscriptions/send-emails");
      return toServiceResponse(response, { data: null });
    } catch (error) {
      handleApiError(error, "Failed to send expired subscription emails");
    }
  },
};

export default tenantService;
