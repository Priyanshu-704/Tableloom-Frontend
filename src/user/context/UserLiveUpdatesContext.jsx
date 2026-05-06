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
import { useLocation, useNavigate } from "react-router-dom";
import { useNotification } from "../../common/NotificationContext";
import { useSettings } from "../../common/context/SettingsContext";
import {
  getPushToken,
  subscribeToForegroundPush,
} from "../../common/firebase/pushNotifications.js";
import pushNotificationService from "../../common/services/pushNotificationService";
import customerSessionService from "../../common/services/CustomerSessionService";
import orderService from "../../common/services/orderService";
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

const SOCKET_OPTIONS = {
  withCredentials: true,
  transports: ["polling", "websocket"],
  upgrade: true,
  autoConnect: false,
};

const ORDER_EVENT_NAMES = [
  "order:status-updated",
  "order-status-updated",
  "order:updated",
  "order-updated",
  "order_updated",
  "new-order",
  "new_order",
  "order:new",
];

const extractOrderPayload = (payload = {}) => {
  if (payload?.order && typeof payload.order === "object") {
    return payload.order;
  }
  if (payload?.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
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
  const navigate = useNavigate();
  const location = useLocation();
  const {
    notify,
    addPersistentNotification,
    clearNotifications,
    refreshNotifications,
  } = useNotification();
  const { sessionId, dispatch } = useApp();
  const { settings } = useSettings();
  const socketRef = useRef(null);
  const joinedSessionRef = useRef("");
  const previousSessionRef = useRef("");
  const handledEventIdsRef = useRef(new Map());
  const completedSessionRedirectRef = useRef("");
  const locationPathRef = useRef(location.pathname);
  const orderSyncTimerRef = useRef(null);
  const lastOrderToastRef = useRef({
    orderId: "",
    status: "",
    timestamp: 0,
  });
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
  const handleSessionCompleted = useCallback(
    (payload = {}) => {
      const completedSessionId = String(
        payload?.sessionId || activeSessionId || getStoredSessionId(),
      ).trim();
      if (
        completedSessionId &&
        completedSessionRedirectRef.current === completedSessionId
      ) {
        return;
      }
      completedSessionRedirectRef.current = completedSessionId;
      const thankYouMessage =
        payload?.thankYouMessage ||
        "Payment completed successfully. Thank you for dining with us.";
      storeCompletedVisit({
        sessionId: completedSessionId,
        billId: payload?.billId || "",
        billNumber: payload?.billNumber || "",
        message: thankYouMessage,
      });
      clearNotifications().catch(() => {});
      dispatch({
        type: "CLEAR_SESSION",
      });
      if (locationPathRef.current !== buildCustomerPath("/thank-you")) {
        navigate(buildCustomerPath("/thank-you"), {
          replace: true,
          state: {
            message: thankYouMessage,
          },
        });
      }
    },
    [activeSessionId, clearNotifications, dispatch, navigate],
  );
  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);
  useEffect(() => {
    if (!sessionId && activeSessionId) {
      dispatch({
        type: "SET_SESSION",
        payload: activeSessionId,
      });
    }
  }, [activeSessionId, dispatch, sessionId]);

  const syncCurrentOrder = useCallback(
    async ({
      orderId = "",
      fallbackOrder = null,
      notifyStatus = "",
      skipToast = false,
    } = {}) => {
      const sessionOrderResponse = activeSessionId
        ? await orderService
            .getOrderBySession(activeSessionId, {
              force: true,
            })
            .catch(() => null)
        : null;
      const sessionOrder = normalizeOrder(sessionOrderResponse?.data || null);
      const shouldUseSessionOrder =
        sessionOrderResponse?.success &&
        sessionOrder &&
        (sessionOrder?._id || sessionOrder?.id);
      const detailOrderResponse =
        !shouldUseSessionOrder && orderId
          ? await orderService
              .getOrderById(orderId, {
                force: true,
              })
              .catch(() => null)
          : null;
      const detailOrder = normalizeOrder(detailOrderResponse?.data || null);
      const nextOrder =
        (shouldUseSessionOrder ? sessionOrder : null) ||
        (detailOrderResponse?.success &&
        detailOrder &&
        (detailOrder?._id || detailOrder?.id)
          ? detailOrder
          : null) ||
        fallbackOrder;
      if (!nextOrder || !(nextOrder?._id || nextOrder?.id)) {
        return;
      }
      dispatch({
        type: "SET_CURRENT_ORDER",
        payload: nextOrder,
      });
      const nextStatus = notifyStatus || nextOrder?.status || "";
      if (!nextStatus || skipToast) {
        return;
      }
      const nextOrderId = String(
        nextOrder?._id || nextOrder?.id || orderId || "",
      ).trim();
      const now = Date.now();
      const lastToast = lastOrderToastRef.current;
      if (
        lastToast.orderId === nextOrderId &&
        lastToast.status === nextStatus &&
        now - lastToast.timestamp < 4000
      ) {
        return;
      }
      lastOrderToastRef.current = {
        orderId: nextOrderId,
        status: nextStatus,
        timestamp: now,
      };
      notify(`Order status updated: ${nextStatus.replace(/_/g, " ")}`, "info");
    },
    [activeSessionId, dispatch, notify],
  );

  const scheduleOrderSync = useCallback(
    (options = {}) => {
      if (orderSyncTimerRef.current) {
        window.clearTimeout(orderSyncTimerRef.current);
      }
      orderSyncTimerRef.current = window.setTimeout(() => {
        orderSyncTimerRef.current = null;
        syncCurrentOrder(options).catch(() => {});
      }, 150);
    },
    [syncCurrentOrder],
  );

  useEffect(() => {
    const socketUrl = buildSocketUrl();
    if (!activeSessionId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      joinedSessionRef.current = "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsConnected(false);
      return undefined;
    }
    if (!socketUrl || socketRef.current) {
      return undefined;
    }
    const socket = io(socketUrl, SOCKET_OPTIONS);
    socketRef.current = socket;
    const joinSessionRoom = (activeSessionId) => {
      if (!activeSessionId) {
        return;
      }
      if (
        joinedSessionRef.current &&
        joinedSessionRef.current !== activeSessionId
      ) {
        socket.emit("leave-session-room", joinedSessionRef.current);
        socket.emit("leave-customer-room", joinedSessionRef.current);
      }
      socket.emit("join-session-room", activeSessionId);
      socket.emit("join-customer-room", activeSessionId);
      joinedSessionRef.current = activeSessionId;
    };
    const handleOrderUpdate = (payload = {}) => {
      const resolvedPayload = extractOrderPayload(payload);
      const normalizedOrder = normalizeOrder(resolvedPayload);
      const nextOrderId = String(
        normalizedOrder?._id ||
          normalizedOrder?.id ||
          resolvedPayload?.orderId ||
          payload?.orderId ||
          "",
      ).trim();
      const nextStatus =
        resolvedPayload?.status || payload?.status || normalizedOrder?.status;
      const nextSessionId = String(
        resolvedPayload?.sessionId || payload?.sessionId || activeSessionId,
      ).trim();
      if (!nextOrderId && !nextSessionId) {
        return;
      }
      if (nextOrderId) {
        dispatch({
          type: "SET_CURRENT_ORDER",
          payload: normalizedOrder,
        });
      }
      scheduleOrderSync({
        orderId: nextOrderId,
        fallbackOrder: normalizedOrder,
        notifyStatus: nextStatus,
      });
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
    socket.on("connect", () => {
      setIsConnected(true);
      joinSessionRoom(activeSessionId);
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
    });
    ORDER_EVENT_NAMES.forEach((eventName) => {
      socket.on(eventName, handleOrderUpdate);
    });
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
    socket.connect();
    return () => {
      if (orderSyncTimerRef.current) {
        window.clearTimeout(orderSyncTimerRef.current);
        orderSyncTimerRef.current = null;
      }
      socket.disconnect();
      socketRef.current = null;
      joinedSessionRef.current = "";
      setIsConnected(false);
    };
  }, [
    activeSessionId,
    addPersistentNotification,
    dispatch,
    handleSessionCompleted,
    markLiveEventHandled,
    notify,
    scheduleOrderSync,
  ]);

  useEffect(() => {
    if (
      !activeSessionId ||
      !socketRef.current ||
      !socketRef.current.connected ||
      joinedSessionRef.current === activeSessionId
    ) {
      return;
    }
    if (joinedSessionRef.current) {
      socketRef.current.emit("leave-session-room", joinedSessionRef.current);
      socketRef.current.emit("leave-customer-room", joinedSessionRef.current);
    }
    socketRef.current.emit("join-session-room", activeSessionId);
    socketRef.current.emit("join-customer-room", activeSessionId);
    joinedSessionRef.current = activeSessionId;
  }, [activeSessionId]);
  useEffect(() => {
    if (activeSessionId) {
      completedSessionRedirectRef.current = "";
    }
  }, [activeSessionId]);
  useEffect(() => {
    if (!activeSessionId) {
      return undefined;
    }
    let cancelled = false;
    const syncOrderStatus = async () => {
      const response = await orderService
        .getOrderBySession(activeSessionId, {
          force: true,
        })
        .catch(() => null);
      const nextOrder = normalizeOrder(response?.data || null);
      if (cancelled || !response?.success || !nextOrder) {
        return;
      }
      dispatch({
        type: "SET_CURRENT_ORDER",
        payload: nextOrder,
      });
    };
    syncOrderStatus();
    const pollTimer = window.setInterval(syncOrderStatus, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [activeSessionId, dispatch]);
  useEffect(() => {
    if (!activeSessionId) {
      return undefined;
    }
    let cancelled = false;
    const syncCompletedSession = async () => {
      const response = await customerSessionService
        .getSession(activeSessionId, {
          force: true,
        })
        .catch(() => null);
      if (cancelled || !response?.success || !response?.data) {
        return;
      }
      const sessionData = response.data;
      const isCompletedSession =
        String(sessionData?.sessionStatus || "").toLowerCase() === "completed";
      const isPaid =
        String(sessionData?.paymentStatus || "").toLowerCase() === "paid";
      if (isCompletedSession && isPaid) {
        handleSessionCompleted({
          sessionId: sessionData?.sessionId || activeSessionId,
          thankYouMessage:
            "Payment completed successfully. Thank you for dining with us.",
        });
      }
    };
    syncCompletedSession();
    const pollTimer = window.setInterval(syncCompletedSession, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [activeSessionId, handleSessionCompleted]);
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
