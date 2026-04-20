import { useCallback, useEffect, useMemo, useState } from "react";
import waiterCallService from "../../common/services/waiterCallService";
import { useApp } from "../context/AppContext";
const TEST_SESSION_ID =
  import.meta.env.DEV &&
  import.meta.env.VITE_TEST_CUSTOMER_SESSION_ID
    ? String(import.meta.env.VITE_TEST_CUSTOMER_SESSION_ID).trim()
    : "";
const getResolvedSessionId = (sessionId = "") => {
  if (sessionId) {
    return sessionId;
  }
  if (typeof window === "undefined") {
    return "";
  }
  const storedSessionId =
    window.sessionStorage.getItem("sessionId") ||
    window.localStorage.getItem("sessionId") ||
    "";
  if (storedSessionId === TEST_SESSION_ID) {
    window.sessionStorage.setItem("sessionId", TEST_SESSION_ID);
  }
  return storedSessionId;
};
const mapReasonToCallType = (reason = "") => {
  const mapping = {
    quick_assist: "assistance",
    menu_help: "order_help",
    order_issue: "order",
    bill_request: "bill",
    custom: "other",
    assistance: "assistance",
    waiter: "waiter",
  };
  return mapping[reason] || "waiter";
};
const mapReasonToPriority = (reason = "") => {
  if (reason === "bill_request") {
    return "high";
  }
  if (reason === "order_issue") {
    return "high";
  }
  return "medium";
};
export function useWaiterCall() {
  const { sessionId, activeWaiterCalls, dispatch } = useApp();
  const [isCalling, setIsCalling] = useState(false);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);
  const resolvedSessionId = useMemo(
    () => getResolvedSessionId(sessionId),
    [sessionId],
  );
  const loadActiveCalls = useCallback(async () => {
    if (!resolvedSessionId) {
      dispatch({
        type: "SET_ACTIVE_WAITER_CALLS",
        payload: [],
      });
      return;
    }
    try {
      setIsLoadingCalls(true);
      const response =
        await waiterCallService.getSessionActiveCalls(resolvedSessionId);
      if (response?.success) {
        dispatch({
          type: "SET_ACTIVE_WAITER_CALLS",
          payload: Array.isArray(response.data) ? response.data : [],
        });
      }
    } finally {
      setIsLoadingCalls(false);
    }
  }, [dispatch, resolvedSessionId]);
  useEffect(() => {
    loadActiveCalls();
  }, [loadActiveCalls]);
  const callWaiter = useCallback(
    async (reason = "waiter", customMessage = "") => {
      if (!resolvedSessionId) {
        return {
          success: false,
          message: "Customer session is not active yet",
        };
      }
      setIsCalling(true);
      const response = await waiterCallService.createCall({
        sessionId: resolvedSessionId,
        callType: mapReasonToCallType(reason),
        priority: mapReasonToPriority(reason),
        message: String(customMessage || "").trim(),
      });
      setIsCalling(false);
      if (response?.success && response?.data) {
        dispatch({
          type: "UPSERT_WAITER_CALL",
          payload: response.data,
        });
        return response;
      }
      return {
        success: false,
        message: response?.message || "Failed to call waiter",
      };
    },
    [dispatch, resolvedSessionId],
  );
  const cancelCall = useCallback(
    async (callId, reason = "") => {
      if (!callId || !resolvedSessionId) {
        return {
          success: false,
          message: "No active waiter request found",
        };
      }
      const response = await waiterCallService.cancelCall(
        callId,
        resolvedSessionId,
        reason,
      );
      if (response?.success) {
        dispatch({
          type: "REMOVE_WAITER_CALL",
          payload: callId,
        });
      }
      return response;
    },
    [dispatch, resolvedSessionId],
  );
  const activeCall = useMemo(
    () => (Array.isArray(activeWaiterCalls) ? activeWaiterCalls[0] : null),
    [activeWaiterCalls],
  );
  return {
    callWaiter,
    cancelCall,
    isCalling,
    isLoadingCalls,
    refreshActiveCalls: loadActiveCalls,
    activeCalls: Array.isArray(activeWaiterCalls) ? activeWaiterCalls : [],
    activeCall,
    isConnected: Boolean(resolvedSessionId),
  };
}
