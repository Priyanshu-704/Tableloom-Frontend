import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
const TEST_SESSION_ID = "sess_634cc306334465fde6a5011813d95e1a_1773924197354";
const activeCallCache = new Map();
const activeCallRequestCache = new Map();
const waiterCallRequestCache = createRequestCache(10000);
const getResolvedSessionId = (sessionId = "") => {
  const resolvedSessionId = sessionId || sessionStorage.getItem("sessionId") || localStorage.getItem("sessionId") || TEST_SESSION_ID;
  if (resolvedSessionId === TEST_SESSION_ID) {
    sessionStorage.setItem("sessionId", TEST_SESSION_ID);
  }
  return resolvedSessionId;
};
export const waiterCallService = {
  createCall: async (payload = {}) => {
    try {
      const resolvedSessionId = getResolvedSessionId(payload?.sessionId);
      const response = await axiosInstance.post("/waiter-calls", {
        sessionId: resolvedSessionId,
        callType: payload?.callType || "waiter",
        priority: payload?.priority || "medium",
        message: payload?.message || "",
        coordinates: payload?.coordinates || null
      });
      activeCallCache.delete(resolvedSessionId);
      activeCallRequestCache.delete(resolvedSessionId);
      return response?.data ?? {
        success: true,
        data: null
      };
    } catch (error) {
      handleApiError(error, "Failed to notify waiter");
    }
  },
  cancelCall: async (callId, sessionId, reason = "") => {
    try {
      const resolvedSessionId = getResolvedSessionId(sessionId);
      const response = await axiosInstance.put(`/waiter-calls/${callId}/cancel`, {
        sessionId: resolvedSessionId,
        reason
      });
      activeCallCache.delete(resolvedSessionId);
      activeCallRequestCache.delete(resolvedSessionId);
      return response?.data ?? {
        success: true,
        data: null
      };
    } catch (error) {
      handleApiError(error, "Failed to cancel waiter request");
    }
  },
  getSessionActiveCalls: async sessionId => {
    try {
      const resolvedSessionId = getResolvedSessionId(sessionId);
      if (activeCallCache.has(resolvedSessionId)) {
        return {
          success: true,
          data: activeCallCache.get(resolvedSessionId) || []
        };
      }
      if (activeCallRequestCache.has(resolvedSessionId)) {
        return activeCallRequestCache.get(resolvedSessionId);
      }
      const request = axiosInstance.get(`/waiter-calls/session/${resolvedSessionId}/active`).then(response => {
        const payload = response?.data ?? {
          success: true,
          data: []
        };
        activeCallCache.set(resolvedSessionId, Array.isArray(payload?.data) ? payload.data : []);
        return payload;
      }).finally(() => {
        activeCallRequestCache.delete(resolvedSessionId);
      });
      activeCallRequestCache.set(resolvedSessionId, request);
      return request;
    } catch (error) {
      handleApiError(error, "Failed to fetch your active waiter calls");
    }
  },
  getCalls: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/waiter-calls", {
        params: filters
      });
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch waiter calls");
    }
  },
  getDashboard: async () => {
    try {
      return await waiterCallRequestCache.run("waiter-calls:dashboard", async () => {
        const response = await axiosInstance.get("/waiter-calls/dashboard");
        return response?.data ?? {
          success: true,
          data: {}
        };
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch waiter call dashboard");
    }
  },
  getStatistics: async (options = "today") => {
    try {
      const params = typeof options === "string" ? {
        period: options
      } : {
        ...(options || {})
      };
      return await waiterCallRequestCache.run({
        scope: "waiter-calls:statistics",
        params
      }, async () => {
        const response = await axiosInstance.get("/waiter-calls/statistics", {
          params
        });
        return response?.data ?? {
          success: true,
          data: {}
        };
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch waiter call statistics");
    }
  },
  getPendingCalls: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/waiter-calls/pending", {
        params: filters
      });
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch pending waiter calls");
    }
  },
  getActiveCalls: async () => {
    try {
      const response = await axiosInstance.get("/waiter-calls/active");
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch active waiter calls");
    }
  },
  getAvailableStaff: async () => {
    try {
      const response = await axiosInstance.get("/waiter-calls/available-staff");
      return response?.data ?? {
        success: true,
        data: []
      };
    } catch (error) {
      handleApiError(error, "Failed to fetch available staff");
    }
  },
  assignCall: async (callId, staffId) => {
    try {
      const response = await axiosInstance.put(`/waiter-calls/${callId}/assign`, {
        staffId
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to assign waiter call");
    }
  },
  acknowledgeCall: async (callId, estimatedTime) => {
    try {
      const response = await axiosInstance.put(`/waiter-calls/${callId}/acknowledge`, {
        estimatedTime
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to acknowledge waiter call");
    }
  },
  completeCall: async (callId, resolutionNotes = "") => {
    try {
      const response = await axiosInstance.put(`/waiter-calls/${callId}/complete`, {
        resolutionNotes
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to complete waiter call");
    }
  },
  updateCallStatus: async (callId, status, notes = "") => {
    try {
      const response = await axiosInstance.put(`/waiter-calls/${callId}/status`, {
        status,
        notes
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      handleApiError(error, "Failed to update waiter call status");
    }
  }
};
export default waiterCallService;
