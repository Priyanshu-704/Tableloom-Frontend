import React, { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "../common/context/AuthContext";
import {
  buildAdminPath,
  buildPlatformAdminPath,
} from "../common/utils/routes";
import ProtectedRoute from "./components/ProtectedRoute";
import { AdminHeader } from "./components/layout/AdminHeader";
import { Sidebar } from "./components/layout/Sidebar";
import { SkeletonBlock } from "./components/common/AdminSkeleton";
import { AdminNotificationCenterProvider } from "./context/AdminNotificationCenterContext";
import { AdminNotificationDrawer } from "./components/notifications/AdminNotificationDrawer";
import {
  ACCESS_GROUPS,
  hasAccessRequirement,
  resolveAccessibleAdminHomePath,
} from "./utils/accessControl";
const AdminLogin = lazy(() =>
  import("./pages/AdminLogin").then((m) => ({
    default: m.AdminLogin,
  })),
);
const ForgotPassword = lazy(() =>
  import("./pages/ForgotPassword").then((m) => ({
    default: m.ForgotPassword,
  })),
);
const ResetPassword = lazy(() =>
  import("./pages/ResetPassword").then((m) => ({
    default: m.ResetPassword,
  })),
);
const ForcePasswordUpdate = lazy(() =>
  import("./pages/ForcePasswordUpdate").then((m) => ({
    default: m.ForcePasswordUpdate,
  })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({
    default: m.Dashboard,
  })),
);
const Analytics = lazy(() =>
  import("./pages/Analytics").then((m) => ({
    default: m.Analytics,
  })),
);
const Orders = lazy(() =>
  import("./pages/Orders").then((m) => ({
    default: m.Orders,
  })),
);
const KitchenDisplay = lazy(() => import("./components/orders/KitchenDisplay"));
const KitchenStationManagement = lazy(() =>
  import("./pages/KitchenStationManagement").then((m) => ({
    default: m.KitchenStationManagement,
  })),
);
const StaffManagement = lazy(() =>
  import("./pages/StaffManagement").then((m) => ({
    default: m.StaffManagement,
  })),
);
const MenuManagement = lazy(() =>
  import("./pages/MenuManagement").then((m) => ({
    default: m.MenuManagement,
  })),
);
const InventoryManagement = lazy(() =>
  import("./pages/InventoryManagement").then((m) => ({
    default: m.InventoryManagement,
  })),
);
const InventoryUploadResults = lazy(() =>
  import("./pages/InventoryUploadResults").then((m) => ({
    default: m.InventoryUploadResults,
  })),
);
const CategoryManager = lazy(() =>
  import("./components/menu/CategoryManager").then((m) => ({
    default: m.CategoryManager,
  })),
);
const SizeManagement = lazy(() =>
  import("./pages/SizeManagement").then((m) => ({
    default: m.SizeManagement,
  })),
);
const SeasonalMenu = lazy(() =>
  import("./components/menu/SeasonalMenu").then((m) => ({
    default: m.SeasonalMenu,
  })),
);
const DiscountManagement = lazy(() =>
  import("./pages/DiscountManagement").then((m) => ({
    default: m.DiscountManagement,
  })),
);
const BulkOperations = lazy(() =>
  import("./components/menu/BulkOperations").then((m) => ({
    default: m.BulkOperations,
  })),
);
const PriceHistory = lazy(() =>
  import("./components/menu/PriceHistory").then((m) => ({
    default: m.PriceHistory,
  })),
);
const ImportExportPage = lazy(() => import("./components/menu/ImportExport"));
const TableManagement = lazy(() =>
  import("./pages/TableManagement").then((m) => ({
    default: m.TableManagement,
  })),
);
const TableQrManagement = lazy(() =>
  import("./pages/TableQrManagement").then((m) => ({
    default: m.TableQrManagement,
  })),
);
const CustomerSessions = lazy(() =>
  import("./pages/CustomerSessions").then((m) => ({
    default: m.CustomerSessions,
  })),
);
const BillManagement = lazy(() =>
  import("./pages/BillManagement").then((m) => ({
    default: m.BillManagement,
  })),
);
const FeedbackManagement = lazy(() =>
  import("./pages/FeedbackManagement").then((m) => ({
    default: m.FeedbackManagement,
  })),
);
const WaiterCalls = lazy(() =>
  import("./pages/WaiterCalls").then((m) => ({
    default: m.WaiterCalls,
  })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((m) => ({
    default: m.Settings,
  })),
);
const NotificationSettings = lazy(() =>
  import("./pages/NotificationSettings").then((m) => ({
    default: m.NotificationSettings,
  })),
);
const Notifications = lazy(() =>
  import("./pages/Notifications").then((m) => ({
    default: m.Notifications,
  })),
);
const BackupManagement = lazy(() =>
  import("./pages/BackupManagement").then((m) => ({
    default: m.BackupManagement,
  })),
);
const AccessDenied = lazy(() =>
  import("./pages/AccessDenied").then((m) => ({
    default: m.AccessDenied,
  })),
);
const TenantManagement = lazy(() =>
  import("./pages/TenantManagement").then((m) => ({
    default: m.TenantManagement,
  })),
);
const TenantOverview = lazy(() =>
  import("./pages/TenantOverview").then((m) => ({
    default: m.TenantOverview,
  })),
);
const TenantRegistration = lazy(() =>
  import("./pages/TenantRegistration").then((m) => ({
    default: m.TenantRegistration,
  })),
);
const ContactSuperAdmin = lazy(() =>
  import("./pages/ContactSuperAdmin").then((m) => ({
    default: m.ContactSuperAdmin,
  })),
);
const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-50 p-6">
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
              length: 8,
            }).map((_, index) => (
              <SkeletonBlock
                key={`app-nav-skeleton-${index}`}
                className="h-10 w-full rounded-xl"
              />
            ))}
          </div>
        </div>
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-9">
          <div className="space-y-4">
            <SkeletonBlock className="h-8 w-56" />
            <SkeletonBlock className="h-4 w-72" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <SkeletonBlock
                  key={`app-content-skeleton-${index}`}
                  className="h-40 w-full rounded-2xl"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(
    () => {
      if (typeof window === "undefined") {
        return false;
      }
      return window.localStorage.getItem("admin.sidebar.collapsed") === "true";
    },
  );
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      "admin.sidebar.collapsed",
      String(isDesktopSidebarCollapsed),
    );
  }, [isDesktopSidebarCollapsed]);
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() =>
          setIsMobileSidebarOpen((current) => !current)
        }
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        onToggleDesktopSidebar={() =>
          setIsDesktopSidebarCollapsed((current) => !current)
        }
      />
      <div className="flex">
        <Sidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
          isDesktopCollapsed={isDesktopSidebarCollapsed}
        />
        <AdminNotificationDrawer />
        <main
          className={`mt-24 min-w-0 flex-1 pb-6 transition-[margin] duration-300 lg:pb-8 ${isDesktopSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
function ProtectedRouteWithPermission({
  children,
  requiredPermission,
  allowedRoles,
}) {
  const { isAuthenticated, loading, permissions, user } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }
  if (!isAuthenticated) {
    return <Navigate to={buildAdminPath("/login")} replace />;
  }
  const requiredPermissions = Array.isArray(requiredPermission)
    ? requiredPermission
    : requiredPermission
      ? [requiredPermission]
      : [];
  const hasRequiredPermission = hasAccessRequirement({
    role: user?.role,
    permissions,
    allowedRoles,
    requiredPermissions,
  });
  if (!hasRequiredPermission) {
    return <Navigate to={buildAdminPath("/unauthorized")} replace />;
  }
  return children;
}
function AdminContent() {
  const { isAuthenticated, permissions, user } = useAuth();
  const defaultAuthedPath = resolveAccessibleAdminHomePath(user, permissions);
  return (
    <div className="admin-scope">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="login" element={<AdminLogin />} />
              <Route
                path="tenant-registration"
                element={<TenantRegistration />}
              />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password/:token" element={<ResetPassword />} />
            </>
          ) : null}

          <Route element={<ProtectedRoute />}>
            <Route
              path="force-password-update"
              element={<ForcePasswordUpdate />}
            />
            <Route path="unauthorized" element={<AccessDenied />} />

            <Route element={<AdminLayout />}>
              <Route
                path="dashboard"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                  >
                    <Dashboard />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="tenant-management"
                element={
                  <ProtectedRouteWithPermission allowedRoles={["super_admin"]}>
                    <TenantManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="admin-requests"
                element={
                  <Navigate
                    to={buildPlatformAdminPath(
                      "/tenant-management?tab=requests",
                    )}
                    replace
                  />
                }
              />
              <Route
                path="tenant-management/:tenantId"
                element={
                  <ProtectedRouteWithPermission allowedRoles={["super_admin"]}>
                    <TenantOverview />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="support"
                element={
                  <ProtectedRouteWithPermission allowedRoles={["admin"]}>
                    <ContactSuperAdmin />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="analytics"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.analytics}
                  >
                    <Analytics />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="orders"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={[
                      "waiter",
                      "chef",
                      "manager",
                      "admin",
                      "super_admin",
                    ]}
                    requiredPermission={ACCESS_GROUPS.orders}
                  >
                    <Orders />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="kitchen"
                element={
                  <Navigate to={buildAdminPath("/kitchen/dashboard")} replace />
                }
              />
              <Route
                path="kitchen/dashboard"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["chef", "manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.kitchenDashboard}
                  >
                    <KitchenDisplay />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="kitchen/stations"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["chef", "manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.kitchenStations}
                  >
                    <KitchenStationManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="staff"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.staff}
                  >
                    <StaffManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="menu"
                element={
                  <Navigate to={buildAdminPath("/menu/items")} replace />
                }
              />
              <Route
                path="menu/items"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["chef", "manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.menu}
                  >
                    <MenuManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="inventory"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["chef", "manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.inventory}
                  >
                    <InventoryManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="inventory/upload-results"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.inventory}
                  >
                    <InventoryUploadResults />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="menu/categories"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.categories}
                  >
                    <CategoryManager />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="menu/sizes"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.sizes}
                  >
                    <SizeManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="menu/discounts"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.discounts}
                  >
                    <DiscountManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="menu/seasonal"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.seasonal}
                  >
                    <SeasonalMenu />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="menu/bulk"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.menuBulk}
                  >
                    <BulkOperations />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="menu/prices"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.priceHistory}
                  >
                    <PriceHistory />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="menu/import-export"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin"]}
                    requiredPermission={ACCESS_GROUPS.menuImportExport}
                  >
                    <ImportExportPage />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="tables"
                element={
                  <Navigate to={buildAdminPath("/tables/list")} replace />
                }
              />
              <Route
                path="tables/list"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["waiter", "chef", "manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.tables}
                  >
                    <TableManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="tables/qr"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.tableQr}
                  >
                    <TableQrManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="waiter-calls"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["waiter", "manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.waiterCalls}
                  >
                    <WaiterCalls />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="notifications"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["waiter", "chef", "manager", "admin"]}
                    requiredPermission={ACCESS_GROUPS.notifications}
                  >
                    <Notifications />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="feedback"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.feedback}
                  >
                    <FeedbackManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="customers"
                element={
                  <Navigate
                    to={buildAdminPath("/customers/sessions")}
                    replace
                  />
                }
              />
              <Route
                path="customers/sessions"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["waiter", "manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.sessions}
                  >
                    <CustomerSessions />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="customers/bills"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.bills}
                  >
                    <BillManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="customers/feedback"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.feedback}
                  >
                    <FeedbackManagement />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="customers/waiter-calls"
                element={<Navigate to={buildAdminPath("/waiter-calls")} replace />}
              />
              <Route
                path="settings"
                element={
                  <Navigate
                    to={buildAdminPath("/settings/restaurant")}
                    replace
                  />
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedRouteWithPermission>
                    <Settings />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="settings/restaurant"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin", "super_admin"]}
                    requiredPermission={ACCESS_GROUPS.settings}
                  >
                    <Settings />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="settings/notifications"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin"]}
                    requiredPermission={ACCESS_GROUPS.settings}
                  >
                    <NotificationSettings />
                  </ProtectedRouteWithPermission>
                }
              />
              <Route
                path="settings/backup"
                element={
                  <ProtectedRouteWithPermission
                    allowedRoles={["manager", "admin"]}
                    requiredPermission={ACCESS_GROUPS.backup}
                  >
                    <BackupManagement />
                  </ProtectedRouteWithPermission>
                }
              />
            </Route>
          </Route>

          <Route
            path="/"
            element={
              <Navigate
                to={
                  isAuthenticated ? defaultAuthedPath : buildAdminPath("/login")
                }
                replace
              />
            }
          />

          {isAuthenticated ? (
            <Route
              path="*"
              element={<Navigate to={defaultAuthedPath} replace />}
            />
          ) : (
            <Route
              path="*"
              element={<Navigate to={buildAdminPath("/login")} replace />}
            />
          )}
        </Routes>
      </Suspense>
    </div>
  );
}
export function AdminApp() {
  return (
    <AdminNotificationCenterProvider>
      <AdminContent />
    </AdminNotificationCenterProvider>
  );
}
