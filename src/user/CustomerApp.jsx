import {
  Navigate,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useApp } from "./context/AppContext";
import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { UserLiveUpdatesProvider } from "./context/UserLiveUpdatesContext";
import customerSessionService from "../common/services/CustomerSessionService";
import SessionRequiredRoute, {
  ScanRequiredState,
} from "./components/SessionRequiredRoute";
import { buildCustomerPath } from "../common/utils/routes";
const CustomerInfoForm = lazy(() =>
  import("./pages/CustomerInfoForm").then((m) => ({
    default: m.CustomerInfoForm,
  })),
);
const Home = lazy(() =>
  import("./pages/Home").then((m) => ({
    default: m.Home,
  })),
);
const Menu = lazy(() =>
  import("./pages/Menu").then((m) => ({
    default: m.Menu,
  })),
);
const Cart = lazy(() =>
  import("./pages/Cart").then((m) => ({
    default: m.Cart,
  })),
);
const OrderStatus = lazy(() =>
  import("./pages/OrderStatus").then((m) => ({
    default: m.OrderStatus,
  })),
);
const OrderHistory = lazy(() =>
  import("./pages/OrderHistory").then((m) => ({
    default: m.OrderHistory,
  })),
);
const BillRequest = lazy(() =>
  import("./pages/BillRequest").then((m) => ({
    default: m.BillRequest,
  })),
);
const Feedback = lazy(() =>
  import("./pages/Feedback").then((m) => ({
    default: m.Feedback,
  })),
);
const RestaurantInfo = lazy(() =>
  import("./pages/RestaurantInfo").then((m) => ({
    default: m.RestaurantInfo,
  })),
);
const ThankYou = lazy(() =>
  import("./pages/ThankYou").then((m) => ({
    default: m.ThankYou,
  })),
);
const CustomerLayout = lazy(() => import("./components/layout/CustomerLayout"));
const RouteLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary-600" />
  </div>
);
const BYPASS_CUSTOMER_SESSION_GUARD =
  import.meta.env.DEV &&
  import.meta.env.VITE_BYPASS_CUSTOMER_SESSION_GUARD === "true";
function CustomerApp() {
  const { dispatch, sessionId } = useApp();
  const { tableNumber: routeTableNumber } = useParams();
  const [searchParams] = useSearchParams();
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const scanContext = useMemo(() => {
    const tableId = searchParams.get("table") || "";
    const rawToken = searchParams.get("token") || "";
    const token = rawToken.split("/")[0] || "";
    const queryTableNumber = searchParams.get("tableNumber") || "";
    return {
      tableId,
      token,
      tableNumber: routeTableNumber || queryTableNumber || "",
    };
  }, [routeTableNumber, searchParams]);
  useEffect(() => {
    if (
      !scanContext.tableId &&
      !scanContext.token &&
      !scanContext.tableNumber
    ) {
      return;
    }
    dispatch({
      type: "SET_TABLE_INFO",
      payload: {
        tableId: scanContext.tableId,
        tableNumber: scanContext.tableNumber,
        token: scanContext.token,
        restaurantId: "1",
      },
    });
  }, [dispatch, scanContext]);
  useEffect(() => {
    let active = true;
    const hydrateSession = async () => {
      if (BYPASS_CUSTOMER_SESSION_GUARD) {
        if (active) {
          setIsHydratingSession(false);
        }
        return;
      }
      if (!sessionId) {
        if (active) {
          setIsHydratingSession(false);
        }
        return;
      }
      try {
        const response = await customerSessionService.getSession(sessionId);
        const details = response?.data || null;
        if (!response?.success || !details) {
          throw new Error(response?.message || "Session not found");
        }
        dispatch({
          type: "SET_SESSION_DETAILS",
          payload: details,
        });
        dispatch({
          type: "SET_TABLE_INFO",
          payload: {
            tableId: details?.table?._id || scanContext.tableId,
            tableNumber:
              details?.table?.tableNumber || scanContext.tableNumber || "",
            token: scanContext.token,
            restaurantId: "1",
          },
        });
      // eslint-disable-next-line no-unused-vars
      } catch (error) {
        dispatch({
          type: "CLEAR_SESSION",
        });
      } finally {
        if (active) {
          setIsHydratingSession(false);
        }
      }
    };
    hydrateSession();
    return () => {
      active = false;
    };
  }, [
    dispatch,
    scanContext.tableId,
    scanContext.tableNumber,
    scanContext.token,
    sessionId,
  ]);
  return (
    <UserLiveUpdatesProvider>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              sessionId || BYPASS_CUSTOMER_SESSION_GUARD ? (
                <Navigate to={buildCustomerPath("/home")} replace />
              ) : (
                <CustomerInfoForm />
              )
            }
          />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route
            path="/home"
            element={
              <SessionRequiredRoute
                hasSession={Boolean(sessionId)}
                isHydrating={isHydratingSession}
              >
                <CustomerLayout />
              </SessionRequiredRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="menu" element={<Menu />} />
            <Route path="cart" element={<Cart />} />
            <Route path="order-status/:orderId?" element={<OrderStatus />} />
            <Route path="orders" element={<OrderHistory />} />
            <Route path="bill" element={<BillRequest />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="restaurant-info" element={<RestaurantInfo />} />
          </Route>
          <Route
            path="*"
            element={
              sessionId || BYPASS_CUSTOMER_SESSION_GUARD ? (
                <Navigate to={buildCustomerPath("/home")} replace />
              ) : (
                <ScanRequiredState />
              )
            }
          />
        </Routes>
      </Suspense>
    </UserLiveUpdatesProvider>
  );
}
export default CustomerApp;
