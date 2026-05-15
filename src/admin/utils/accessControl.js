import {
  buildAdminPath,
  buildPlatformAdminPath,
} from "../../common/utils/routes";

export const normalizePermission = (permission) =>
  String(permission || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/\./g, "_")
    .toLowerCase();

export const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const ACCESS_GROUPS = Object.freeze({
  dashboard: ["view_dashboard"],
  analytics: ["view_statistics"],
  orders: [
    "order_view_all",
    "order_view_own",
    "order_update",
    "order_update_status",
    "order_update_item_status",
    "order_process_payment",
  ],
  kitchenDashboard: [
    "kitchen_view_dashboard",
    "kitchen_accept_order",
    "kitchen_start_preparing",
    "kitchen_mark_ready",
    "kitchen_mark_served",
    "order_update_item_status",
  ],
  kitchenStations: [
    "kitchen.station_view",
    "kitchen.station_create",
    "kitchen.station_edit",
    "kitchen.station_delete",
    "kitchen.station_assign_category",
    "kitchen.station_remove_category",
  ],
  staff: [
    "user_view_all",
    "user_create",
    "user_edit",
    "user_change_status",
    "user_change_role",
    "user_manage_permissions",
  ],
  menu: [
    "menu_view_all",
    "menu_create",
    "menu_edit",
    "menu_delete",
    "menu_toggle_availability",
  ],
  categories: [
    "menu.category_view",
    "menu.category_create",
    "menu.category_edit",
    "menu.category_delete",
    "menu.category_toggle_status",
  ],
  sizes: [
    "menu.size_view",
    "menu.size_create",
    "menu.size_edit",
    "menu.size_toggle_status",
  ],
  discounts: [
    "menu.discount_view",
    "menu.discount_create",
    "menu.discount_edit",
    "menu.discount_toggle_status",
  ],
  seasonal: [
    "menu.seasonal_view",
    "menu.seasonal_create",
    "menu.seasonal_edit",
    "menu.seasonal_toggle_status",
  ],
  priceHistory: ["price_stats", "menu_stats"],
  menuBulk: ["menu_bulk_operations"],
  menuImportExport: ["menu_import_export"],
  inventory: [
    "inventory_view_all",
    "inventory_create",
    "inventory_edit",
    "inventory_delete",
    "inventory_adjust",
    "inventory_statistics",
  ],
  tables: [
    "table_view_all",
    "table_create",
    "table_edit",
    "table_delete",
    "table_update_status",
  ],
  tableQr: [
    "table.qr_view",
    "table.qr_download",
    "table.qr_regenerate",
    "table.qr_refresh_token",
  ],
  sessions: [
    "session_view_all",
    "session_update",
    "session_complete_offline",
    "session_cancel",
  ],
  bills: [
    "session_view_all",
    "session_complete_offline",
    "order_process_payment",
  ],
  feedback: ["feedback_view_all", "feedback_respond", "feedback_statistics"],
  waiterCalls: [
    "waiter_call_view_all",
    "waiter_call_acknowledge",
    "waiter_call_complete",
    "waiter_call_statistics",
  ],
  settings: ["system_settings"],
  notifications: ["notification_view"],
  backup: ["backup_restore"],
});

const HOME_CANDIDATES = [
  {
    path: buildAdminPath("/waiter-calls"),
    allowedRoles: ["waiter"],
    requiredPermissions: ACCESS_GROUPS.waiterCalls,
  },
  {
    path: buildAdminPath("/dashboard"),
    allowedRoles: ["manager", "admin"],
  },
  {
    path: buildAdminPath("/tables/list"),
    allowedRoles: ["waiter", "manager", "admin"],
    requiredPermissions: ACCESS_GROUPS.tables,
  },
  {
    path: buildAdminPath("/kitchen/dashboard"),
    allowedRoles: ["chef", "manager", "admin"],
    requiredPermissions: ACCESS_GROUPS.kitchenDashboard,
  },
  {
    path: buildAdminPath("/orders"),
    allowedRoles: ["waiter", "chef", "manager", "admin"],
    requiredPermissions: ACCESS_GROUPS.orders,
  },
  {
    path: buildAdminPath("/inventory"),
    allowedRoles: ["chef", "manager", "admin"],
    requiredPermissions: ACCESS_GROUPS.inventory,
  },
  {
    path: buildAdminPath("/customers/sessions"),
    allowedRoles: ["waiter", "manager", "admin"],
    requiredPermissions: ACCESS_GROUPS.sessions,
  },
  {
    path: buildAdminPath("/customers/bills"),
    allowedRoles: ["waiter", "cashier", "manager", "admin"],
    requiredPermissions: ACCESS_GROUPS.bills,
  },
  {
    path: buildAdminPath("/waiter-calls"),
    allowedRoles: ["waiter", "manager", "admin"],
    requiredPermissions: ACCESS_GROUPS.waiterCalls,
  },
];

const ROLE_HOME_FALLBACKS = Object.freeze({
  super_admin: buildPlatformAdminPath("/tenant-management"),
  admin: buildAdminPath("/dashboard"),
  manager: buildAdminPath("/dashboard"),
  chef: buildAdminPath("/kitchen/dashboard"),
  waiter: buildAdminPath("/waiter-calls"),
  cashier: buildAdminPath("/customers/bills"),
});

const ALL_NOTIFICATION_TYPES = [
  "waiter_call",
  "order_ready",
  "order_delayed",
  "payment_request",
  "payment_received",
  "table_assigned",
  "customer_checkin",
  "customer_checkout",
  "inventory_low",
  "reservation_alert",
  "system_alert",
  "staff_announcement",
  "rating_received",
  "shift_change",
  "task_assigned",
];

const NOTIFICATION_TYPES_BY_ROLE = Object.freeze({
  waiter: [
    "waiter_call",
    "order_ready",
    "payment_request",
    "table_assigned",
    "customer_checkout",
    "reservation_alert",
    "staff_announcement",
    "shift_change",
    "task_assigned",
  ],
  chef: [
    "system_alert",
    "order_delayed",
    "staff_announcement",
    "shift_change",
    "task_assigned",
  ],
  cashier: [
    "payment_request",
    "payment_received",
  ],
  manager: ALL_NOTIFICATION_TYPES,
  admin: ALL_NOTIFICATION_TYPES,
  super_admin: ALL_NOTIFICATION_TYPES,
});

export const hasAccessRequirement = ({
  role,
  permissions = [],
  allowedRoles,
  requiredPermissions,
} = {}) => {
  const normalizedRole = normalizeRole(role);
  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(normalizedRole)
  ) {
    return false;
  }
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  // Tenant admins and platform admins are treated as top-level viewers once
  // the route has already opted them in through `allowedRoles`.
  if (["admin", "super_admin"].includes(normalizedRole)) {
    return true;
  }
  const normalizedPermissions = new Set(
    (permissions || []).map((permission) => normalizePermission(permission)),
  );
  return requiredPermissions.some((permission) =>
    normalizedPermissions.has(normalizePermission(permission)),
  );
};

export const resolveAccessibleAdminHomePath = (user, permissions = []) => {
  const role = normalizeRole(user?.role);
  if (role === "super_admin") {
    return buildPlatformAdminPath("/tenant-management");
  }
  const normalizedPermissions = (permissions || []).filter(Boolean);
  if (normalizedPermissions.length === 0) {
    return ROLE_HOME_FALLBACKS[role] || buildAdminPath("/unauthorized");
  }
  const matchingPath = HOME_CANDIDATES.find((candidate) =>
    hasAccessRequirement({
      role,
      permissions: normalizedPermissions,
      allowedRoles: candidate.allowedRoles,
      requiredPermissions: candidate.requiredPermissions,
    }),
  )?.path;
  return (
    matchingPath ||
    ROLE_HOME_FALLBACKS[role] ||
    buildAdminPath("/unauthorized")
  );
};

export const getAllowedNotificationTypes = (role) =>
  NOTIFICATION_TYPES_BY_ROLE[normalizeRole(role)] || [];

export const canAccessNotificationType = (role, type) => {
  const allowedTypes = getAllowedNotificationTypes(role);
  if (!allowedTypes.length) {
    return false;
  }
  return allowedTypes.includes(String(type || "").trim().toLowerCase());
};

export const getNotificationTypeOptions = (role) => {
  const labels = {
    waiter_call: "Waiter calls",
    order_ready: "Order ready",
    order_delayed: "Order delayed",
    payment_request: "Payment request",
    payment_received: "Payment received",
    table_assigned: "Table assigned",
    customer_checkin: "Customer check-in",
    customer_checkout: "Customer checkout",
    inventory_low: "Inventory low",
    reservation_alert: "Reservation alert",
    system_alert: "System alerts",
    staff_announcement: "Announcements",
    rating_received: "Feedback",
    shift_change: "Shift change",
    task_assigned: "Task assigned",
  };
  return [
    {
      value: "all",
      label: "All types",
    },
    ...getAllowedNotificationTypes(role).map((type) => ({
      value: type,
      label: labels[type] || String(type).replace(/_/g, " "),
    })),
  ];
};
