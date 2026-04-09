import React, { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "../common/context/AuthContext";
import { buildAdminPath, resolveAdminHomePath } from "../common/utils/routes";
import ProtectedRoute from "./components/ProtectedRoute";
import { AdminHeader } from "./components/layout/AdminHeader";
import { Sidebar } from "./components/layout/Sidebar";
import { SkeletonBlock } from "./components/common/AdminSkeleton";
import { AdminNotificationCenterProvider } from "./context/AdminNotificationCenterContext";
import { AdminNotificationDrawer } from "./components/notifications/AdminNotificationDrawer";
const AdminLogin = lazy(() => import("./pages/AdminLogin").then(m => ({
  default: m.AdminLogin
})));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then(m => ({
  default: m.ForgotPassword
})));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(m => ({
  default: m.ResetPassword
})));
const ForcePasswordUpdate = lazy(() => import("./pages/ForcePasswordUpdate").then(m => ({
  default: m.ForcePasswordUpdate
})));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({
  default: m.Dashboard
})));
const Analytics = lazy(() => import("./pages/Analytics").then(m => ({
  default: m.Analytics
})));
const Orders = lazy(() => import("./pages/Orders").then(m => ({
  default: m.Orders
})));
const KitchenDisplay = lazy(() => import("./components/orders/KitchenDisplay").then(m => ({
  default: m.KitchenDisplay
})));
const KitchenStationManagement = lazy(() => import("./pages/KitchenStationManagement").then(m => ({
  default: m.KitchenStationManagement
})));
const StaffManagement = lazy(() => import("./pages/StaffManagement").then(m => ({
  default: m.StaffManagement
})));
const MenuManagement = lazy(() => import("./pages/MenuManagement").then(m => ({
  default: m.MenuManagement
})));
const InventoryManagement = lazy(() => import("./pages/InventoryManagement").then(m => ({
  default: m.InventoryManagement
})));
const CategoryManager = lazy(() => import("./components/menu/CategoryManager").then(m => ({
  default: m.CategoryManager
})));
const SizeManagement = lazy(() => import("./pages/SizeManagement").then(m => ({
  default: m.SizeManagement
})));
const SeasonalMenu = lazy(() => import("./components/menu/SeasonalMenu").then(m => ({
  default: m.SeasonalMenu
})));
const DiscountManagement = lazy(() => import("./pages/DiscountManagement").then(m => ({
  default: m.DiscountManagement
})));
const BulkOperations = lazy(() => import("./components/menu/BulkOperations").then(m => ({
  default: m.BulkOperations
})));
const PriceHistory = lazy(() => import("./components/menu/PriceHistory").then(m => ({
  default: m.PriceHistory
})));
const ImportExport = lazy(() => import("./components/menu/ImportExport").then(m => ({
  default: m.ImportExport
})));
const TableManagement = lazy(() => import("./pages/TableManagement").then(m => ({
  default: m.TableManagement
})));
const TableQrManagement = lazy(() => import("./pages/TableQrManagement").then(m => ({
  default: m.TableQrManagement
})));
const CustomerSessions = lazy(() => import("./pages/CustomerSessions").then(m => ({
  default: m.CustomerSessions
})));
const BillManagement = lazy(() => import("./pages/BillManagement").then(m => ({
  default: m.BillManagement
})));
const FeedbackManagement = lazy(() => import("./pages/FeedbackManagement").then(m => ({
  default: m.FeedbackManagement
})));
const WaiterCalls = lazy(() => import("./pages/WaiterCalls").then(m => ({
  default: m.WaiterCalls
})));
const Settings = lazy(() => import("./pages/Settings").then(m => ({
  default: m.Settings
})));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings").then(m => ({
  default: m.NotificationSettings
})));
const BackupManagement = lazy(() => import("./pages/BackupManagement").then(m => ({
  default: m.BackupManagement
})));
const AccessDenied = lazy(() => import("./pages/AccessDenied").then(m => ({
  default: m.AccessDenied
})));
const TenantManagement = lazy(() => import("./pages/TenantManagement").then(m => ({
  default: m.TenantManagement
})));
const TenantOverview = lazy(() => import("./pages/TenantOverview").then(m => ({
  default: m.TenantOverview
})));
const TenantRegistration = lazy(() => import("./pages/TenantRegistration").then(m => ({
  default: m.TenantRegistration
})));
const ContactSuperAdmin = lazy(() => import("./pages/ContactSuperAdmin").then(m => ({
  default: m.ContactSuperAdmin
})));
const LoadingScreen = () => <div className="min-h-screen bg-gray-50 p-6">
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-4 w-56" />
        </div>
        <SkeletonBlock className="h-11 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="space-y-3">
            {Array.from({
            length: 8
          }).map((_, index) => <SkeletonBlock key={`app-nav-skeleton-${index}`} className="h-10 w-full rounded-xl" />)}
          </div>
        </div>
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-9">
          <div className="space-y-4">
            <SkeletonBlock className="h-8 w-56" />
            <SkeletonBlock className="h-4 w-72" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({
              length: 6
            }).map((_, index) => <SkeletonBlock key={`app-content-skeleton-${index}`} className="h-40 w-full rounded-2xl" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("admin.sidebar.collapsed") === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      "admin.sidebar.collapsed",
      String(isDesktopSidebarCollapsed)
    );
  }, [isDesktopSidebarCollapsed]);

  return <AdminNotificationCenterProvider>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader isMobileSidebarOpen={isMobileSidebarOpen} onToggleMobileSidebar={() => setIsMobileSidebarOpen(current => !current)} isDesktopSidebarCollapsed={isDesktopSidebarCollapsed} onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed(current => !current)} />
        <div className="flex">
          <Sidebar isMobileSidebarOpen={isMobileSidebarOpen} onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)} isDesktopCollapsed={isDesktopSidebarCollapsed} />
          <AdminNotificationDrawer />
          <main className={`mt-16 min-w-0 flex-1 pb-6 transition-[margin] duration-300 lg:pb-8 ${isDesktopSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </AdminNotificationCenterProvider>;
}
function ProtectedRouteWithPermission({
  children,
  requiredPermission
}) {
  const {
    isAuthenticated,
    loading,
    hasAnyPermission,
    hasPermission
  } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }
  if (!isAuthenticated) {
    return <Navigate to={buildAdminPath("/login")} replace />;
  }
  const hasRequiredPermission = Array.isArray(requiredPermission) ? hasAnyPermission(...requiredPermission) : requiredPermission ? hasPermission(requiredPermission) : true;
  if (!hasRequiredPermission) {
    return <Navigate to={buildAdminPath("/unauthorized")} replace />;
  }
  return children;
}
function AdminContent() {
  const {
    isAuthenticated,
    user
  } = useAuth();
  const defaultAuthedPath = resolveAdminHomePath(user?.role);
  return <div className="admin-scope">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {!isAuthenticated ? <>
              <Route path="login" element={<AdminLogin />} />
              <Route path="tenant-registration" element={<TenantRegistration />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password/:token" element={<ResetPassword />} />
            </> : null}

          <Route element={<ProtectedRoute />}>
            <Route path="force-password-update" element={<ForcePasswordUpdate />} />
            <Route path="unauthorized" element={<AccessDenied />} />

            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<ProtectedRouteWithPermission requiredPermission="view_dashboard">
                    <Dashboard />
                  </ProtectedRouteWithPermission>} />
              <Route path="tenant-management" element={<ProtectedRouteWithPermission>
                    <TenantManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="tenant-management/:tenantId" element={<ProtectedRouteWithPermission>
                    <TenantOverview />
                  </ProtectedRouteWithPermission>} />
              <Route path="support" element={<ProtectedRouteWithPermission>
                    <ContactSuperAdmin />
                  </ProtectedRouteWithPermission>} />
              <Route path="analytics" element={<ProtectedRouteWithPermission requiredPermission="view_statistics">
                    <Analytics />
                  </ProtectedRouteWithPermission>} />
              <Route path="orders" element={<ProtectedRouteWithPermission requiredPermission="order_view_all">
                    <Orders />
                  </ProtectedRouteWithPermission>} />
              <Route path="kitchen" element={<Navigate to={buildAdminPath("/kitchen/dashboard")} replace />} />
              <Route path="kitchen/dashboard" element={<ProtectedRouteWithPermission requiredPermission="kitchen_view_dashboard">
                    <KitchenDisplay />
                  </ProtectedRouteWithPermission>} />
              <Route path="kitchen/stations" element={<ProtectedRouteWithPermission requiredPermission="kitchen_manage_stations">
                    <KitchenStationManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="staff" element={<ProtectedRouteWithPermission requiredPermission="user_view_all">
                    <StaffManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="menu" element={<Navigate to={buildAdminPath("/menu/items")} replace />} />
              <Route path="menu/items" element={<ProtectedRouteWithPermission requiredPermission="menu_view_all">
                    <MenuManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="inventory" element={<ProtectedRouteWithPermission requiredPermission="inventory_view_all">
                    <InventoryManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="menu/categories" element={<ProtectedRouteWithPermission requiredPermission={["menu_view_all", "menu_create", "menu_edit", "menu_delete", "category_toggle_status"]}>
                    <CategoryManager />
                  </ProtectedRouteWithPermission>} />
              <Route path="menu/sizes" element={<ProtectedRouteWithPermission requiredPermission={["menu_view_all", "menu_edit"]}>
                    <SizeManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="menu/discounts" element={<ProtectedRouteWithPermission requiredPermission="menu_edit">
                    <DiscountManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="menu/seasonal" element={<ProtectedRouteWithPermission requiredPermission={["menu_view_all", "menu_create", "menu_edit", "menu_delete", "menu_toggle_availability"]}>
                    <SeasonalMenu />
                  </ProtectedRouteWithPermission>} />
              <Route path="menu/bulk" element={<ProtectedRouteWithPermission requiredPermission="menu_bulk_operations">
                    <BulkOperations />
                  </ProtectedRouteWithPermission>} />
              <Route path="menu/prices" element={<ProtectedRouteWithPermission requiredPermission="price_stats">
                    <PriceHistory />
                  </ProtectedRouteWithPermission>} />
              <Route path="menu/import-export" element={<ProtectedRouteWithPermission requiredPermission="menu_import_export">
                    <ImportExport />
                  </ProtectedRouteWithPermission>} />
              <Route path="tables" element={<Navigate to={buildAdminPath("/tables/list")} replace />} />
              <Route path="tables/list" element={<ProtectedRouteWithPermission requiredPermission="table_view_all">
                    <TableManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="tables/qr" element={<ProtectedRouteWithPermission requiredPermission="table_edit">
                    <TableQrManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="waiter-calls" element={<ProtectedRouteWithPermission requiredPermission="waiter_call_view_all">
                    <WaiterCalls />
                  </ProtectedRouteWithPermission>} />
              <Route path="feedback" element={<ProtectedRouteWithPermission requiredPermission="feedback_view_all">
                    <FeedbackManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="customers" element={<Navigate to={buildAdminPath("/customers/sessions")} replace />} />
              <Route path="customers/sessions" element={<ProtectedRouteWithPermission requiredPermission="session_view_all">
                    <CustomerSessions />
                  </ProtectedRouteWithPermission>} />
              <Route path="customers/bills" element={<ProtectedRouteWithPermission requiredPermission="session_view_all">
                    <BillManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="customers/feedback" element={<ProtectedRouteWithPermission requiredPermission="feedback_view_all">
                    <FeedbackManagement />
                  </ProtectedRouteWithPermission>} />
              <Route path="customers/waiter-calls" element={<ProtectedRouteWithPermission requiredPermission="waiter_call_view_all">
                    <WaiterCalls />
                  </ProtectedRouteWithPermission>} />
              <Route path="settings" element={<Navigate to={buildAdminPath("/settings/restaurant")} replace />} />
              <Route path="profile" element={<ProtectedRouteWithPermission>
                    <Settings />
                  </ProtectedRouteWithPermission>} />
              <Route path="settings/restaurant" element={<ProtectedRouteWithPermission requiredPermission="system_settings">
                    <Settings />
                  </ProtectedRouteWithPermission>} />
              <Route path="settings/notifications" element={<ProtectedRouteWithPermission requiredPermission="system_settings">
                    <NotificationSettings />
                  </ProtectedRouteWithPermission>} />
              <Route path="settings/backup" element={<ProtectedRouteWithPermission requiredPermission="backup_restore">
                    <BackupManagement />
                  </ProtectedRouteWithPermission>} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to={isAuthenticated ? defaultAuthedPath : buildAdminPath("/login")} replace />} />

          {isAuthenticated ? <Route path="*" element={<Navigate to={defaultAuthedPath} replace />} /> : <Route path="*" element={<Navigate to={buildAdminPath("/login")} replace />} />}
        </Routes>
      </Suspense>
    </div>;
}
export function AdminApp() {
  return <AdminContent />;
}
