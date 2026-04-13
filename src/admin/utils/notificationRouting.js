import {
  buildAdminPath,
  buildPlatformAdminPath,
} from "../../common/utils/routes";
const resolveActionPath = (action) =>
  String(action || "")
    .trim()
    .toLowerCase();
const normalizeDashboardPath = (path) => {
  const normalized = resolveActionPath(path);
  if (!normalized) {
    return "";
  }
  if (normalized.includes("waiter-calls")) {
    return buildAdminPath("/waiter-calls");
  }
  if (normalized.includes("kitchen")) {
    return buildAdminPath("/kitchen/dashboard");
  }
  if (normalized.includes("bills")) {
    return buildAdminPath("/customers/bills");
  }
  if (normalized.includes("inventory")) {
    return buildAdminPath("/inventory");
  }
  if (normalized.includes("admin-requests")) {
    return buildPlatformAdminPath("/admin-requests");
  }
  if (normalized.includes("tenant-management")) {
    return buildPlatformAdminPath("/tenant-management");
  }
  if (normalized.includes("orders")) {
    return buildAdminPath("/orders");
  }
  if (normalized.includes("tables")) {
    return buildAdminPath("/tables/list");
  }
  return "";
};
const typeRouteMap = {
  waiter_call: buildAdminPath("/waiter-calls"),
  order_ready: buildAdminPath("/kitchen/dashboard"),
  order_delayed: buildAdminPath("/kitchen/dashboard"),
  payment_request: buildAdminPath("/customers/bills"),
  payment_received: buildAdminPath("/customers/bills"),
  inventory_low: buildAdminPath("/inventory"),
  customer_checkin: buildAdminPath("/dashboard"),
  customer_checkout: buildAdminPath("/dashboard"),
  table_assigned: buildAdminPath("/tables/list"),
  system_alert: buildAdminPath("/dashboard"),
};
export const getNotificationNavigationTarget = (notification) => {
  const linkAction = (notification?.actions || []).find(
    (action) => String(action?.type || "").toLowerCase() === "link",
  );
  const actionTarget = normalizeDashboardPath(linkAction?.action);
  if (actionTarget) {
    return actionTarget;
  }
  return typeRouteMap[String(notification?.type || "").toLowerCase()] || "";
};
export const getNotificationNavigationLabel = (notification) => {
  const linkAction = (notification?.actions || []).find(
    (action) =>
      String(action?.type || "").toLowerCase() === "link" && action?.label,
  );
  return linkAction?.label || "Open Related Page";
};
