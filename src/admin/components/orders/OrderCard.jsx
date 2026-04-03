import React from "react";
import { Clock, CheckCircle, ChefHat, Truck, X, MoreVertical, User } from "lucide-react";
const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY: "ready",
  SERVED: "served",
  CANCELLED: "cancelled",
  COMPLETED: "completed"
};
const STATUS_CONFIG = {
  [ORDER_STATUS.PENDING]: {
    label: "Pending",
    icon: Clock,
    nextAction: "Confirm",
    nextStatus: ORDER_STATUS.CONFIRMED,
    tones: {
      header: "bg-sky-50 border-sky-200",
      icon: "text-sky-600",
      badge: "bg-sky-100 text-sky-800",
      action: "bg-sky-600 hover:bg-sky-700"
    }
  },
  [ORDER_STATUS.CONFIRMED]: {
    label: "Confirmed",
    icon: CheckCircle,
    nextAction: "Start Preparing",
    nextStatus: ORDER_STATUS.PREPARING,
    tones: {
      header: "bg-blue-50 border-blue-200",
      icon: "text-blue-600",
      badge: "bg-blue-100 text-blue-800",
      action: "bg-blue-600 hover:bg-blue-700"
    }
  },
  [ORDER_STATUS.PREPARING]: {
    label: "Preparing",
    icon: ChefHat,
    nextAction: "Mark Ready",
    nextStatus: ORDER_STATUS.READY,
    tones: {
      header: "bg-orange-50 border-orange-200",
      icon: "text-orange-600",
      badge: "bg-orange-100 text-orange-800",
      action: "bg-orange-600 hover:bg-orange-700"
    }
  },
  [ORDER_STATUS.READY]: {
    label: "Ready",
    icon: Truck,
    nextAction: "Mark Served",
    nextStatus: ORDER_STATUS.SERVED,
    tones: {
      header: "bg-emerald-50 border-emerald-200",
      icon: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-800",
      action: "bg-emerald-600 hover:bg-emerald-700"
    }
  },
  [ORDER_STATUS.SERVED]: {
    label: "Served",
    icon: CheckCircle,
    nextAction: null,
    nextStatus: null,
    tones: {
      header: "bg-violet-50 border-violet-200",
      icon: "text-violet-600",
      badge: "bg-violet-100 text-violet-800",
      action: ""
    }
  },
  [ORDER_STATUS.COMPLETED]: {
    label: "Completed",
    icon: CheckCircle,
    nextAction: null,
    nextStatus: null,
    tones: {
      header: "bg-slate-50 border-slate-200",
      icon: "text-slate-600",
      badge: "bg-slate-100 text-slate-800",
      action: ""
    }
  },
  [ORDER_STATUS.CANCELLED]: {
    label: "Cancelled",
    icon: X,
    nextAction: null,
    nextStatus: null,
    tones: {
      header: "bg-red-50 border-red-200",
      icon: "text-red-600",
      badge: "bg-red-100 text-red-800",
      action: ""
    }
  }
};
const formatCurrency = (value, currency = "INR") => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency,
  maximumFractionDigits: 2
}).format(Number(value || 0));
const formatRelativeTime = value => {
  if (!value) return "Unknown";
  const diffMins = Math.max(0, Math.floor((new Date().getTime() - new Date(value).getTime()) / 60000));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ago`;
};
export function OrderCard({
  order,
  onStatusUpdate,
  isUpdating = false
}) {
  const [showActions, setShowActions] = React.useState(false);
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const now = React.useMemo(() => new Date().getTime(), []);
  const getEstimatedTime = () => {
    if (!order.estimatedReadyTime) return null;
    const diffMins = Math.round((new Date(order.estimatedReadyTime).getTime() - now) / 60000);
    return diffMins > 0 ? `${diffMins} min` : "Due now";
  };
  const changeStatus = nextStatus => {
    if (!nextStatus || isUpdating) {
      return;
    }
    onStatusUpdate(order._id || order.id, nextStatus);
    setShowActions(false);
  };
  return <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className={`border-b p-4 ${statusConfig.tones.header}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <StatusIcon className={`h-5 w-5 ${statusConfig.tones.icon}`} />
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-gray-900">
                Order #{order.orderNumber || order.id}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Table {order.tableNumber || order.table?.tableNumber || "N/A"}
                </span>
                <span>&bull;</span>
                <span>{formatRelativeTime(order.createdAt || order.orderPlacedAt)}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button type="button" onClick={() => setShowActions(value => !value)} className="rounded p-1 transition-colors hover:bg-white/70">
              <MoreVertical className="h-4 w-4 text-gray-700" />
            </button>

            {showActions && <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {statusConfig.nextAction && <button type="button" onClick={() => changeStatus(statusConfig.nextStatus)} className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100">
                      {statusConfig.nextAction}
                    </button>}
                  {!["cancelled", "served", "completed"].includes(order.status) && <button type="button" onClick={() => changeStatus(ORDER_STATUS.CANCELLED)} className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50">
                      Cancel Order
                    </button>}
                </div>
              </>}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 space-y-2">
          {(order.items || []).map((item, index) => <div key={item._id || `${item.name}-${index}`} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="text-gray-900">
                  <span className="mr-2 text-gray-500">{item.quantity}x</span>
                  {item.name}
                  {item.sizeName ? <span className="ml-2 text-xs text-gray-500">
                      ({item.sizeName})
                    </span> : null}
                </div>
                {item.notes ? <p className="mt-1 text-xs text-gray-500">{item.notes}</p> : null}
              </div>
              <span className="shrink-0 font-medium text-gray-900">
                {formatCurrency(item.totalPrice || item.price * item.quantity, order.currency || "INR")}
              </span>
            </div>)}
        </div>

        {order.specialInstructions ? <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <strong>Note:</strong> {order.specialInstructions}
          </div> : null}

        <div className="space-y-2 border-t border-gray-200 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Payment</span>
            <span className="capitalize text-gray-900">
              {order.paymentStatus || "pending"}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-gray-900">Total</span>
            <span className="text-primary-600">
              {formatCurrency(order.total || order.totalAmount, order.currency || "INR")}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusConfig.tones.badge}`}>
              {statusConfig.label}
            </span>
            {getEstimatedTime() ? <span className="text-xs text-gray-500">ETA {getEstimatedTime()}</span> : null}
          </div>

          {statusConfig.nextAction ? <button type="button" disabled={isUpdating} onClick={() => changeStatus(statusConfig.nextStatus)} className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${statusConfig.tones.action}`}>
              {isUpdating ? "Updating..." : statusConfig.nextAction}
            </button> : null}
        </div>
      </div>
    </div>;
}
