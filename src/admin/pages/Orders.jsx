import { logger } from "../../common/utils/logger.js";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Search,
  RefreshCw,
  ClipboardList,
  Clock3,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { OrderCard } from "../components/orders/OrderCard";
import { KitchenDisplay } from "../components/orders/KitchenDisplay";
import AdminPagination from "../components/common/AdminPagination";
import { AdminListSkeleton } from "../components/common/AdminSkeleton";
import ResponsiveFilterSection from "../components/common/ResponsiveFilterSection";
import { orderService } from "../../common/services";
import { useSettings } from "../../common/context/SettingsContext";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { useAdminLiveSync } from "../hooks/useAdminLiveSync";
const ORDER_STATUS = [
  {
    value: "all",
    label: "All Orders",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
  {
    value: "preparing",
    label: "Preparing",
  },
  {
    value: "ready",
    label: "Ready",
  },
  {
    value: "served",
    label: "Served",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];
const PAYMENT_STATUS = [
  {
    value: "all",
    label: "All Payments",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "failed",
    label: "Failed",
  },
];
const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
const EMPTY_STATUS_COUNTS = {
  all: 0,
  pending: 0,
  confirmed: 0,
  preparing: 0,
  ready: 0,
  served: 0,
  completed: 0,
  cancelled: 0,
};
const normalizeOrder = (order) => ({
  ...order,
  id: order._id,
  tableNumber: order.table?.tableNumber || order.tableNumber,
  total: order.totalAmount || order.total || 0,
  createdAt: order.orderPlacedAt || order.createdAt,
  items: (order.items || []).map((item) => ({
    _id: item._id,
    quantity: item.quantity || 0,
    name: item.menuItem?.name || item.name || "Unknown item",
    sizeName: item.sizeId?.name || item.size?.name || item.sizeName || "",
    price:
      item.unitPrice || item.price || item.menuItem?.prices?.[0]?.price || 0,
    totalPrice: item.totalPrice,
    notes: item.notes || item.specialInstructions || "",
  })),
});
export function Orders() {
  const PAGE_SIZE = 10;
  const isMonitoringMode = useMonitoringMode();
  const { settings } = useSettings();
  const currency = settings?.taxSettings?.currency || "INR";
  const { dispatch, kitchenView, addNotification } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    paymentStatus: "all",
  });
  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);
  const loadOrders = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        search: filters.search.trim() || undefined,
      };
      if (filters.status !== "all") {
        params.status = filters.status;
      }
      if (filters.paymentStatus !== "all") {
        params.paymentStatus = filters.paymentStatus;
      }
      const [ordersResponse, statsResponse] = await Promise.all([
        orderService.getOrders(params),
        orderService.getOrderStatistics(
          {},
          {
            force: silent,
          },
        ),
      ]);
      const nextOrders = (ordersResponse.data || []).map(normalizeOrder);
      setOrders(nextOrders);
      setPagination({
        page: ordersResponse.pagination?.page || currentPage,
        pages: ordersResponse.pagination?.pages || 1,
        total: ordersResponse.total || 0,
      });
      setStatistics(statsResponse.data || null);
      dispatch({
        type: "SET_ORDERS",
        payload: nextOrders,
      });
    } catch (error) {
      logger.error("Failed to load orders:", error);
      addNotificationRef.current(
        error.response?.data?.message || "Failed to load orders",
        "error",
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [
    currentPage,
    dispatch,
    filters.paymentStatus,
    filters.search,
    filters.status,
  ]);
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  useAdminLiveSync({
    enabled: !kitchenView,
    events: ["order:status-updated", "order-status-updated"],
    joinRooms: (socket, user) => {
      socket.emit("join-role-room", user.role);
      socket.emit("join-staff-room");
      if (["admin", "manager"].includes(user.role)) {
        socket.emit("join-management-room");
      }
    },
    onEvent: () => {
      loadOrders({
        silent: true,
      });
    },
  });
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.paymentStatus, filters.search, filters.status]);
  const statusCounts = useMemo(() => {
    const statsStatusCounts = statistics?.statusCounts;
    if (statsStatusCounts) {
      return {
        ...EMPTY_STATUS_COUNTS,
        ...statsStatusCounts,
        all: statistics?.totalOrders ?? 0,
      };
    }
    return orders.reduce(
      (accumulator, order) => {
        accumulator.all += 1;
        accumulator[order.status] = (accumulator[order.status] || 0) + 1;
        return accumulator;
      },
      {
        ...EMPTY_STATUS_COUNTS,
      },
    );
  }, [orders, statistics]);
  const updateStatus = async (orderId, status) => {
    if (isMonitoringMode) {
      addNotification(
        "Order actions are disabled in monitoring mode.",
        "error",
      );
      return;
    }
    try {
      setUpdatingId(orderId);
      await orderService.updateOrderStatus(orderId, status);
      addNotification("Order status updated", "success");
      await loadOrders();
    } catch (error) {
      logger.error("Failed to update order status:", error);
      addNotificationRef.current(
        error.response?.data?.message || "Failed to update order status",
        "error",
      );
    } finally {
      setUpdatingId("");
    }
  };
  if (kitchenView) {
    return (
      <KitchenDisplay
        onRefreshOrders={loadOrders}
        isReadOnly={isMonitoringMode}
      />
    );
  }
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Orders Management
          </h1>
          <p className="text-gray-600">
            Track order flow, payment status, and table activity in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadOrders}
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statusCounts.all}
              </p>
            </div>
            <ClipboardList className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(statistics?.todayRevenue, currency)}
              </p>
            </div>
            <IndianRupee className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(statistics?.pendingOrders ?? 0) ||
                  (statusCounts.pending || 0) + (statusCounts.confirmed || 0)}
              </p>
            </div>
            <Clock3 className="h-6 w-6 text-orange-600" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Preparing Now</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statistics?.preparingOrders ?? statusCounts.preparing ?? 0}
              </p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-violet-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        {ORDER_STATUS.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                status: status.value,
              }))
            }
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${filters.status === status.value ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {status.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {statusCounts[status.value] || 0}
            </p>
          </button>
        ))}
      </div>

      <ResponsiveFilterSection title="Order Filters">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="relative">
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
              placeholder="Search by order, table, customer, or item"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-primary-500"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
          >
            {ORDER_STATUS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={filters.paymentStatus}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                paymentStatus: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
          >
            {PAYMENT_STATUS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </ResponsiveFilterSection>

      {loading ? (
        <AdminListSkeleton rows={6} />
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">
            No orders found
          </h3>
          <p className="mt-1 text-gray-600">
            Try changing the status or payment filters.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onStatusUpdate={updateStatus}
                isUpdating={updatingId === order._id}
                isReadOnly={isMonitoringMode}
              />
            ))}
          </div>
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={PAGE_SIZE}
            itemLabel="orders"
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
