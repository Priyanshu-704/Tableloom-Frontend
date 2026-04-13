import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Megaphone,
  RefreshCw,
  Search,
  CheckCheck,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../common/context/AuthContext";
import { notificationAdminService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import AdminPagination from "../components/common/AdminPagination";
import { AdminListSkeleton } from "../components/common/AdminSkeleton";
import ResponsiveFilterSection from "../components/common/ResponsiveFilterSection";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import {
  getNotificationNavigationLabel,
  getNotificationNavigationTarget,
} from "../utils/notificationRouting";
const STATUS_OPTIONS = [
  {
    value: "all",
    label: "All Statuses",
  },
  {
    value: "unread",
    label: "Unread",
  },
  {
    value: "read",
    label: "Read",
  },
  {
    value: "acknowledged",
    label: "Acknowledged",
  },
  {
    value: "dismissed",
    label: "Dismissed",
  },
];
const TYPE_OPTIONS = [
  {
    value: "all",
    label: "All Types",
  },
  {
    value: "waiter_call",
    label: "Waiter Calls",
  },
  {
    value: "order_ready",
    label: "Order Ready",
  },
  {
    value: "order_delayed",
    label: "Order Delayed",
  },
  {
    value: "payment_request",
    label: "Payment Request",
  },
  {
    value: "payment_received",
    label: "Payment Received",
  },
  {
    value: "staff_announcement",
    label: "Announcements",
  },
  {
    value: "system_alert",
    label: "System Alerts",
  },
];
const PRIORITY_OPTIONS = [
  {
    value: "all",
    label: "All Priorities",
  },
  {
    value: "low",
    label: "Low",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "high",
    label: "High",
  },
  {
    value: "urgent",
    label: "Urgent",
  },
];
const priorityTone = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-sky-100 text-sky-700",
  urgent: "bg-red-100 text-red-700",
};
const statusTone = {
  unread: "bg-primary-50 text-primary-700",
  read: "bg-slate-100 text-slate-700",
  acknowledged: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-rose-100 text-rose-700",
  action_taken: "bg-emerald-100 text-emerald-700",
};
const defaultAnnouncement = {
  title: "",
  message: "",
  priority: "medium",
  expiresAt: "",
  important: false,
};
const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
};
export function Notifications() {
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { addNotification } = useAdmin();
  const isMonitoringMode = useMonitoringMode();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcement, setAnnouncement] = useState(defaultAnnouncement);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    priority: "all",
    unreadOnly: false,
    actionRequired: false,
  });
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        search: filters.search.trim() || undefined,
      };
      if (filters.status !== "all") {
        params.status = filters.status;
      }
      if (filters.type !== "all") {
        params.type = filters.type;
      }
      if (filters.priority !== "all") {
        params.priority = filters.priority;
      }
      if (filters.unreadOnly) {
        params.unreadOnly = true;
      }
      if (filters.actionRequired) {
        params.actionRequired = true;
      }
      const [notificationsResponse, statsResponse] = await Promise.all([
        notificationAdminService.getNotifications(params),
        notificationAdminService.getStats("today"),
      ]);
      setNotifications(notificationsResponse.data || []);
      setPagination({
        page: notificationsResponse.pagination?.page || currentPage,
        pages: notificationsResponse.pagination?.pages || 1,
        total: notificationsResponse.pagination?.total ?? 0,
      });
      setStats({
        ...(statsResponse.data || {}),
        unreadCount:
          statsResponse.data?.unreadCount ??
          notificationsResponse.unreadCount ??
          0,
        total:
          statsResponse.data?.total ??
          notificationsResponse.pagination?.total ??
          notificationsResponse.data?.length ??
          0,
      });
    } catch (error) {
      logger.error("Failed to load notifications:", error);
      addNotification(
        error.response?.data?.message || "Failed to load notifications",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [
    addNotification,
    currentPage,
    filters.actionRequired,
    filters.priority,
    filters.search,
    filters.status,
    filters.type,
    filters.unreadOnly,
  ]);
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.actionRequired,
    filters.priority,
    filters.search,
    filters.status,
    filters.type,
    filters.unreadOnly,
  ]);
  const actionRequiredCount = useMemo(
    () =>
      notifications.filter(
        (item) =>
          item.actionRequired &&
          !["acknowledged", "dismissed", "action_taken"].includes(item.status),
      ).length,
    [notifications],
  );
  const highPriorityCount = useMemo(
    () =>
      notifications.filter((item) => ["high", "urgent"].includes(item.priority))
        .length,
    [notifications],
  );
  const runNotificationAction = async (
    notificationId,
    task,
    successMessage,
  ) => {
    if (isMonitoringMode) {
      return;
    }
    try {
      setActiveId(notificationId);
      await task();
      addNotification(successMessage, "success");
      await loadNotifications();
    } catch (error) {
      logger.error("Notification action failed:", error);
      addNotification(
        error.response?.data?.message || "Failed to update notification",
        "error",
      );
    } finally {
      setActiveId("");
    }
  };
  const submitAnnouncement = async () => {
    if (isMonitoringMode) {
      return;
    }
    if (!announcement.title.trim() || !announcement.message.trim()) {
      addNotification("Announcement title and message are required", "error");
      return;
    }
    try {
      setSendingAnnouncement(true);
      await notificationAdminService.createAnnouncement({
        title: announcement.title.trim(),
        message: announcement.message.trim(),
        priority: announcement.priority,
        expiresAt: announcement.expiresAt || undefined,
        important: announcement.important,
      });
      addNotification("Announcement sent successfully", "success");
      setAnnouncement(defaultAnnouncement);
      setShowAnnouncementModal(false);
      await loadNotifications();
    } catch (error) {
      logger.error("Failed to send announcement:", error);
      addNotification(
        error.response?.data?.message || "Failed to send announcement",
        "error",
      );
    } finally {
      setSendingAnnouncement(false);
    }
  };
  const cleanupExpired = async () => {
    if (isMonitoringMode) {
      return;
    }
    try {
      setActiveId("cleanup");
      const response = await notificationAdminService.cleanup();
      addNotification(
        response.message || "Expired notifications cleaned up",
        "success",
      );
      await loadNotifications();
    } catch (error) {
      logger.error("Failed to cleanup notifications:", error);
      addNotification(
        error.response?.data?.message || "Failed to cleanup notifications",
        "error",
      );
    } finally {
      setActiveId("");
    }
  };
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Review staff alerts, waiter-call updates, and announcements in one
            place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!isMonitoringMode && (
            <button
              type="button"
              onClick={() =>
                runNotificationAction(
                  "mark-all",
                  () => notificationAdminService.markAllAsRead(),
                  "All notifications marked as read",
                )
              }
              disabled={loading || activeId === "mark-all"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 disabled:opacity-60 sm:w-auto"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </button>
          )}
          {!isMonitoringMode && hasPermission("notification_announce") && (
            <button
              type="button"
              onClick={() => setShowAnnouncementModal(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 sm:w-auto"
            >
              <Megaphone className="h-4 w-4" />
              New Announcement
            </button>
          )}
          {!isMonitoringMode && hasPermission("notification_announce") && (
            <button
              type="button"
              onClick={cleanupExpired}
              disabled={activeId === "cleanup"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 disabled:opacity-60 sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              Cleanup
            </button>
          )}
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Notifications</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {stats?.total ?? notifications.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Unread</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {stats?.unreadCount ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Action Required</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {actionRequiredCount}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">High Priority</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {highPriorityCount}
          </p>
        </div>
      </div>

      <ResponsiveFilterSection title="Notification Filters">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Search title, message, sender, or type"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4"
            />
          </div>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                type: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priority: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.unreadOnly}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  unreadOnly: event.target.checked,
                }))
              }
              className="rounded border-gray-300"
            />
            Unread only
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.actionRequired}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  actionRequired: event.target.checked,
                }))
              }
              className="rounded border-gray-300"
            />
            Action required
          </label>
        </div>
      </ResponsiveFilterSection>

      {loading ? (
        <AdminListSkeleton rows={6} />
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <Bell className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">
            No notifications found
          </h3>
          <p className="mt-1 text-gray-600">
            Try widening your filters or refresh to fetch the latest alerts.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {notifications.map((item) => {
              const canAcknowledge =
                item.actionRequired &&
                !["acknowledged", "dismissed", "action_taken"].includes(
                  item.status,
                );
              const navigationTarget = getNotificationNavigationTarget(item);
              const navigationLabel = getNotificationNavigationLabel(item);
              return (
                <div
                  key={item._id}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {item.title}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${priorityTone[item.priority] || priorityTone.medium}`}
                        >
                          {item.priority || "medium"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusTone[item.status] || statusTone.read}`}
                        >
                          {item.status || "unread"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {String(item.type || "system_alert").replace(
                            /_/g,
                            " ",
                          )}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-gray-700">
                        {item.message}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>Received {formatDateTime(item.createdAt)}</span>
                        <span>Sender: {item.sender?.name || "System"}</span>
                        {item.relatedModel ? (
                          <span>Related: {item.relatedModel}</span>
                        ) : null}
                      </div>
                      {item.actionRequired ? (
                        <div className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
                          <AlertCircle className="h-4 w-4" />
                          Requires action
                        </div>
                      ) : null}
                    </div>

                    {!isMonitoringMode && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {navigationTarget ? (
                          <button
                            type="button"
                            onClick={() => navigate(navigationTarget)}
                            className="rounded-lg border border-sky-200 px-4 py-2 text-sm text-sky-700 transition-colors hover:bg-sky-50"
                          >
                            {navigationLabel}
                          </button>
                        ) : null}
                        {item.status === "unread" && (
                          <button
                            type="button"
                            disabled={activeId === item._id}
                            onClick={() =>
                              runNotificationAction(
                                item._id,
                                () =>
                                  notificationAdminService.markAsRead(item._id),
                                "Notification marked as read",
                              )
                            }
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
                          >
                            Mark Read
                          </button>
                        )}
                        {canAcknowledge && (
                          <button
                            type="button"
                            disabled={activeId === item._id}
                            onClick={() =>
                              runNotificationAction(
                                item._id,
                                () =>
                                  notificationAdminService.acknowledge(
                                    item._id,
                                  ),
                                "Notification acknowledged",
                              )
                            }
                            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                          >
                            Acknowledge
                          </button>
                        )}
                        {item.status !== "dismissed" && (
                          <button
                            type="button"
                            disabled={activeId === item._id}
                            onClick={() =>
                              runNotificationAction(
                                item._id,
                                () =>
                                  notificationAdminService.dismiss(item._id),
                                "Notification dismissed",
                              )
                            }
                            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={PAGE_SIZE}
            itemLabel="notifications"
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {!isMonitoringMode && (
        <AdminModal
          isOpen={showAnnouncementModal}
          title="Send Announcement"
          subtitle="Share an update with all active staff members."
          onClose={() => {
            if (!sendingAnnouncement) {
              setShowAnnouncementModal(false);
            }
          }}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                disabled={sendingAnnouncement}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 disabled:opacity-60 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAnnouncement}
                disabled={sendingAnnouncement}
                className="w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
              >
                {sendingAnnouncement ? "Sending..." : "Send Announcement"}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 p-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                value={announcement.title}
                onChange={(event) =>
                  setAnnouncement((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Shift update, service note, or urgent alert"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                rows={6}
                value={announcement.message}
                onChange={(event) =>
                  setAnnouncement((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Write the announcement message for staff."
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  value={announcement.priority}
                  onChange={(event) =>
                    setAnnouncement((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {PRIORITY_OPTIONS.filter((item) => item.value !== "all").map(
                    (item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Expires At
                </label>
                <input
                  type="datetime-local"
                  value={announcement.expiresAt}
                  onChange={(event) =>
                    setAnnouncement((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={announcement.important}
                onChange={(event) =>
                  setAnnouncement((current) => ({
                    ...current,
                    important: event.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              Mark as important
            </label>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
