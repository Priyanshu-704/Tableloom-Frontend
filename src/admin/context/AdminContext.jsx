import { logger } from "../../common/utils/logger.js";
import React, { createContext, useCallback, useContext, useMemo, useReducer, useEffect, useRef, useState } from "react";
import { userService } from "../../common/services";
import { useNavigate, useLocation } from "react-router-dom";
import { buildAdminPath, stripAdminRoutePrefix } from "../../common/utils/routes";
import { getApiMessage } from "../../common/utils/handleApiError";
import { ConfirmationDialog } from "../components/common/ConfirmationDialog";
import { ToastContainer } from "../../user/components/common/Toast";
const AdminContext = createContext();
const initialState = {
  isAuthenticated: false,
  orders: [],
  menuItems: [],
  tables: [],
  isLoading: false,
  notifications: [],
  currentView: "dashboard",
  kitchenView: false,
  settings: null
};
function adminReducer(state, action) {
  switch (action.type) {
    case "SET_ORDERS":
      return {
        ...state,
        orders: action.payload
      };
    case "SET_MENU_ITEMS":
      return {
        ...state,
        menuItems: action.payload
      };
    case "SET_TABLES":
      return {
        ...state,
        tables: action.payload
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload
      };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case "REMOVE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    case "UPDATE_ORDER_STATUS":
      return {
        ...state,
        orders: state.orders.map(order => order.id === action.payload.orderId ? {
          ...order,
          status: action.payload.status
        } : order)
      };
    case "SET_CURRENT_VIEW":
      return {
        ...state,
        currentView: action.payload
      };
    case "TOGGLE_KITCHEN_VIEW":
      return {
        ...state,
        kitchenView: !state.kitchenView
      };
    case "SET_SETTINGS":
      return {
        ...state,
        settings: action.payload
      };
    case "CLEAR_STATE":
      return {
        ...initialState,
        notifications: state.notifications
      };
    default:
      return state;
  }
}
function useAdminNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateTo = useCallback((path, options = {}) => {
    navigate(path, options);
  }, [navigate]);
  const getCurrentPath = useCallback(() => {
    return location.pathname;
  }, [location.pathname]);
  const getCurrentViewFromPath = useCallback(() => {
    const path = stripAdminRoutePrefix(location.pathname).replace(/^\/+/, "");
    return path === "" ? "dashboard" : path;
  }, [location.pathname]);
  return useMemo(() => ({
    navigateTo,
    getCurrentPath,
    getCurrentViewFromPath
  }), [getCurrentPath, getCurrentViewFromPath, navigateTo]);
}
export function AdminProvider({
  children
}) {
  const [state, dispatch] = useReducer(adminReducer, initialState);
  const {
    navigateTo,
    getCurrentViewFromPath
  } = useAdminNavigation();
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    tone: "danger"
  });
  const confirmationResolverRef = useRef(null);
  useEffect(() => {
    const currentView = getCurrentViewFromPath();
    if (state.currentView !== currentView) {
      dispatch({
        type: "SET_CURRENT_VIEW",
        payload: currentView
      });
    }
  }, [getCurrentViewFromPath]);
  const updateProfile = useCallback(async profileData => {
    try {
      dispatch({
        type: "SET_LOADING",
        payload: true
      });
      const result = await userService.updateProfile(profileData);
      if (result.success) {
        dispatch({
          type: "SET_USER",
          payload: result.data
        });
        addNotification("Profile updated successfully", "success");
        return result;
      }
    } catch (error) {
      logger.error("Error updating profile:", error);
      addNotification(error.message || "Failed to update profile", "error");
      throw error;
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: false
      });
    }
  }, []);
  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      dispatch({
        type: "SET_LOADING",
        payload: true
      });
      const result = await userService.updatePassword(currentPassword, newPassword);
      if (result.success) {
        addNotification("Password updated successfully", "success");
        return result;
      }
    } catch (error) {
      logger.error("Error updating password:", error);
      addNotification(error.message || "Failed to update password", "error");
      throw error;
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: false
      });
    }
  }, []);
  const updateOrderStatus = useCallback((orderId, status) => {
    dispatch({
      type: "UPDATE_ORDER_STATUS",
      payload: {
        orderId,
        status
      }
    });
  }, []);
  const addNotification = useCallback((message, type = "info", fallbackMessage = "") => {
    const resolvedMessage = getApiMessage(
      message,
      fallbackMessage || (type === "success" ? "Action completed successfully" : "Something went wrong"),
    );
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: resolvedMessage,
      type,
      duration: 5000,
      timestamp: new Date().toISOString()
    };
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: notification
    });
    setTimeout(() => {
      dispatch({
        type: "REMOVE_NOTIFICATION",
        payload: notification.id
      });
    }, 5000);
  }, []);
  const removeNotification = useCallback(notificationId => {
    dispatch({
      type: "REMOVE_NOTIFICATION",
      payload: notificationId
    });
  }, []);
  const toggleKitchenView = useCallback(() => {
    dispatch({
      type: "TOGGLE_KITCHEN_VIEW"
    });
  }, []);
  const navigateToView = useCallback(view => {
    const path = view === "dashboard" ? buildAdminPath("/") : buildAdminPath(`/${view}`);
    navigateTo(path);
    dispatch({
      type: "SET_CURRENT_VIEW",
      payload: view
    });
  }, [navigateTo]);
  const confirmAction = useCallback((options = {}) => {
    return new Promise(resolve => {
      confirmationResolverRef.current = resolve;
      setConfirmationState({
        isOpen: true,
        title: options.title || "Confirm Action",
        message: options.message || "Are you sure you want to continue?",
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        tone: options.tone || "danger"
      });
    });
  }, []);
  const closeConfirmation = useCallback(confirmed => {
    setConfirmationState(current => ({
      ...current,
      isOpen: false
    }));
    if (confirmationResolverRef.current) {
      confirmationResolverRef.current(confirmed);
      confirmationResolverRef.current = null;
    }
  }, []);
  const value = useMemo(() => ({
    ...state,
    dispatch,
    updateProfile,
    updatePassword,
    updateOrderStatus,
    addNotification,
    removeNotification,
    toggleKitchenView,
    setCurrentView: navigateToView,
    navigateTo,
    confirmAction
  }), [state, updateProfile, updatePassword, updateOrderStatus, addNotification, removeNotification, toggleKitchenView, navigateToView, navigateTo, confirmAction]);
  return <AdminContext.Provider value={value}>
      {children}
      <ToastContainer toasts={state.notifications} onRemoveToast={removeNotification} />
      <ConfirmationDialog isOpen={confirmationState.isOpen} title={confirmationState.title} message={confirmationState.message} confirmLabel={confirmationState.confirmLabel} cancelLabel={confirmationState.cancelLabel} tone={confirmationState.tone} onCancel={() => closeConfirmation(false)} onConfirm={() => closeConfirmation(true)} />
    </AdminContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
