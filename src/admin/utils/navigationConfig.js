import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChefHat,
  ClipboardList,
  ConciergeBell,
  CookingPot,
  DatabaseBackup,
  Download,
  LifeBuoy,
  List,
  LayoutDashboard,
  MessageSquareText,
  Percent,
  QrCode,
  Receipt,
  RefreshCw,
  Ruler,
  Settings,
  Shield,
  Table,
  Tags,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";
import {
  buildAdminPath,
  buildPlatformAdminPath,
} from "../../common/utils/routes";
import { ACCESS_GROUPS, hasAccessRequirement } from "./accessControl";

export const superAdminTabs = [
  {
    id: "registered",
    label: "Registered Tenants",
    description: "Active and verified restaurant workspaces",
  },
  {
    id: "pending",
    label: "Pending Approvals",
    description: "Registrations waiting for review or approval",
  },
  {
    id: "requests",
    label: "Admin Requests",
    description: "Review and respond to tenant admin requests",
  },
];

const isTenantManagementTabActive = (location, tab) => {
  if (location.pathname !== buildPlatformAdminPath("/tenant-management")) {
    return false;
  }
  const activeTab = new URLSearchParams(location.search).get("tab");
  if (tab === "registered") {
    return !activeTab;
  }
  return activeTab === tab;
};

export const adminNavigationSections = [
  {
    id: "dashboard-home",
    title: "Dashboard",
    collapsible: false,
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        description: "Live business snapshot",
        icon: LayoutDashboard,
        path: buildAdminPath("/dashboard"),
        allowedRoles: ["manager", "admin", "super_admin"],
      },
    ],
  },
  {
    id: "platform",
    title: "Platform Workspace",
    collapsible: true,
    defaultCollapsed: true,
    items: [
      {
        id: "tenant-management",
        label: "Registered Tenants",
        description: "Tenants, verification, and workspace oversight",
        icon: Building2,
        path: buildPlatformAdminPath("/tenant-management"),
        isActive: (location) =>
          isTenantManagementTabActive(location, "registered"),
        roles: ["super_admin"],
      },
      {
        id: "pending-approvals",
        label: "Pending Approvals",
        description: "Registration reviews waiting for super admin action",
        icon: Shield,
        path: buildPlatformAdminPath("/tenant-management?tab=pending"),
        isActive: (location) =>
          isTenantManagementTabActive(location, "pending"),
        roles: ["super_admin"],
      },
      {
        id: "admin-requests",
        label: "Admin Requests",
        description: "Approve and respond to tenant admin requests",
        icon: Bell,
        path: buildPlatformAdminPath("/tenant-management?tab=requests"),
        isActive: (location) =>
          isTenantManagementTabActive(location, "requests"),
        roles: ["super_admin"],
      },
    ],
  },
  {
    id: "service-hub",
    title: "Service Hub",
    collapsible: true,
    defaultCollapsed: true,
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
        id: "customer-sessions",
        label: "Customer Sessions",
        description: "Track active dining sessions",
        icon: Users,
        path: buildAdminPath("/customers/sessions"),
        allowedRoles: ["waiter", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.sessions,
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
        id: "customer-waiter-calls",
        label: "Waiter Calls",
        description: "Live service requests",
        icon: ConciergeBell,
        path: buildAdminPath("/waiter-calls"),
        allowedRoles: ["waiter", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.waiterCalls,
      },
      {
        id: "customer-bills",
        label: "Bill Management",
        description: "Bills, payments, and PDFs",
        icon: Receipt,
        path: buildAdminPath("/customers/bills"),
        allowedRoles: [
          "waiter",
          "cashier",
          "manager",
          "admin",
          "super_admin",
        ],
        requiredPermission: ACCESS_GROUPS.bills,
      },
    ],
  },
  {
    id: "catalog",
    title: "Menu & Catalog",
    collapsible: true,
    defaultCollapsed: true,
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
        allowedRoles: ["manager", "admin",],
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
    ],
  },
  {
    id: "workspace",
    title: "Workspace",
    collapsible: true,
    defaultCollapsed: true,
    items: [
      {
        id: "analytics",
        label: "Analytics",
        description: "Performance and trends",
        icon: BarChart3,
        path: buildAdminPath("/analytics"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.analytics,
      },
      {
        id: "staff",
        label: "Staff Management",
        description: "Roles, accounts, and access",
        icon: Users,
        path: buildAdminPath("/staff"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.staff,
      },
      {
        id: "kitchen-stations",
        label: "Kitchen Stations",
        description: "Manage station setup",
        icon: CookingPot,
        path: buildAdminPath("/kitchen/stations"),
        allowedRoles: ["chef", "manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.kitchenStations,
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
        id: "notifications",
        label: "Notifications",
        description: "Live alerts and updates",
        icon: Bell,
        path: buildAdminPath("/notifications"),
        allowedRoles: ["waiter", "chef", "manager", "admin"],
        requiredPermission: ACCESS_GROUPS.notifications,
      },
      {
        id: "support",
        label: "Contact Super Admin",
        description: "Tenant and platform help",
        icon: LifeBuoy,
        path: buildAdminPath("/support"),
        roles: ["admin"],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    collapsible: true,
    defaultCollapsed: true,
    items: [
      {
        id: "tables-qr",
        label: "QR Update",
        description: "Table QR management",
        icon: QrCode,
        path: buildAdminPath("/tables/qr"),
        allowedRoles: ["manager", "admin", "super_admin"],
        requiredPermission: ACCESS_GROUPS.tableQr,
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
        allowedRoles: ["manager", "admin"],
        requiredPermission: ACCESS_GROUPS.settings,
      },
      {
        id: "settings-backup",
        label: "Backup",
        description: "Export and safeguard data",
        icon: DatabaseBackup,
        path: buildAdminPath("/settings/backup"),
        allowedRoles: ["admin"],
        requiredPermission: ACCESS_GROUPS.backup,
      },
      {
        id: "settings-platform",
        label: "Platform Settings",
        description: "Configuration and system-wide controls",
        icon: Settings,
        path: buildAdminPath("/settings"),
        allowedRoles: ["manager", "admin", "super_admin"],
        hidden: true,
      },
    ],
  },
];

export const getVisibleAdminNavigationSections = ({
  user,
  permissions,
  isMonitoringMode = false,
} = {}) => {
  if (!user) {
    return [];
  }
  return adminNavigationSections
    .map((section) => {
      const items = section.items.filter((item) => {
        if (item.hidden) {
          return false;
        }
        if (Array.isArray(item.roles) && !item.roles.includes(user.role)) {
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
};

export const isAdminNavigationItemActive = (item, location) => {
  if (typeof item?.isActive === "function") {
    return item.isActive(location);
  }
  const [pathname] = String(item?.path || "").split("?");
  return location.pathname === pathname;
};

export const resolveActiveAdminNavigation = ({
  location,
  sections = [],
} = {}) => {
  for (const section of sections) {
    const activeItem = section.items.find((item) =>
      isAdminNavigationItemActive(item, location),
    );
    if (activeItem) {
      return {
        section,
        item: activeItem,
      };
    }
  }
  if (
    location?.pathname?.startsWith(
      buildPlatformAdminPath("/tenant-management/"),
    )
  ) {
    return {
      section: {
        id: "platform",
        title: "Platform Workspace",
      },
      item: {
        id: "tenant-overview",
        label: "Tenant Overview",
        description: "Workspace profile, billing, and operational summary",
      },
    };
  }
  return {
    section: null,
    item: null,
  };
};
