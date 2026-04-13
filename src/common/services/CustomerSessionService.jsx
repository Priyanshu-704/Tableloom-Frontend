/* eslint-disable no-unused-vars */
import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
const sessionRequestCache = createRequestCache(15000);
const sanitizeNumber = (value, fallback = 0) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
};
const normalizeResponse = (response, fallbackData = null) =>
  response?.data ?? {
    success: true,
    data: fallbackData,
  };
export const customerSessionService = {
  validateScan: async (tableId, token) => {
    try {
      const response = await axiosInstance.post(
        "/customers/session/scan/validate",
        {
          tableId,
          token,
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to validate QR code");
    }
  },
  createSessionByScan: async (tableId, token, customerData = {}) => {
    try {
      const response = await axiosInstance.post("/customers/session/scan", {
        tableId,
        token,
        customerData: {
          name: customerData?.name || "",
          email: customerData?.email || "",
          phone: customerData?.phone || "",
        },
      });
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to start customer session");
    }
  },
  getSession: async (sessionId) => {
    try {
      return await sessionRequestCache.run(
        `customer-session:${sessionId}`,
        async () => {
          const response = await axiosInstance.get(
            `/customers/session/${sessionId}`,
          );
          return normalizeResponse(response);
        },
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch customer session");
    }
  },
  completeSessionOnline: async (sessionId, paymentData = {}) => {
    try {
      const response = await axiosInstance.put(
        `/customers/session/${sessionId}/complete-online`,
        {
          paymentData: {
            paymentMethod: paymentData?.paymentMethod || "online",
            transactionId: paymentData?.transactionId || "",
            amount: sanitizeNumber(paymentData?.amount, 0),
          },
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to complete online payment");
    }
  },
  logoutFromSession: async (sessionId) => {
    try {
      const response = await axiosInstance.put(
        `/customers/session/${sessionId}/logout`,
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to logout from session");
    }
  },
  generateBillBeforePayment: async (sessionId) => {
    try {
      const response = await axiosInstance.post(
        `/customers/session/${sessionId}/generate-bill-before-payment`,
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to generate bill");
    }
  },
  getBillSummary: async (sessionId) => {
    try {
      const response = await axiosInstance.get(
        `/customers/session/${sessionId}/bill-summary`,
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to fetch bill summary");
    }
  },
  requestBill: async (sessionId, options = {}) => {
    try {
      const response = await axiosInstance.post(
        `/customers/session/${sessionId}/request-bill`,
        {
          email: options?.email || "",
          forceNew: Boolean(options?.forceNew),
          paymentMethod: options?.paymentMethod || "",
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to request bill");
    }
  },
  completeSessionOffline: async (sessionId, notes = "") => {
    try {
      const response = await axiosInstance.put(
        `/customers/session/${sessionId}/complete-offline`,
        {
          notes: String(notes || "").trim(),
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to complete session");
    }
  },
  cancelSession: async (sessionId, reason = "") => {
    try {
      const response = await axiosInstance.put(
        `/customers/session/${sessionId}/cancel`,
        {
          reason: String(reason || "").trim(),
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to cancel session");
    }
  },
  extendSession: async (sessionId, minutes = 30) => {
    try {
      const response = await axiosInstance.put(
        `/customers/session/${sessionId}/extend`,
        {
          minutes: Math.min(Math.max(sanitizeNumber(minutes, 30), 1), 240),
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to extend session");
    }
  },
  markBillAsPaid: async (sessionId, billId, paymentData = {}) => {
    try {
      const response = await axiosInstance.post(
        `/customers/session/${sessionId}/bill/${billId}/mark-paid`,
        {
          paymentMethod: paymentData?.paymentMethod || "",
          transactionId: paymentData?.transactionId || "",
          staffId: paymentData?.staffId || "",
        },
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to mark bill as paid");
    }
  },
  getSessionByTable: async (tableId) => {
    try {
      const response = await axiosInstance.get(
        `/customers/session/table/${tableId}`,
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to fetch session by table");
    }
  },
  getSessionAnalytics: async (period = "today") => {
    try {
      const response = await axiosInstance.get("/customers/analytics", {
        params: {
          period,
        },
      });
      return normalizeResponse(response, {});
    } catch (error) {
      handleApiError(error, "Failed to fetch session analytics");
    }
  },
  getSessions: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/customers/sessions", {
        params: filters,
      });
      return normalizeResponse(response, []);
    } catch (error) {
      handleApiError(error, "Failed to fetch sessions");
    }
  },
  getActiveSessions: async (page = 1, limit = 50) =>
    customerSessionService.getSessions({
      mode: "active",
      page,
      limit,
    }),
  getInactiveSessions: async (_timeoutMinutes = 30, page = 1, limit = 50) => {
    try {
      const response = await axiosInstance.get("/customers/sessions", {
        params: {
          mode: "inactive",
          page,
          limit,
        },
      });
      return normalizeResponse(response, []);
    } catch (error) {
      handleApiError(error, "Failed to fetch inactive sessions");
    }
  },
  timeoutInactiveSessions: async (timeoutMinutes = 30) => {
    return customerSessionService.getInactiveSessions(timeoutMinutes);
  },
  getSessionWithBill: async (sessionId) => {
    try {
      const response = await axiosInstance.get(
        `/customers/session/${sessionId}/with-bill`,
      );
      return normalizeResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to fetch session bill details");
    }
  },
};
export default customerSessionService;
