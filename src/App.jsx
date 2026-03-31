import React, { lazy, Suspense } from "react";
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
const AdminApp = lazy(() => import("./admin/AdminApp").then(m => ({
  default: m.AdminApp
})));
const CustomerApp = lazy(() => import("./user/CustomerApp"));
const MainLoader = () => <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
  </div>;
function AppContent() {
  return <Suspense fallback={<MainLoader />}>
      <Routes>
        <Route path={withAppBasePath("/admin/*")} element={<AdminProvider>
              <AuthProvider>
                <AdminApp />
              </AuthProvider>
            </AdminProvider>} />
        <Route path={withAppBasePath("/super-admin/*")} element={<Navigate to={withAppBasePath("/admin/login")} replace />} />
        <Route path={withAppBasePath("/:tenantSlug/:tenantKey/admin/*")} element={<AdminProvider>
              <AuthProvider>
                <AdminApp />
              </AuthProvider>
            </AdminProvider>} />
        <Route path={withAppBasePath("/:tenantSlug/:tenantKey/table/:tableNumber/*")} element={<CustomerApp />} />
        <Route path={withAppBasePath("/:tenantSlug/:tenantKey/*")} element={<CustomerApp />} />
        <Route path="*" element={<Navigate to={buildAdminPath("/login")} replace />} />
      </Routes>
    </Suspense>;
}
function AppProviders() {
  const location = useLocation();
  const isAdminRoute = isTenantAdminPath(location.pathname);
  const isSuperAdminRoute = isSuperAdminPath(location.pathname);
  return <NetworkProvider>
      <NetworkStatusBanner />
      {isAdminRoute || isSuperAdminRoute ? <SettingsProvider>
          <AppContent />
        </SettingsProvider> : <LanguageProvider>
          <SettingsProvider>
            <NotificationProvider>
              <AppProvider>
                <AppContent />
              </AppProvider>
            </NotificationProvider>
          </SettingsProvider>
        </LanguageProvider>}
    </NetworkProvider>;
}
function App() {
  return <AppProviders />;
}
export default App;
