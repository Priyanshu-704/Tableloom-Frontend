import api, { getTenantHeaders } from "./api";
import handleApiError from "../utils/handleApiError";
import toServiceResponse from "./serviceResponse";
const buildQuery = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
const buildTenantAwareAssetUrl = (path) => {
  const baseUrl = String(api.defaults.baseURL || "").replace(/\/+$/, "");
  const tenantHeaders = getTenantHeaders();
  const targetUrl = new URL(`${baseUrl}${path}`, window.location.origin);
  if (tenantHeaders["x-tenant-id"]) {
    targetUrl.searchParams.set("tenantId", tenantHeaders["x-tenant-id"]);
  }
  if (tenantHeaders["x-tenant-slug"]) {
    targetUrl.searchParams.set("tenantSlug", tenantHeaders["x-tenant-slug"]);
  }
  if (tenantHeaders["x-tenant-key"]) {
    targetUrl.searchParams.set("tenantKey", tenantHeaders["x-tenant-key"]);
  }
  return targetUrl.toString();
};
export const billService = {
  getBills: async (filters = {}) => {
    try {
      const response = await api.get("/bills/admin/list", {
        params: buildQuery(filters),
      });
      return toServiceResponse(response, {
        data: [],
        pagination: {},
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch bills");
    }
  },
  getStatistics: async () => {
    try {
      const response = await api.get("/bills/admin/statistics");
      return toServiceResponse(response, {
        data: {},
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch bill statistics");
    }
  },
  sendBillEmail: async (billId, email) => {
    try {
      const response = await api.post(`/bills/${billId}/send-email`, {
        email,
      });
      return toServiceResponse(response);
    } catch (error) {
      handleApiError(error, "Failed to send bill email");
    }
  },
  processPayment: async (billId, paymentData) => {
    try {
      const response = await api.post(`/bills/${billId}/pay`, paymentData);
      return toServiceResponse(response, {
        data: null,
      });
    } catch (error) {
      handleApiError(error, "Failed to process bill payment");
    }
  },
  getPaymentQr: async (billId) => {
    try {
      const response = await api.get(`/bills/${billId}/payment-qr`);
      return toServiceResponse(response, {
        data: {},
      });
    } catch (error) {
      handleApiError(error, "Failed to generate bill payment QR");
    }
  },
  getBillViewUrl: (billId) =>
    buildTenantAwareAssetUrl(`/images/bills/${billId}/pdf`),
  getBillDownloadUrl: (billId) =>
    buildTenantAwareAssetUrl(`/images/bills/${billId}/pdf`),
};
export default billService;
