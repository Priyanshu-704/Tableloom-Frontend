import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import cartService from "../../common/services/cartService";
const AppContext = createContext();
const STORAGE_KEY = "tableloom_customer_app";
const loadStoredState = () => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const initialState = {
  tableInfo: null,
  cart: [],
  currentOrder: null,
  menuItems: [],
  categories: [],
  isLoading: false,
  restaurantInfo: null,
  customerInfo: null,
  sessionId: "",
  sessionDetails: null,
  activeWaiterCalls: [],
  ...loadStoredState(),
};
const persistState = (state) => {
  if (typeof window === "undefined") {
    return;
  }
  const safeState = {
    tableInfo: state?.tableInfo || null,
    currentOrder: state?.currentOrder || null,
    customerInfo: state?.customerInfo || null,
    sessionId: state?.sessionId || "",
    sessionDetails: state?.sessionDetails || null,
    activeWaiterCalls: Array.isArray(state?.activeWaiterCalls)
      ? state.activeWaiterCalls
      : [],
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
};
const upsertWaiterCall = (calls = [], payload = {}) => {
  const callId = payload?.callId || payload?._id || payload?.id;
  if (!callId) {
    return calls;
  }
  const nextCalls = Array.isArray(calls) ? [...calls] : [];
  const index = nextCalls.findIndex(
    (item) => (item?.callId || item?._id || item?.id) === callId,
  );
  if (index === -1) {
    nextCalls.unshift(payload);
    return nextCalls;
  }
  nextCalls[index] = {
    ...nextCalls[index],
    ...payload,
  };
  return nextCalls;
};
const mergeCurrentOrder = (currentOrder, nextOrder) => {
  if (!nextOrder) {
    return null;
  }
  if (!currentOrder) {
    return nextOrder;
  }
  const currentOrderId =
    currentOrder?._id || currentOrder?.id || currentOrder?.orderNumber || "";
  const nextOrderId =
    nextOrder?._id || nextOrder?.id || nextOrder?.orderNumber || "";
  if (
    !currentOrderId ||
    !nextOrderId ||
    String(currentOrderId) !== String(nextOrderId)
  ) {
    return nextOrder;
  }
  return {
    ...currentOrder,
    ...nextOrder,
    items: Array.isArray(nextOrder?.items)
      ? nextOrder.items
      : currentOrder?.items || [],
    customer: nextOrder?.customer || currentOrder?.customer || null,
    table: nextOrder?.table || currentOrder?.table || null,
    summary: nextOrder?.summary || currentOrder?.summary || null,
  };
};
function appReducer(state, action) {
  switch (action.type) {
    case "SET_TABLE_INFO":
      return {
        ...state,
        tableInfo: action.payload || null,
      };
    case "SET_MENU_ITEMS":
      return {
        ...state,
        menuItems: action.payload || [],
      };
    case "SET_CURRENT_ORDER":
      return {
        ...state,
        currentOrder: mergeCurrentOrder(state.currentOrder, action.payload),
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: Boolean(action.payload),
      };
    case "SET_CUSTOMER_INFO":
      return {
        ...state,
        customerInfo: action.payload || null,
      };
    case "SET_SESSION":
      return {
        ...state,
        sessionId: action.payload || "",
      };
    case "SET_SESSION_DETAILS":
      return {
        ...state,
        sessionDetails: action.payload || null,
      };
    case "SET_ACTIVE_WAITER_CALLS":
      return {
        ...state,
        activeWaiterCalls: Array.isArray(action.payload) ? action.payload : [],
      };
    case "UPSERT_WAITER_CALL":
      return {
        ...state,
        activeWaiterCalls: upsertWaiterCall(
          state.activeWaiterCalls,
          action.payload,
        ),
      };
    case "REMOVE_WAITER_CALL":
      return {
        ...state,
        activeWaiterCalls: (state.activeWaiterCalls || []).filter(
          (item) => (item?.callId || item?._id || item?.id) !== action.payload,
        ),
      };
    case "CLEAR_SESSION":
      return {
        ...state,
        tableInfo: null,
        currentOrder: null,
        customerInfo: null,
        sessionId: "",
        sessionDetails: null,
        activeWaiterCalls: [],
      };
    default:
      return state;
  }
}
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  useEffect(() => {
    persistState(state);
    cartService.setSessionId(state?.sessionId || "");
    if (typeof window !== "undefined") {
      if (state?.sessionId) {
        window.sessionStorage.setItem("sessionId", state.sessionId);
      } else {
        window.sessionStorage.removeItem("sessionId");
      }
    }
  }, [state]);
  const value = useMemo(() => {
    const tableInfo = state?.tableInfo || {};
    const sessionDetails = state?.sessionDetails || {};
    const sessionTable = sessionDetails?.table || {};
    return {
      state,
      dispatch,
      tableInfo,
      tableId: tableInfo?.tableId || sessionTable?._id || "",
      tableNumber:
        tableInfo?.tableNumber ||
        sessionTable?.tableNumber ||
        sessionTable?.number ||
        "",
      qrToken: tableInfo?.token || "",
      restaurantId: tableInfo?.restaurantId || "",
      sessionId: state?.sessionId || "",
      sessionDetails,
      customerInfo: state?.customerInfo || null,
      currentOrder: state?.currentOrder || null,
      activeWaiterCalls: Array.isArray(state?.activeWaiterCalls)
        ? state.activeWaiterCalls
        : [],
    };
  }, [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
