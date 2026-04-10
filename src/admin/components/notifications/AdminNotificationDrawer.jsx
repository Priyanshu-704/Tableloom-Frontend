import React from "react";
import { Bell, CheckCheck, Circle, Filter, RefreshCw, ShieldAlert, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../common/context/AuthContext";
import { useAdminNotificationCenter } from "../../context/AdminNotificationCenterContext";
import { Badge } from "../../../common/components/ui/badge";
import { Button } from "../../../common/components/ui/button";
import { Checkbox } from "../../../common/components/ui/checkbox";
import { Input } from "../../../common/components/ui/input";
import { AdminListSkeleton } from "../common/AdminSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../common/components/ui/select";
import { Separator } from "../../../common/components/ui/separator";
import { Sheet, SheetContent } from "../../../common/components/ui/sheet";
import { getNotificationNavigationLabel, getNotificationNavigationTarget } from "../../utils/notificationRouting";
import { useMonitoringMode } from "../../hooks/useMonitoringMode";
const STATUS_OPTIONS = [{
  value: "all",
  label: "All statuses"
}, {
  value: "unread",
  label: "Unread"
}, {
  value: "read",
  label: "Read"
}, {
  value: "acknowledged",
  label: "Acknowledged"
}];
const TYPE_OPTIONS = [{
  value: "all",
  label: "All types"
}, {
  value: "waiter_call",
  label: "Waiter calls"
}, {
  value: "order_ready",
  label: "Order ready"
}, {
  value: "order_delayed",
  label: "Order delayed"
}, {
  value: "payment_request",
  label: "Payment request"
}, {
  value: "payment_received",
  label: "Payment received"
}, {
  value: "staff_announcement",
  label: "Announcements"
}, {
  value: "system_alert",
  label: "System alerts"
}];
const PRIORITY_OPTIONS = [{
  value: "all",
  label: "All priorities"
}, {
  value: "low",
  label: "Low"
}, {
  value: "medium",
  label: "Medium"
}, {
  value: "high",
  label: "High"
}, {
  value: "urgent",
  label: "Urgent"
}];
const priorityTone = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-sky-100 text-sky-700",
  urgent: "bg-red-100 text-red-700"
};
const statusTone = {
  unread: "bg-primary-50 text-primary-700",
  read: "bg-slate-100 text-slate-700",
  acknowledged: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-rose-100 text-rose-700"
};
const formatDateTime = value => {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
};
function NotificationGroup({
  title,
  items,
  isReadOnly = false
}) {
  const navigate = useNavigate();
  const {
    activeAction,
    acknowledge,
    dismiss,
    markAsRead
  } = useAdminNotificationCenter();
  if (!items.length) {
    return null;
  }
  return <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <ShieldAlert className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {items.length}
        </span>
      </div>

      {items.map(item => {
      const status = item.effectiveStatus || item.status || "unread";
      const canAcknowledge = item.actionRequired && !["acknowledged", "dismissed", "action_taken"].includes(status);
      const navigationTarget = getNotificationNavigationTarget(item);
      const navigationLabel = getNotificationNavigationLabel(item);
      return <article key={item._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {item.title}
                  </h4>
                  {!item.isRead ? <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 text-[11px] font-medium text-primary-700">
                      <Circle className="h-2.5 w-2.5 fill-current" />
                      New
                    </span> : null}
                </div>
                <p className="text-sm leading-6 text-gray-600">{item.message}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className={priorityTone[item.priority] || priorityTone.medium}>
                    {item.priority || "medium"}
                  </Badge>
                  <Badge className={statusTone[status] || statusTone.read}>
                    {status}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700">
                    {String(item.type || "system_alert").replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{formatDateTime(item.createdAt)}</span>
                  <span>{item.sender?.name || "System"}</span>
                  {item.metadata?.tableNumber ? <span>Table {item.metadata.tableNumber}</span> : null}
                </div>
              </div>

              {!isReadOnly ? <Button type="button" onClick={() => dismiss(item._id)} disabled={activeAction === item._id} variant="ghost" size="icon" className="h-8 w-8 cursor-pointer rounded-full text-gray-400 hover:text-gray-600" aria-label="Clear notification">
                  <X className="h-4 w-4" />
                </Button> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {navigationTarget ? <Button type="button" onClick={() => navigate(navigationTarget)} variant="outline" size="sm" className="cursor-pointer text-xs">
                  {navigationLabel}
                </Button> : null}
              {!isReadOnly && !item.isRead ? <Button type="button" onClick={() => markAsRead(item._id)} disabled={activeAction === item._id} variant="outline" size="sm" className="cursor-pointer text-xs">
                  Mark read
                </Button> : null}
              {!isReadOnly && canAcknowledge ? <Button type="button" onClick={() => acknowledge(item._id)} disabled={activeAction === item._id} size="sm" className="cursor-pointer text-xs">
                  Acknowledge
                </Button> : null}
            </div>
          </article>;
    })}
    </section>;
}
export function AdminNotificationDrawer() {
  const {
    hasPermission
  } = useAuth();
  const isMonitoringMode = useMonitoringMode();
  const {
    activeAction,
    canViewNotifications,
    cleanupExpired,
    clearAll,
    closeDrawer,
    filters,
    importantNotifications,
    isConnected,
    isDrawerOpen,
    loading,
    markAllAsRead,
    notifications,
    otherNotifications,
    refreshNotifications,
    resetFilters,
    setFilters,
    stats
  } = useAdminNotificationCenter();
  if (!canViewNotifications || !isDrawerOpen) {
    return null;
  }
  return <Sheet open={isDrawerOpen} onOpenChange={open => !open && closeDrawer()}>
      <SheetContent side="right" onPointerDownOutside={closeDrawer} className="left-2 right-2 top-16 bottom-0 h-auto w-auto max-w-xl rounded-none rounded-t-[1.5rem] border-x-0 border-b-0 border-gray-200 bg-[#f7f7f4] p-0 sm:left-3 sm:right-3 sm:top-[4.5rem] sm:bottom-3 sm:rounded-[1.5rem] sm:border sm:max-w-none md:left-auto md:right-0 md:top-16 md:bottom-0 md:h-[calc(100vh-4rem)] md:w-[min(72rem,calc(100vw-14rem))] md:max-w-none md:rounded-none">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-gray-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Notifications
                  </h2>
                  <Badge className={`${isConnected ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                    {isConnected ? "Live" : "Reconnecting"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Waiter calls and important alerts appear here in real time.
                </p>
              </div>
              <Button type="button" onClick={closeDrawer} variant="ghost" size="icon" className="rounded-full text-gray-500 hover:text-gray-700 cursor-pointer" aria-label="Close notification drawer">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 hidden gap-3 md:grid md:grid-cols-3">
              <div className="min-w-[8.5rem] shrink-0 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-gray-500">Total</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {stats?.total ?? notifications.length}
                </p>
              </div>
              <div className="min-w-[8.5rem] shrink-0 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-gray-500">Unread</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {stats?.unreadCount ?? 0}
                </p>
              </div>
              <div className="min-w-[8.5rem] shrink-0 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-gray-500">Important</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {importantNotifications.length}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!isMonitoringMode ? <Button type="button" onClick={markAllAsRead} disabled={loading || activeAction === "mark-all"} variant="outline" size="sm" className="cursor-pointer">
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </Button> : null}
              {!isMonitoringMode ? <Button type="button" onClick={clearAll} disabled={loading || activeAction === "clear-all"} variant="outline" size="sm" className="cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                  Clear all
                </Button> : null}
              {!isMonitoringMode && hasPermission("notification_announce") ? <Button type="button" onClick={cleanupExpired} disabled={activeAction === "cleanup"} variant="outline" size="sm" className="cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                  Cleanup
                </Button> : null}
              <Button type="button" onClick={() => refreshNotifications()} disabled={loading} variant="outline" size="sm" className="cursor-pointer">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="hidden min-h-0 border-b border-gray-200 bg-[#fcfcfa] md:block md:border-b-0 md:border-r">
              <div className="h-full overflow-y-auto overscroll-contain px-4 py-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter className="h-4 w-4" />
                  Filters
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Input value={filters.search} onChange={event => setFilters(current => ({
                    ...current,
                    search: event.target.value
                  }))} placeholder="Search notifications" />
                  <Select value={filters.status} onValueChange={value => setFilters(current => ({
                    ...current,
                    status: value
                  }))}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.type} onValueChange={value => setFilters(current => ({
                    ...current,
                    type: value
                  }))}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.priority} onValueChange={value => setFilters(current => ({
                    ...current,
                    priority: value
                  }))}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
                    <Checkbox checked={filters.unreadOnly} onCheckedChange={checked => setFilters(current => ({
                      ...current,
                      unreadOnly: Boolean(checked)
                    }))} />
                    Unread only
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
                    <Checkbox checked={filters.actionRequired} onCheckedChange={checked => setFilters(current => ({
                      ...current,
                      actionRequired: Boolean(checked)
                    }))} />
                    Action required
                  </label>
                  <Button type="button" onClick={resetFilters} variant="subtle" className="justify-start rounded-xl">
                    Reset filters
                  </Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 bg-[#f7f7f4]">
              <div className="h-full overflow-y-auto overscroll-contain px-5 py-4">
                {loading ? <AdminListSkeleton rows={4} /> : notifications.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center">
                    <Bell className="mx-auto h-10 w-10 text-gray-300" />
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">
                      No notifications to show
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      New waiter calls and alerts will appear here automatically.
                    </p>
                  </div> : <div className="space-y-5">
                    <NotificationGroup title="Important" items={importantNotifications} isReadOnly={isMonitoringMode} />
                    <Separator className="bg-transparent" />
                    <NotificationGroup title="Everything Else" items={otherNotifications} isReadOnly={isMonitoringMode} />
                  </div>}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>;
}
