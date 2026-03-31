import React, { createContext, useContext, useEffect, useReducer } from 'react';
import customerNotificationService from "./services/customerNotificationService";
const NotificationContext = createContext();
const initialState = {
  toasts: [],
  notifications: [],
  unreadCount: 0
};
function notificationReducer(state, action) {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload]
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      };
    case 'CLEAR_TOASTS':
      return {
        ...state,
        toasts: []
      };
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload.notifications || [],
        unreadCount: action.payload.unreadCount || 0
      };
    case 'UPSERT_NOTIFICATION':
      {
        const incoming = action.payload;
        const notifications = [incoming, ...state.notifications.filter(item => item._id !== incoming._id)];
        return {
          ...state,
          notifications,
          unreadCount: notifications.filter(item => !item.isRead).length
        };
      }
    case 'MARK_NOTIFICATION_READ':
      {
        const notifications = state.notifications.map(item => item._id === action.payload ? {
          ...item,
          isRead: true,
          effectiveStatus: 'read'
        } : item);
        return {
          ...state,
          notifications,
          unreadCount: notifications.filter(item => !item.isRead).length
        };
      }
    case 'MARK_ALL_NOTIFICATIONS_READ':
      {
        const notifications = state.notifications.map(item => ({
          ...item,
          isRead: true,
          effectiveStatus: 'read'
        }));
        return {
          ...state,
          notifications,
          unreadCount: 0
        };
      }
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };
    default:
      return state;
  }
}
export function NotificationProvider({
  children
}) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      const sessionId = typeof window !== "undefined" ? window.sessionStorage.getItem("sessionId") || window.localStorage.getItem("sessionId") || "" : "";
      if (!sessionId) {
        dispatch({
          type: "SET_NOTIFICATIONS",
          payload: {
            notifications: [],
            unreadCount: 0
          }
        });
        return;
      }
      const response = await customerNotificationService.getNotifications({
        limit: 50
      });
      if (active) {
        dispatch({
          type: "SET_NOTIFICATIONS",
          payload: {
            notifications: response?.data || [],
            unreadCount: response?.unreadCount || 0
          }
        });
      }
    };
    loadNotifications();
    return () => {
      active = false;
    };
  }, []);
  const addToast = toast => {
    const id = Date.now().toString();
    dispatch({
      type: 'ADD_TOAST',
      payload: {
        ...toast,
        id
      }
    });
  };
  const removeToast = id => {
    dispatch({
      type: 'REMOVE_TOAST',
      payload: id
    });
  };
  const clearToasts = () => {
    dispatch({
      type: 'CLEAR_TOASTS'
    });
  };
  const notify = (message, type = 'info', duration = 5000) => {
    addToast({
      message,
      type,
      duration
    });
  };
  const refreshNotifications = async () => {
    const response = await customerNotificationService.getNotifications({
      limit: 50
    });
    dispatch({
      type: "SET_NOTIFICATIONS",
      payload: {
        notifications: response?.data || [],
        unreadCount: response?.unreadCount || 0
      }
    });
    return response;
  };
  const addPersistentNotification = notification => {
    if (!notification?._id) {
      return;
    }
    dispatch({
      type: "UPSERT_NOTIFICATION",
      payload: {
        ...notification,
        isRead: Boolean(notification.isRead)
      }
    });
  };
  const markNotificationRead = async notificationId => {
    await customerNotificationService.markAsRead(notificationId);
    dispatch({
      type: "MARK_NOTIFICATION_READ",
      payload: notificationId
    });
  };
  const markAllNotificationsRead = async () => {
    await customerNotificationService.markAllAsRead();
    dispatch({
      type: "MARK_ALL_NOTIFICATIONS_READ"
    });
  };
  const clearNotifications = async () => {
    await customerNotificationService.clearAll();
    dispatch({
      type: "CLEAR_NOTIFICATIONS"
    });
  };
  return <NotificationContext.Provider value={{
    toasts: state.toasts,
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    addToast,
    removeToast,
    clearToasts,
    notify,
    refreshNotifications,
    addPersistentNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications
  }}>
      {children}
    </NotificationContext.Provider>;
}
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
