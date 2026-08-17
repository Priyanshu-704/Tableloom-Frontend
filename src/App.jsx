import React, { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider } from "../src/user/context/AppContext";
import { NotificationProvider } from "../src/common/NotificationContext";
import { LanguageProvider } from "../src/user/context/LanguageContext";
import { AdminProvider } from "./admin/context/AdminContext";
import { AuthProvider } from "./common/context/AuthContext";
import { NetworkProvider } from "./common/context/NetworkContext";
import { SettingsProvider } from "./common/context/SettingsContext";
import { NetworkStatusBanner } from "./common/components/NetworkStatusBanner";
import {
  isSuperAdminPath,
  isTenantAdminPath,
  buildAdminPath,
  withAppBasePath,
} from "./common/utils/routes";
const AdminApp = lazy(() =>
  import("./admin/AdminApp").then((m) => ({
    default: m.AdminApp,
  })),
);
const CustomerApp = lazy(() => import("./user/CustomerApp"));
const MainLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
  </div>
);
function RouteScrollReset() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) {
      return;
    }

    const previousValue = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousValue;
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  return null;
}
function NumberInputGuard() {
  useEffect(() => {
    const handleWheel = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "number") {
        return;
      }
      if (document.activeElement !== target) {
        return;
      }
      event.preventDefault();
    };
    document.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      document.removeEventListener("wheel", handleWheel, true);
    };
  }, []);
  return null;
}
function AppContent() {
  return (
    <Suspense fallback={<MainLoader />}>
      <Routes>
        <Route
          path={withAppBasePath("/admin/*")}
          element={
            <AdminProvider>
              <AuthProvider>
                <AdminApp />
              </AuthProvider>
            </AdminProvider>
          }
        />
        <Route
          path={withAppBasePath("/super-admin/*")}
          element={<Navigate to={withAppBasePath("/admin/login")} replace />}
        />
        <Route
          path={withAppBasePath("/:tenantSlug/:tenantKey/admin/*")}
          element={
            <AdminProvider>
              <AuthProvider>
                <AdminApp />
              </AuthProvider>
            </AdminProvider>
          }
        />
        <Route
          path={withAppBasePath("/:tenantSlug/:tenantKey/branch/:branchSlug/admin/*")}
          element={
            <AdminProvider>
              <AuthProvider>
                <AdminApp />
              </AuthProvider>
            </AdminProvider>
          }
        />
        <Route
          path={withAppBasePath("/:tenantSlug/:tenantKey/subscription-renewal")}
          element={
            <AdminProvider>
              <AuthProvider>
                <AdminApp />
              </AuthProvider>
            </AdminProvider>
          }
        />
        <Route
          path={withAppBasePath("/:tenantSlug/:tenantKey/branch/:branchSlug/table/:tableNumber/*")}
          element={<CustomerApp />}
        />
        <Route
          path={withAppBasePath("/:tenantSlug/:tenantKey/table/:tableNumber/*")}
          element={<CustomerApp />}
        />
        <Route
          path={withAppBasePath("/:tenantSlug/:tenantKey/*")}
          element={<CustomerApp />}
        />
        <Route
          path="*"
          element={<Navigate to={buildAdminPath("/login")} replace />}
        />
      </Routes>
    </Suspense>
  );
}
function AppProviders() {
  const location = useLocation();
  const isAdminRoute = isTenantAdminPath(location.pathname);
  const isSuperAdminRoute = isSuperAdminPath(location.pathname);
  return (
    <NetworkProvider>
      <SettingsProvider>
        <RouteScrollReset />
        <NumberInputGuard />
        <NetworkStatusBanner />
        {isAdminRoute || isSuperAdminRoute ? (
          <AppContent />
        ) : (
          <LanguageProvider>
            <NotificationProvider>
              <AppProvider>
                <AppContent />
              </AppProvider>
            </NotificationProvider>
          </LanguageProvider>
        )}
      </SettingsProvider>
    </NetworkProvider>
  );
}
function App() {
  return <AppProviders />;
}
export default App;
