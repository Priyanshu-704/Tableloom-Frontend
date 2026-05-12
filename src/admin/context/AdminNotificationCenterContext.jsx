import { logger } from "../../common/utils/logger.js";
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
import { useAuth } from "../../common/context/AuthContext";
import { useSettings } from "../../common/context/SettingsContext";
import {
  getPushToken,
  subscribeToForegroundPush,
} from "../../common/firebase/pushNotifications.js";
import { notificationAdminService } from "../../common/services";
import { getStoredAuthTokens } from "../../common/services/api";
import pushNotificationService from "../../common/services/pushNotificationService";
import { useAdmin } from "./AdminContext";
import {
  canAccessNotificationType,
  getAllowedNotificationTypes,
  getNotificationTypeOptions,
} from "../utils/accessControl";
const AdminNotificationCenterContext = createContext(null);
const defaultFilters = {
  search: "",
  status: "all",
  type: "all",
  priority: "all",
  unreadOnly: false,
  actionRequired: false,
};
const priorityWeight = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};
const matchesServerFilters = (notification, filters) => {
  const status =
    notification.effectiveStatus || notification.status || "unread";
  if (filters.status !== "all" && status !== filters.status) {
    return false;
  }
  if (filters.type !== "all" && notification.type !== filters.type) {
    return false;
  }
  if (
    filters.priority !== "all" &&
    notification.priority !== filters.priority
  ) {
    return false;
  }
  if (filters.unreadOnly && notification.isRead) {
    return false;
  }
  if (filters.actionRequired && !notification.actionRequired) {
    return false;
  }
  return true;
};
const matchesSearch = (notification, search) => {
  const keyword = search.trim().toLowerCase();
  if (!keyword) {
    return true;
  }
  return [
    notification.title,
    notification.message,
    notification.type,
    notification.sender?.name,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
};
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_APP_API_URL;
  return apiUrl.replace(/\/api\/?$/, "");
};

const SOCKET_OPTIONS = {
  withCredentials: true,
  transports: ["polling", "websocket"],
  upgrade: true,
  autoConnect: false,
};
export function AdminNotificationCenterProvider({ children }) {

  const { user, isAuthenticated, hasPermission } = useAuth();
  const { addNotification } = useAdmin();
  const { settings } = useSettings();
  const isSuperAdmin = String(user?.role || "").toLowerCase() === "super_admin";
  const allowedNotificationTypes = useMemo(
    () => getAllowedNotificationTypes(user?.role),
    [user?.role],
  );
  const notificationTypeOptions = useMemo(
    () => getNotificationTypeOptions(user?.role),
    [user?.role],
  );
  const isAllowedNotification = useCallback(
    (notification = {}) =>
      canAccessNotificationType(user?.role, notification?.type || ""),
    [user?.role],
  );
  const canViewNotifications =
    hasPermission("notification.view") &&
    allowedNotificationTypes.length > 0;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [activityVersion, setActivityVersion] = useState(0);
  const socketRef = useRef(null);
  const filtersRef = useRef(defaultFilters);
  const isDrawerOpenRef = useRef(false);
  const loadNotificationsRef = useRef(null);
  const loadStatsRef = useRef(null);
  const addNotificationRef = useRef(addNotification);
  const lastFetchKeyRef = useRef("");
  const handledEventIdsRef = useRef(new Map());
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
  const appendLiveNotification = useCallback(
    (incoming = {}) => {
      if (!isAllowedNotification(incoming)) {
        return;
      }
      if (!markLiveEventHandled(incoming)) {
        return;
      }
      const notification = {
        ...incoming,
        effectiveStatus:
          incoming.effectiveStatus || incoming.status || "unread",
        isRead: Boolean(incoming.isRead),
      };
      setStats((current) => ({
        ...(current || {}),
        total: (current?.total || 0) + 1,
        unreadCount:
          (current?.unreadCount || 0) + (notification.isRead ? 0 : 1),
      }));
      setActivityVersion((current) => current + 1);
      if (!matchesServerFilters(notification, filtersRef.current)) {
        return;
      }
      setNotifications((current) => {
        const next = current.filter((item) => item._id !== notification._id);
        return [notification, ...next].slice(0, 100);
      });
    },
    [isAllowedNotification, markLiveEventHandled],
  );
  const loadStats = useCallback(async () => {
    if (!isAuthenticated || !canViewNotifications) {
      setStats(null);
      return;
    }
    try {
      const statsResponse = await notificationAdminService.getStats("today");
      setStats((current) => ({
        ...(current || {}),
        ...(statsResponse.data || {}),
      }));
    } catch (error) {
      logger.error("Failed to load notification stats:", error);
    }
  }, [canViewNotifications, isAuthenticated]);
  const loadNotifications = useCallback(
    async ({ silent = false, force = false } = {}) => {
      if (!isAuthenticated || !canViewNotifications) {
        return;
      }
      if (!force && !isDrawerOpen) {
        return;
      }
      try {
        if (!silent) {
          setLoading(true);
        }
        const params = {
          limit: 100,
        };
        if (filters.status !== "all") {
          params.status = filters.status;
        }
        if (filters.type !== "all") {
          params.type = filters.type;
        }
        if (filters.priority !== "all") {
          params.priority = filters.priority;
        }
        if (filters.unreadOnly) {
          params.unreadOnly = true;
        }
        if (filters.actionRequired) {
          params.actionRequired = true;
        }
        const [notificationsResponse, statsResponse] = await Promise.all([
          notificationAdminService.getNotifications(params),
          notificationAdminService.getStats("today"),
        ]);
        const nextNotifications = (notificationsResponse.data || []).filter(
          (notification) => isAllowedNotification(notification),
        );
        setNotifications(nextNotifications);
        setStats({
          ...(statsResponse.data || {}),
          unreadCount: nextNotifications.filter((item) => !item.isRead).length,
          total: nextNotifications.length,
        });
      } catch (error) {
        logger.error("Failed to load notification center:", error);
        if (!silent) {
          addNotification(
            error.response?.data?.message || "Failed to load notifications",
            "error",
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [
      addNotification,
      canViewNotifications,
      filters.actionRequired,
      filters.priority,
      filters.status,
      filters.type,
      filters.unreadOnly,
      isAllowedNotification,
      isDrawerOpen,
      isAuthenticated,
    ],
  );
  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    if (!canViewNotifications) {
      setNotifications([]);
      setIsDrawerOpen(false);
      lastFetchKeyRef.current = "";
      return;
    }
  }, [canViewNotifications]);
  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }
    const fetchKey = JSON.stringify({
      isAuthenticated,
      canViewNotifications,
      isDrawerOpen,
      filters,
    });
    if (lastFetchKeyRef.current === fetchKey) {
      return;
    }
    lastFetchKeyRef.current = fetchKey;
    loadNotifications({
      force: true,
    });
  }, [
    canViewNotifications,
    filters,
    isAuthenticated,
    isDrawerOpen,
    loadNotifications,
  ]);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  useEffect(() => {
    isDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen]);
  useEffect(() => {
    loadNotificationsRef.current = loadNotifications;
  }, [loadNotifications]);
  useEffect(() => {
    loadStatsRef.current = loadStats;
  }, [loadStats]);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);
  useEffect(() => {
    if (!isAuthenticated || !canViewNotifications || !user?._id) {
      setIsConnected(false);
      return undefined;
    }
    const { accessToken } = getStoredAuthTokens();
    const socket = io(getSocketUrl(), {
      ...SOCKET_OPTIONS,
      auth: accessToken
        ? {
            accessToken: `Bearer ${accessToken}`,
          }
        : undefined,
    });
    socketRef.current = socket;
    const joinRooms = () => {
      socket.emit("join-user-room", user._id);
      socket.emit("join-role-room", user.role);
      if (!isSuperAdmin && ["admin", "manager", "chef", "waiter"].includes(user.role)) {
        socket.emit("join-staff-room");
      }
      if (!isSuperAdmin && ["admin", "manager"].includes(user.role)) {
        socket.emit("join-management-room");
      }
    };
    const handleIncomingNotification = (incoming) =>
      appendLiveNotification({
        ...incoming,
        isRead: false,
      });
    const handleCountUpdate = (payload) => {
      setStats((current) => ({
        ...(current || {}),
        unreadCount: payload.unreadCount ?? current?.unreadCount ?? 0,
      }));
    };
    const handleNotificationUpdate = (payload = {}) => {
      if (payload.action === "cleared") {
        setNotifications([]);
      }
      setActivityVersion((current) => current + 1);
      if (isDrawerOpenRef.current) {
        loadNotificationsRef.current?.({
          silent: true,
          force: true,
        });
      } else {
        loadStatsRef.current?.();
      }
    };
    const handleWaiterCall = (payload = {}) => {
      if (!canAccessNotificationType(user?.role, "waiter_call")) {
        return;
      }
      const tableLabel =
        payload.tableName || `Table ${payload.tableNumber || ""}`.trim();
      addNotificationRef.current?.(
        `${tableLabel} requested staff attention`,
        "warning",
      );
      setActivityVersion((current) => current + 1);
      if (isDrawerOpenRef.current) {
        loadNotificationsRef.current?.({
          silent: true,
          force: true,
        });
      } else {
        loadStatsRef.current?.();
      }
    };
    socket.on("connect", () => {
      setIsConnected(true);
      joinRooms();
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("notification:new", handleIncomingNotification);
    socket.on("new_notification", handleIncomingNotification);
    socket.on("notification:count", handleCountUpdate);
    socket.on("notification_count_update", handleCountUpdate);
    socket.on("notification:updated", handleNotificationUpdate);
    socket.on("notification_updated", handleNotificationUpdate);
    socket.on("waiter-call:new", handleWaiterCall);
    socket.on("new_waiter_call", handleWaiterCall);
    socket.on("notification:sound", (payload = {}) => {
      if (payload.soundType === "urgent") {
        addNotificationRef.current?.(
          "Important live notification received",
          "warning",
        );
      }
    });
    socket.connect();
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [
    appendLiveNotification,
    canViewNotifications,
    isAuthenticated,
    user?._id,
    user?.role,
    isSuperAdmin,
  ]);
  useEffect(() => {
    let unsubscribe = () => {};
    let isCancelled = false;
    const pushEnabled = settings?.notifications?.pushNotifications !== false;
    const storageKey = pushNotificationService.buildStorageKey(
      "staff",
      user?._id || "guest",
    );
    const startPushSync = async () => {
      if (!pushEnabled || !isAuthenticated || !user?._id) {
        await pushNotificationService
          .removeStoredToken({
            storageKey,
            audience: "staff",
            userId: user?._id,
            role: user?.role,
          })
          .catch(() => {});
        return;
      }
      if (!canViewNotifications) {
        return;
      }
      if (String(user?.role || "").toLowerCase() === "super_admin") {
        return;
      }
      const tokenResult = await getPushToken({
        requestPermission: true,
      }).catch((error) => {
        logger.warn("Failed to initialize staff push notifications", error);
        return {
          success: false,
          token: "",
        };
      });
      if (!tokenResult?.success || !tokenResult?.token) {
        if (tokenResult?.permission === "denied") {
          await pushNotificationService
            .removeStoredToken({
              storageKey,
              audience: "staff",
              userId: user?._id,
              role: user?.role,
            })
            .catch(() => {});
        }
        return;
      }
      await pushNotificationService
        .syncToken({
          storageKey,
          audience: "staff",
          userId: user._id,
          role: user.role,
          permission: tokenResult.permission,
          token: tokenResult.token,
        })
        .catch((error) => {
          logger.warn("Failed to sync staff push notification token", error);
        });
      unsubscribe = await subscribeToForegroundPush((payload) => {
        if (isCancelled) {
          return;
        }
        if (!isAllowedNotification(payload)) {
          return;
        }
        appendLiveNotification({
          ...payload,
          isRead: false,
        });
        if (payload?.message) {
          addNotification(
            payload.message,
            payload.priority === "urgent" || payload.type === "waiter_call"
              ? "warning"
              : "info",
          );
        }
      });
    };
    startPushSync();
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [
    addNotification,
    appendLiveNotification,
    canViewNotifications,
    isAuthenticated,
    isAllowedNotification,
    settings?.notifications?.pushNotifications,
    user?._id,
    user?.role,
  ]);
  const runAction = useCallback(
    async (actionKey, task, successMessage) => {
      try {
        setActiveAction(actionKey);
        await task();
        if (successMessage) {
          addNotification(successMessage, "success");
        }
        await loadNotifications({
          silent: true,
          force: true,
        });
      } catch (error) {
        logger.error("Notification center action failed:", error);
        addNotification(
          error.response?.data?.message || "Failed to update notifications",
          "error",
        );
      } finally {
        setActiveAction("");
      }
    },
    [addNotification, loadNotifications],
  );
  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        matchesSearch(notification, filters.search),
      ),
    [filters.search, notifications],
  );
  const importantNotifications = useMemo(
    () =>
      filteredNotifications
        .filter((item) => ["urgent", "high"].includes(item.priority))
        .sort(
          (left, right) =>
            (priorityWeight[right.priority] || 0) -
            (priorityWeight[left.priority] || 0),
        ),
    [filteredNotifications],
  );
  const otherNotifications = useMemo(
    () =>
      filteredNotifications.filter(
        (item) => !["urgent", "high"].includes(item.priority),
      ),
    [filteredNotifications],
  );
  const value = useMemo(
    () => ({
      notifications: filteredNotifications,
      rawNotifications: notifications,
      importantNotifications,
      otherNotifications,
      stats,
      activityVersion,
      allowedNotificationTypes,
      filters,
      notificationTypeOptions,
      loading,
      activeAction,
      isConnected,
      isDrawerOpen,
      canViewNotifications,
      setFilters,
      resetFilters: () => setFilters(defaultFilters),
      refreshNotifications: () =>
        loadNotifications({
          force: true,
        }),
      toggleDrawer: () => setIsDrawerOpen((current) => !current),
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      markAsRead: (notificationId) =>
        runAction(
          notificationId,
          () => notificationAdminService.markAsRead(notificationId),
          "Notification marked as read",
        ),
      acknowledge: (notificationId) =>
        runAction(
          notificationId,
          () => notificationAdminService.acknowledge(notificationId),
          "Notification acknowledged",
        ),
      dismiss: (notificationId) =>
        runAction(
          notificationId,
          () => notificationAdminService.dismiss(notificationId),
          "Notification cleared from your drawer",
        ),
      markAllAsRead: () =>
        runAction(
          "mark-all",
          () => notificationAdminService.markAllAsRead(),
          "All notifications marked as read",
        ),
      clearAll: () =>
        runAction(
          "clear-all",
          () => notificationAdminService.clearAll(),
          "Notifications cleared",
        ),
      cleanupExpired: () =>
        runAction(
          "cleanup",
          () => notificationAdminService.cleanup(),
          "Expired notifications cleaned up",
        ),
    }),
    [
      activeAction,
      activityVersion,
      allowedNotificationTypes,
      canViewNotifications,
      filteredNotifications,
      filters,
      notificationTypeOptions,
      importantNotifications,
      isConnected,
      isDrawerOpen,
      loadNotifications,
      loading,
      notifications,
      otherNotifications,
      runAction,
      stats,
    ],
  );
  return (
    <AdminNotificationCenterContext.Provider value={value}>
      {children}
    </AdminNotificationCenterContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminNotificationCenter() {
  const context = useContext(AdminNotificationCenterContext);
  if (!context) {
    throw new Error(
      "useAdminNotificationCenter must be used within AdminNotificationCenterProvider",
    );
  }
  return context;
}
