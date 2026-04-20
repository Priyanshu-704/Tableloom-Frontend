import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { useNotification } from "../../common/NotificationContext";
import { useSettings } from "../../common/context/SettingsContext";
import {
  getPushToken,
  subscribeToForegroundPush,
} from "../../common/firebase/pushNotifications.js";
import pushNotificationService from "../../common/services/pushNotificationService";
import { axiosInstance } from "../../common/services/api";
import { buildCustomerPath } from "../../common/utils/routes";
import { useApp } from "./AppContext";
import { storeCompletedVisit } from "../utils/completedVisit";
const UserLiveUpdatesContext = createContext({
  isConnected: false,
});
const buildSocketUrl = () => {
  const baseUrl = axiosInstance?.defaults?.baseURL || "";
  return baseUrl.replace(/\/api\/?$/, "");
};
const normalizeOrder = (payload = {}) => ({
  ...payload,
  id: payload?._id || payload?.id || payload?.orderId || "",
  total: payload?.total ?? payload?.totalAmount ?? payload?.summary?.total ?? 0,
  createdAt:
    payload?.createdAt ||
    payload?.orderPlacedAt ||
    payload?.updatedAt ||
    new Date().toISOString(),
  ...(Array.isArray(payload?.items)
    ? {
        items: payload.items.map((item) => ({
          ...item,
          id: item?._id || item?.id,
          name: item?.name || item?.menuItem?.name || "Menu item",
          price: item?.price ?? item?.unitPrice ?? item?.totalPrice ?? 0,
          quantity: item?.quantity || 0,
        })),
      }
    : {}),
});
const getWaiterMessage = (payload = {}) =>
  payload?.message ||
  payload?.statusMessage ||
  "Your request has been updated.";
const getStoredSessionId = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    window.sessionStorage.getItem("sessionId") ||
    window.localStorage.getItem("sessionId") ||
    ""
  );
};
export function UserLiveUpdatesProvider({ children }) {
  const { notify, addPersistentNotification, refreshNotifications } =
    useNotification();
  const { sessionId, dispatch } = useApp();
  const { settings } = useSettings();
  const socketRef = useRef(null);
  const joinedSessionRef = useRef("");
  const previousSessionRef = useRef("");
  const handledEventIdsRef = useRef(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const activeSessionId = sessionId || getStoredSessionId();
  const markLiveEventHandled = useCallback((payload = {}) => {
    const eventKey =
      payload?._id ||
      payload?.notificationId ||
      payload?.messageId ||
      payload?.id ||
      "";
    if (!eventKey) {
      return true;
    }
    const now = Date.now();
    handledEventIdsRef.current.forEach((timestamp, key) => {
      if (now - timestamp > 5000) {
        handledEventIdsRef.current.delete(key);
      }
    });
    if (handledEventIdsRef.current.has(eventKey)) {
      return false;
    }
    handledEventIdsRef.current.set(eventKey, now);
    return true;
  }, []);
  useEffect(() => {
    if (!sessionId && activeSessionId) {
      dispatch({
        type: "SET_SESSION",
        payload: activeSessionId,
      });
    }
  }, [activeSessionId, dispatch, sessionId]);
  useEffect(() => {
    const socketUrl = buildSocketUrl();
    if (!socketUrl || socketRef.current) {
      return undefined;
    }
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
    });
    socketRef.current = socket;
    const joinSessionRoom = (activeSessionId) => {
      if (!activeSessionId) {
        return;
      }
      socket.emit("join-session-room", activeSessionId);
      socket.emit("join-customer-room", activeSessionId);
      joinedSessionRef.current = activeSessionId;
    };
    const handleOrderUpdate = (payload = {}) => {
      const normalizedOrder = normalizeOrder(payload);
      if (!(normalizedOrder?._id || normalizedOrder?.id)) {
        return;
      }
      dispatch({
        type: "SET_CURRENT_ORDER",
        payload: normalizedOrder,
      });
      const nextStatus = payload?.status || normalizedOrder?.status;
      if (nextStatus) {
        notify(
          `Order status updated: ${nextStatus.replace(/_/g, " ")}`,
          "info",
        );
      }
    };
    const handlePersistentNotification = (payload = {}) => {
      if (!markLiveEventHandled(payload)) {
        return;
      }
      if (payload?._id) {
        addPersistentNotification({
          ...payload,
          isRead: false,
        });
      }
      if (payload?.message) {
        notify(
          payload.message,
          payload?.type === "waiter_call" ? "waiter" : "info",
        );
      }
    };
    const handleWaiterUpdate = (payload = {}) => {
      const callId = payload?.callId || payload?._id || payload?.id;
      if (!callId) {
        return;
      }
      dispatch({
        type: "UPSERT_WAITER_CALL",
        payload,
      });
      const status = payload?.status || "";
      if (status === "completed" || status === "cancelled") {
        dispatch({
          type: "REMOVE_WAITER_CALL",
          payload: callId,
        });
      }
      const nextMessage =
        payload?.status === "acknowledged"
          ? `Your waiter call has been acknowledged${payload?.acknowledgedBy ? ` by ${payload.acknowledgedBy}` : ""}.`
          : payload?.status === "assigned"
            ? `A staff member has been assigned${payload?.assignedTo ? `: ${payload.assignedTo}` : ""}.`
            : payload?.status === "completed"
              ? "Your waiter request has been completed."
              : getWaiterMessage(payload);
      notify(nextMessage, "waiter");
    };
    const handleSessionCompleted = (payload = {}) => {
      const thankYouMessage =
        payload?.thankYouMessage ||
        "Payment completed successfully. Thank you for dining with us.";
      storeCompletedVisit({
        sessionId: payload?.sessionId || activeSessionId,
        billId: payload?.billId || "",
        billNumber: payload?.billNumber || "",
        message: thankYouMessage,
      });
      dispatch({
        type: "CLEAR_SESSION",
      });
      window.location.replace(buildCustomerPath("/thank-you"));
    };
    socket.on("connect", () => {
      setIsConnected(true);
      joinSessionRoom(activeSessionId);
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
    });
    socket.on("order:status-updated", handleOrderUpdate);
    socket.on("order-status-updated", handleOrderUpdate);
    socket.on("new_notification", handlePersistentNotification);
    socket.on("waiter-call:confirmed", handleWaiterUpdate);
    socket.on("waiter-call:updated", handleWaiterUpdate);
    socket.on("waiter-call:acknowledged", handleWaiterUpdate);
    socket.on("waiter-call:assigned", handleWaiterUpdate);
    socket.on("waiter-call:completed", handleWaiterUpdate);
    socket.on("waiter-call:status-updated", handleWaiterUpdate);
    socket.on("waiter-call:cancelled", handleWaiterUpdate);
    socket.on("session:completed", handleSessionCompleted);
    socket.on("customer-session:completed", handleSessionCompleted);
    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedSessionRef.current = "";
      setIsConnected(false);
    };
  }, [
    activeSessionId,
    addPersistentNotification,
    dispatch,
    markLiveEventHandled,
    notify,
  ]);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeSessionId) {
      return;
    }
    if (joinedSessionRef.current !== activeSessionId && socket.connected) {
      socket.emit("join-session-room", activeSessionId);
      socket.emit("join-customer-room", activeSessionId);
      joinedSessionRef.current = activeSessionId;
    }
  }, [activeSessionId]);
  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    refreshNotifications().catch(() => {});
  }, [activeSessionId, refreshNotifications]);
  useEffect(() => {
    let unsubscribe = () => {};
    let isCancelled = false;
    const pushEnabled = settings?.notifications?.pushNotifications !== false;
    const previousSessionId = previousSessionRef.current;
    const currentStorageKey = pushNotificationService.buildStorageKey(
      "customer",
      activeSessionId || "guest",
    );
    const syncPushNotifications = async () => {
      if (previousSessionId && previousSessionId !== activeSessionId) {
        const previousStorageKey = pushNotificationService.buildStorageKey(
          "customer",
          previousSessionId,
        );
        await pushNotificationService
          .removeStoredToken({
            storageKey: previousStorageKey,
            audience: "customer",
            sessionId: previousSessionId,
          })
          .catch(() => {});
      }
      previousSessionRef.current = activeSessionId || "";
      if (!pushEnabled || !activeSessionId) {
        await pushNotificationService
          .removeStoredToken({
            storageKey: currentStorageKey,
            audience: "customer",
            sessionId: activeSessionId,
          })
          .catch(() => {});
        return;
      }
      const tokenResult = await getPushToken({
        requestPermission: true,
      }).catch(() => ({
        success: false,
        token: "",
      }));
      if (!tokenResult?.success || !tokenResult?.token) {
        if (tokenResult?.permission === "denied") {
          await pushNotificationService
            .removeStoredToken({
              storageKey: currentStorageKey,
              audience: "customer",
              sessionId: activeSessionId,
            })
            .catch(() => {});
        }
        return;
      }
      await pushNotificationService
        .syncToken({
          storageKey: currentStorageKey,
          audience: "customer",
          sessionId: activeSessionId,
          permission: tokenResult.permission,
          token: tokenResult.token,
        })
        .catch(() => {});
      unsubscribe = await subscribeToForegroundPush((payload) => {
        if (isCancelled || !markLiveEventHandled(payload)) {
          return;
        }
        addPersistentNotification({
          ...payload,
          isRead: false,
        });
        if (payload.message) {
          notify(
            payload.message,
            payload.type === "waiter_call" ? "waiter" : "info",
          );
        }
      });
    };
    syncPushNotifications();
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [
    activeSessionId,
    addPersistentNotification,
    markLiveEventHandled,
    notify,
    settings?.notifications?.pushNotifications,
  ]);
  const value = useMemo(
    () => ({
      isConnected,
    }),
    [isConnected],
  );
  return (
    <UserLiveUpdatesContext.Provider value={value}>
      {children}
    </UserLiveUpdatesContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useUserLiveUpdates() {
  return useContext(UserLiveUpdatesContext);
}
