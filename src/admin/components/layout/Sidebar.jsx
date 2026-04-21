/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  ChefHat,
  CookingPot,
  Users,
  List,
  Tags,
  Ruler,
  TrendingUp,
  Percent,
  RefreshCw,
  Boxes,
  Download,
  Table,
  QrCode,
  MessageSquareText,
  ConciergeBell,
  Bell,
  DatabaseBackup,
  Settings,
  Utensils,
  Receipt,
  Building2,
  LifeBuoy,
  Shield,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../../common/context/AuthContext";
import { useSettings } from "../../../common/context/SettingsContext";
import {
  buildAdminPath,
  buildPlatformAdminPath,
  isSuperAdminMonitoringPath,
} from "../../../common/utils/routes";
import {
  ACCESS_GROUPS,
  hasAccessRequirement,
} from "../../utils/accessControl";
const isTenantManagementTabActive = (location, tab) => {
  if (location.pathname !== buildPlatformAdminPath("/tenant-management")) {
    return false;
  }
  const activeTab = new URLSearchParams(location.search).get("tab");
  return tab === "requests"
    ? activeTab === "requests"
    : activeTab !== "requests";
};
const navigationSections = [
  {
    id: "platform",
    title: "Platform",
    items: [
      {
        id: "tenant-management",
        label: "Tenant Management",
        description: "Tenants, verification, oversight",
        icon: Building2,
        path: buildPlatformAdminPath("/tenant-management"),
        isActive: (location) =>
          isTenantManagementTabActive(location, "tenants"),
        roles: ["super_admin"],
      },
      {
        id: "admin-requests",
        label: "Admin Requests",
        description: "Approve and respond to requests",
        icon: Shield,
        path: buildPlatformAdminPath("/tenant-management?tab=requests"),
        isActive: (location) =>
          isTenantManagementTabActive(location, "requests"),
        roles: ["super_admin"],
      },
    ],
  },
  {
    id: "overview",
    title: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        description: "Live business snapshot",
        icon: LayoutDashboard,
        path: buildAdminPath("/dashboard"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.dashboard,
      },
      {
        id: "analytics",
        label: "Analytics",
        description: "Performance and trends",
        icon: BarChart3,
        path: buildAdminPath("/analytics"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.analytics,
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      {
        id: "orders",
        label: "Orders",
        description: "Track live order workflow",
        icon: ClipboardList,
        path: buildAdminPath("/orders"),
        allowedRoles: ["waiter", "chef", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.orders,
      },
      {
        id: "kitchen-dashboard",
        label: "Kitchen Dashboard",
        description: "Orders and kitchen flow",
        icon: ChefHat,
        path: buildAdminPath("/kitchen/dashboard"),
        allowedRoles: ["chef", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.kitchenDashboard,
      },
      {
        id: "kitchen-stations",
        label: "Kitchen Stations",
        description: "Manage station setup",
        icon: CookingPot,
        path: buildAdminPath("/kitchen/stations"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.kitchenStations,
      },
      {
        id: "staff",
        label: "Staff Management",
        description: "Roles, accounts, access",
        icon: Users,
        path: buildAdminPath("/staff"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.staff,
      },
    ],
  },
  {
    id: "catalog",
    title: "Menu & Tables",
    items: [
      {
        id: "menu-items",
        label: "Menu Items",
        description: "Products and availability",
        icon: List,
        path: buildAdminPath("/menu/items"),
        allowedRoles: ["chef", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.menu,
      },
      {
        id: "menu-categories",
        label: "Categories",
        description: "Organize menu structure",
        icon: Tags,
        path: buildAdminPath("/menu/categories"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.categories,
      },
      {
        id: "menu-sizes",
        label: "Sizes",
        description: "Portions and pricing units",
        icon: Ruler,
        path: buildAdminPath("/menu/sizes"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.sizes,
      },
      {
        id: "menu-discounts",
        label: "Discounts",
        description: "Coupons and item offers",
        icon: Percent,
        path: buildAdminPath("/menu/discounts"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.discounts,
      },
      {
        id: "menu-seasonal",
        label: "Seasonal Menu",
        description: "Featured and limited items",
        icon: TrendingUp,
        path: buildAdminPath("/menu/seasonal"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.seasonal,
      },
      {
        id: "menu-prices",
        label: "Price History",
        description: "Pricing trends and changes",
        icon: TrendingUp,
        path: buildAdminPath("/menu/prices"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.priceHistory,
      },
      {
        id: "menu-bulk",
        label: "Bulk Operations",
        description: "Batch updates and actions",
        icon: RefreshCw,
        path: buildAdminPath("/menu/bulk"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.menuBulk,
      },
      {
        id: "menu-import-export",
        label: "Import / Export",
        description: "Move menu data safely",
        icon: Download,
        path: buildAdminPath("/menu/import-export"),
        allowedRoles: ["manager", "admin"],
        requiredPermission: ACCESS_GROUPS.menuImportExport,
      },
      {
        id: "inventory",
        label: "Inventory",
        description: "Stock levels and replenishment",
        icon: Boxes,
        path: buildAdminPath("/inventory"),
        allowedRoles: ["chef", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.inventory,
      },
      {
        id: "tables-list",
        label: "Table List",
        description: "Dining tables and status",
        icon: Table,
        path: buildAdminPath("/tables/list"),
        allowedRoles: ["waiter", "chef", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.tables,
      },
      {
        id: "tables-qr",
        label: "QR Update",
        description: "Table QR management",
        icon: QrCode,
        path: buildAdminPath("/tables/qr"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.tableQr,
      },
    ],
  },
  {
    id: "customer",
    title: "Customer",
    items: [
      {
        id: "customer-sessions",
        label: "Customer Sessions",
        description: "Track active dining sessions",
        icon: Users,
        path: buildAdminPath("/customers/sessions"),
        allowedRoles: ["waiter", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.sessions,
      },
      {
        id: "customer-bills",
        label: "Bill Management",
        description: "Bills, payments, and PDFs",
        icon: Receipt,
        path: buildAdminPath("/customers/bills"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.bills,
      },
      {
        id: "customer-feedback",
        label: "Feedback",
        description: "Reviews and customer input",
        icon: MessageSquareText,
        path: buildAdminPath("/customers/feedback"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.feedback,
      },
      {
        id: "customer-waiter-calls",
        label: "Waiter Calls",
        description: "Live service requests",
        icon: ConciergeBell,
        path: buildAdminPath("/customers/waiter-calls"),
        allowedRoles: ["waiter", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.waiterCalls,
      },
    ],
  },
  {
    id: "system",
    title: "System",
    items: [
      {
        id: "support",
        label: "Contact Super Admin",
        description: "Tenant and platform help",
        icon: LifeBuoy,
        path: buildAdminPath("/support"),
        roles: ["admin"],
      },
      {
        id: "settings-restaurant",
        label: "Restaurant Settings",
        description: "Business identity and defaults",
        icon: Utensils,
        path: buildAdminPath("/settings/restaurant"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.settings,
      },
      {
        id: "settings-notifications",
        label: "Notification Settings",
        description: "Alerts and notification rules",
        icon: Bell,
        path: buildAdminPath("/settings/notifications"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.settings,
      },
      {
        id: "settings-backup",
        label: "Backup",
        description: "Export and safeguard data",
        icon: DatabaseBackup,
        path: buildAdminPath("/settings/backup"),
        allowedRoles: ["manager", "admin"],
        requiredPermission: ACCESS_GROUPS.backup,
      },
    ],
  },
];
export function Sidebar({
  isMobileSidebarOpen = false,
  onCloseMobileSidebar,
  isDesktopCollapsed = false,
}) {
  const { dispatch } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions } = useAuth();
  const { settings } = useSettings();
  const isMonitoringMode = isSuperAdminMonitoringPath(
    location.pathname,
    user?.role,
  );
  const visibleSections = useMemo(() => {
    if (!user) {
      return [];
    }
    return navigationSections
      .map((section) => {
        const items = section.items.filter((item) => {
          if (
            Array.isArray(item.roles) &&
            !item.roles.includes(user.role)
          ) {
            return false;
          }
          if (
            user.role === "super_admin" &&
            !isMonitoringMode &&
            !item.roles?.includes("super_admin")
          ) {
            return false;
          }
          return hasAccessRequirement({
            role: user.role,
            permissions,
            allowedRoles: item.allowedRoles,
            requiredPermissions: item.requiredPermission,
          });
        });
        return {
          ...section,
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [isMonitoringMode, permissions, user]);
  const handleNavigation = (item) => {
    dispatch({
      type: "SET_CURRENT_VIEW",
      payload: item.id,
    });
    navigate(item.path);
    onCloseMobileSidebar?.();
  };
  const isActive = (item) => {
    if (typeof item.isActive === "function") {
      return item.isActive(location);
    }
    const [pathname] = String(item.path || "").split("?");
    return location.pathname === pathname;
  };
  useEffect(() => {
    onCloseMobileSidebar?.();
  }, [location.pathname]);
  const renderNavigation = ({ compact = false } = {}) => (
    <div className={`pb-10 ${compact ? "space-y-4" : "space-y-6"}`}>
      <div
        className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}
      >
        <div
          className={`flex items-center ${compact ? "justify-center" : "gap-3"}`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            <img
              src={
                settings?.restaurant?.logoThumbnail ||
                settings?.restaurant?.logo ||
                "/tableloom-mark.svg"
              }
              alt={settings?.restaurant?.name || "Tableloom"}
              className="h-8 w-8 object-contain"
              loading="lazy"
            />
          </div>
          <div className={`min-w-0 ${compact ? "hidden" : ""}`}>
            <p className="truncate text-sm font-bold text-slate-900">
              {settings?.restaurant?.name || "Tableloom"}
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      <nav className={compact ? "space-y-4" : "space-y-6"}>
        {visibleSections.map((section) => (
          <div key={section.id}>
            {compact ? (
              <div className="mb-3 px-2" title={section.title}>
                <div className="h-px rounded-full bg-slate-200"></div>
              </div>
            ) : (
              <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {section.title}
              </p>
            )}

            <div
              className={`space-y-2 rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? "p-2" : "p-2.5"}`}
            >
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigation(item)}
                    className={`flex w-full rounded-2xl text-left transition-all ${compact ? "justify-center px-2 py-2.5" : "items-center gap-3 px-3 py-3"} ${active ? "bg-primary-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}
                    title={compact ? item.label : undefined}
                    aria-label={item.label}
                  >
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-2xl ${compact ? "h-12 w-12" : "h-11 w-11"} ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className={`min-w-0 ${compact ? "hidden" : ""}`}>
                      <p className="truncate text-sm font-semibold">
                        {item.label}
                      </p>
                      <p
                        className={`truncate text-xs ${active ? "text-white/75" : "text-slate-400"}`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
  if (!visibleSections.length) {
    return (
      <aside
        className={`fixed left-0 top-16 bottom-0 z-40 hidden border-r border-slate-200 bg-slate-50/95 transition-[width] duration-300 lg:block ${isDesktopCollapsed ? "w-24" : "w-72"}`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain transition-[padding] duration-300 ${isDesktopCollapsed ? "px-3 py-4" : "px-5 py-6"}`}
          >
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center">
              <Settings className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p
                className={`font-medium text-slate-500 ${isDesktopCollapsed ? "text-xs" : "text-sm"}`}
              >
                No navigation available
              </p>
              <p
                className={`mt-1 text-slate-400 ${isDesktopCollapsed ? "hidden" : "text-xs"}`}
              >
                Contact the administrator for permissions.
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  }
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity lg:hidden ${isMobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => onCloseMobileSidebar?.()}
      />

      <aside
        className={`fixed left-0 top-16 bottom-0 z-50 w-[min(90vw,21rem)] border-r border-slate-200 bg-slate-50/98 shadow-xl transition-transform lg:hidden ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 sm:py-5">
            {renderNavigation({
              compact: false,
            })}
          </div>
        </div>
      </aside>

      <aside
        className={`fixed left-0 top-16 bottom-0 z-40 hidden border-r border-slate-200 bg-slate-50/95 transition-[width] duration-300 lg:block ${isDesktopCollapsed ? "w-24" : "w-72"}`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain transition-[padding] duration-300 ${isDesktopCollapsed ? "px-3 py-4" : "px-5 py-6"}`}
          >
            {renderNavigation({
              compact: isDesktopCollapsed,
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
