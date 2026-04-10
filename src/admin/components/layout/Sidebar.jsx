import React, { useEffect, useMemo } from "react";
import { LayoutDashboard, BarChart3, ClipboardList, ChefHat, CookingPot, Users, List, Tags, Ruler, TrendingUp, Percent, RefreshCw, Boxes, Download, Table, QrCode, MessageSquareText, ConciergeBell, Bell, DatabaseBackup, Settings, Utensils, Receipt, Building2, LifeBuoy, Shield } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../../common/context/AuthContext";
import { useSettings } from "../../../common/context/SettingsContext";
import { buildAdminPath, buildPlatformAdminPath, isSuperAdminMonitoringPath } from "../../../common/utils/routes";
const normalizePermission = permission => String(permission || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
const hasFullAdminAccess = role => ["super_admin", "admin"].includes(String(role || "").toLowerCase());
const navigationSections = [{
  id: "platform",
  title: "Platform",
  items: [{
    id: "tenant-management",
    label: "Tenant Management",
    description: "Tenants, verification, oversight",
    icon: Building2,
    path: buildPlatformAdminPath("/tenant-management"),
    roles: ["super_admin"]
  }, {
    id: "admin-requests",
    label: "Admin Requests",
    description: "Approve and respond to requests",
    icon: Shield,
    path: buildPlatformAdminPath("/admin-requests"),
    roles: ["super_admin"]
  }]
}, {
  id: "overview",
  title: "Overview",
  items: [{
    id: "dashboard",
    label: "Dashboard",
    description: "Live business snapshot",
    icon: LayoutDashboard,
    path: buildAdminPath("/dashboard"),
    requiredPermission: "view_dashboard"
  }, {
    id: "analytics",
    label: "Analytics",
    description: "Performance and trends",
    icon: BarChart3,
    path: buildAdminPath("/analytics"),
    requiredPermission: "view_statistics"
  }]
}, {
  id: "operations",
  title: "Operations",
  items: [{
    id: "orders",
    label: "Orders",
    description: "Track live order workflow",
    icon: ClipboardList,
    path: buildAdminPath("/orders"),
    requiredPermission: "order_view_all"
  }, {
    id: "kitchen-dashboard",
    label: "Kitchen Dashboard",
    description: "Orders and kitchen flow",
    icon: ChefHat,
    path: buildAdminPath("/kitchen/dashboard"),
    requiredPermission: "kitchen_view_dashboard"
  }, {
    id: "kitchen-stations",
    label: "Kitchen Stations",
    description: "Manage station setup",
    icon: CookingPot,
    path: buildAdminPath("/kitchen/stations"),
    requiredPermission: "kitchen_manage_stations"
  }, {
    id: "staff",
    label: "Staff Management",
    description: "Roles, accounts, access",
    icon: Users,
    path: buildAdminPath("/staff"),
    requiredPermission: "user_view_all"
  }]
}, {
  id: "catalog",
  title: "Menu & Tables",
  items: [{
    id: "menu-items",
    label: "Menu Items",
    description: "Products and availability",
    icon: List,
    path: buildAdminPath("/menu/items"),
    requiredPermission: ["menu_view_all", "menu_create", "menu_edit", "menu_delete", "menu_toggle_availability"]
  }, {
    id: "menu-categories",
    label: "Categories",
    description: "Organize menu structure",
    icon: Tags,
    path: buildAdminPath("/menu/categories"),
    requiredPermission: ["menu_view_all", "menu_create", "menu_edit", "menu_delete", "category_toggle_status"]
  }, {
    id: "menu-sizes",
    label: "Sizes",
    description: "Portions and pricing units",
    icon: Ruler,
    path: buildAdminPath("/menu/sizes"),
    requiredPermission: ["menu_view_all", "menu_edit"]
  }, {
    id: "menu-discounts",
    label: "Discounts",
    description: "Coupons and item offers",
    icon: Percent,
    path: buildAdminPath("/menu/discounts"),
    requiredPermission: "menu_edit"
  }, {
    id: "menu-seasonal",
    label: "Seasonal Menu",
    description: "Featured and limited items",
    icon: TrendingUp,
    path: buildAdminPath("/menu/seasonal"),
    requiredPermission: ["menu_view_all", "menu_create", "menu_edit", "menu_delete", "menu_toggle_availability"]
  }, {
    id: "menu-prices",
    label: "Price History",
    description: "Pricing trends and changes",
    icon: TrendingUp,
    path: buildAdminPath("/menu/prices"),
    requiredPermission: "price_stats"
  }, {
    id: "menu-bulk",
    label: "Bulk Operations",
    description: "Batch updates and actions",
    icon: RefreshCw,
    path: buildAdminPath("/menu/bulk"),
    requiredPermission: "menu_bulk_operations"
  }, {
    id: "menu-import-export",
    label: "Import / Export",
    description: "Move menu data safely",
    icon: Download,
    path: buildAdminPath("/menu/import-export"),
    requiredPermission: "menu_import_export"
  }, {
    id: "inventory",
    label: "Inventory",
    description: "Stock levels and replenishment",
    icon: Boxes,
    path: buildAdminPath("/inventory"),
    requiredPermission: "inventory_view_all"
  }, {
    id: "tables-list",
    label: "Table List",
    description: "Dining tables and status",
    icon: Table,
    path: buildAdminPath("/tables/list"),
    requiredPermission: "table_view_all"
  }, {
    id: "tables-qr",
    label: "QR Update",
    description: "Table QR management",
    icon: QrCode,
    path: buildAdminPath("/tables/qr"),
    requiredPermission: "table_edit"
  }]
}, {
  id: "customer",
  title: "Customer",
  items: [{
    id: "customer-sessions",
    label: "Customer Sessions",
    description: "Track active dining sessions",
    icon: Users,
    path: buildAdminPath("/customers/sessions"),
    requiredPermission: "session_view_all"
  }, {
    id: "customer-bills",
    label: "Bill Management",
    description: "Bills, payments, and PDFs",
    icon: Receipt,
    path: buildAdminPath("/customers/bills"),
    requiredPermission: "session_view_all"
  }, {
    id: "customer-feedback",
    label: "Feedback",
    description: "Reviews and customer input",
    icon: MessageSquareText,
    path: buildAdminPath("/customers/feedback"),
    requiredPermission: "feedback_view_all"
  }, {
    id: "customer-waiter-calls",
    label: "Waiter Calls",
    description: "Live service requests",
    icon: ConciergeBell,
    path: buildAdminPath("/customers/waiter-calls"),
    requiredPermission: "waiter_call_view_all"
  }]
}, {
  id: "system",
  title: "System",
  items: [{
    id: "support",
    label: "Contact Super Admin",
    description: "Tenant and platform help",
    icon: LifeBuoy,
    path: buildAdminPath("/support"),
    roles: ["admin"]
  }, {
    id: "settings-restaurant",
    label: "Restaurant Settings",
    description: "Business identity and defaults",
    icon: Utensils,
    path: buildAdminPath("/settings/restaurant"),
    requiredPermission: "system_settings"
  }, {
    id: "settings-notifications",
    label: "Notification Settings",
    description: "Alerts and notification rules",
    icon: Bell,
    path: buildAdminPath("/settings/notifications"),
    requiredPermission: "system_settings"
  }, {
    id: "settings-backup",
    label: "Backup",
    description: "Export and safeguard data",
    icon: DatabaseBackup,
    path: buildAdminPath("/settings/backup"),
    requiredPermission: "backup_restore"
  }]
}];
export function Sidebar({
  isMobileSidebarOpen = false,
  onCloseMobileSidebar,
  isDesktopCollapsed = false
}) {
  const {
    dispatch
  } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    permissions
  } = useAuth();
  const {
    settings
  } = useSettings();
  const isMonitoringMode = isSuperAdminMonitoringPath(location.pathname, user?.role);
  const visibleSections = useMemo(() => {
    if (!user) {
      return [];
    }
    return navigationSections.map(section => {
      const items = section.items.filter(item => {
        if (Array.isArray(item.roles) && !item.roles.includes(user.role)) {
          return false;
        }
        if (user.role === "super_admin" && !isMonitoringMode && !item.roles?.includes("super_admin")) {
          return false;
        }
        if (hasFullAdminAccess(user.role) || !item.requiredPermission) {
          return true;
        }
        const requiredPermissions = Array.isArray(item.requiredPermission) ? item.requiredPermission : [item.requiredPermission];
        return requiredPermissions.some(requiredPermission => (permissions || []).some(permission => normalizePermission(permission) === normalizePermission(requiredPermission)));
      });
      return {
        ...section,
        items
      };
    }).filter(section => section.items.length > 0);
  }, [isMonitoringMode, permissions, user]);
  const handleNavigation = item => {
    dispatch({
      type: "SET_CURRENT_VIEW",
      payload: item.id
    });
    navigate(item.path);
    onCloseMobileSidebar?.();
  };
  const isActive = item => {
    const [pathname] = String(item.path || "").split("?");
    return location.pathname === pathname;
  };
  useEffect(() => {
    onCloseMobileSidebar?.();
  }, [location.pathname]);
  const renderNavigation = ({
    compact = false
  } = {}) => <div className={`pb-10 ${compact ? "space-y-4" : "space-y-6"}`}>
      <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
        <div className={`flex items-center ${compact ? "justify-center" : "gap-3"}`}>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            <img src={settings?.restaurant?.logoThumbnail || settings?.restaurant?.logo || "/tableloom-mark.svg"} alt={settings?.restaurant?.name || "Tableloom"} className="h-8 w-8 object-contain" loading="lazy" />
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
        {visibleSections.map(section => <div key={section.id}>
          {compact ? <div className="mb-3 px-2" title={section.title}>
              <div className="h-px rounded-full bg-slate-200"></div>
            </div> : <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {section.title}
            </p>}

          <div className={`space-y-2 rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? "p-2" : "p-2.5"}`}>
            {section.items.map(item => {
            const Icon = item.icon;
            const active = isActive(item);
            return <button key={item.id} type="button" onClick={() => handleNavigation(item)} className={`flex w-full rounded-2xl text-left transition-all ${compact ? "justify-center px-2 py-2.5" : "items-center gap-3 px-3 py-3"} ${active ? "bg-primary-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"}`} title={compact ? item.label : undefined} aria-label={item.label}>
                  <div className={`flex flex-shrink-0 items-center justify-center rounded-2xl ${compact ? "h-12 w-12" : "h-11 w-11"} ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className={`min-w-0 ${compact ? "hidden" : ""}`}>
                    <p className="truncate text-sm font-semibold">
                      {item.label}
                    </p>
                    <p className={`truncate text-xs ${active ? "text-white/75" : "text-slate-400"}`}>
                      {item.description}
                    </p>
                  </div>
                </button>;
          })}
          </div>
        </div>)}
      </nav>
    </div>;
  if (!visibleSections.length) {
    return <aside className={`fixed left-0 top-16 bottom-0 z-40 hidden border-r border-slate-200 bg-slate-50/95 transition-[width] duration-300 lg:block ${isDesktopCollapsed ? "w-24" : "w-72"}`}>
        <div className="flex h-full flex-col">
          <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain transition-[padding] duration-300 ${isDesktopCollapsed ? "px-3 py-4" : "px-5 py-6"}`}>
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center">
              <Settings className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className={`font-medium text-slate-500 ${isDesktopCollapsed ? "text-xs" : "text-sm"}`}>
                No navigation available
              </p>
              <p className={`mt-1 text-slate-400 ${isDesktopCollapsed ? "hidden" : "text-xs"}`}>
                Contact the administrator for permissions.
              </p>
            </div>
          </div>
        </div>
      </aside>;
  }
  return <>
      <div className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity lg:hidden ${isMobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => onCloseMobileSidebar?.()} />

      <aside className={`fixed left-0 top-16 bottom-0 z-50 w-[min(90vw,21rem)] border-r border-slate-200 bg-slate-50/98 shadow-xl transition-transform lg:hidden ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 sm:py-5">
            {renderNavigation({
            compact: false
          })}
          </div>
        </div>
      </aside>

      <aside className={`fixed left-0 top-16 bottom-0 z-40 hidden border-r border-slate-200 bg-slate-50/95 transition-[width] duration-300 lg:block ${isDesktopCollapsed ? "w-24" : "w-72"}`}>
        <div className="flex h-full flex-col">
          <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain transition-[padding] duration-300 ${isDesktopCollapsed ? "px-3 py-4" : "px-5 py-6"}`}>
            {renderNavigation({
            compact: isDesktopCollapsed
          })}
          </div>
        </div>
      </aside>
    </>;
}
