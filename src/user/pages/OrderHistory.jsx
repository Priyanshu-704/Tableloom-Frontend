import React, { useEffect, useState } from "react";
import { ArrowLeft, Clock, Receipt, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import orderService from "../../common/services/orderService";
import { useApp } from "../context/AppContext";
import { buildCustomerPath } from "../../common/utils/routes";
import { useSettings } from "../../common/context/SettingsContext";
export function OrderHistory() {
  const navigate = useNavigate();
  const { sessionId, currentOrder, dispatch } = useApp();
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings?.taxSettings?.currency || "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  const loadOrders = async (isRefresh = false) => {
    if (!sessionId) {
      setOrders(currentOrder ? [currentOrder] : []);
      setLoading(false);
      return;
    }
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await orderService.getOrderHistoryBySession(sessionId, {
        limit: 25,
        summary: true,
      });
      const nextOrders = Array.isArray(response?.data) ? response.data : [];
      setOrders(nextOrders);
      if (nextOrders[0]) {
        dispatch({
          type: "SET_CURRENT_ORDER",
          payload: nextOrders[0],
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    loadOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin text-primary-600" />
          <p className="text-gray-600">Loading order history...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="sticky top-28 z-20 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:top-18 lg:top-0">
          <button
            type="button"
            onClick={() => navigate(buildCustomerPath("/home"))}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </button>
          <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">
            Order History
          </h1>
          <button
            type="button"
            onClick={() => loadOrders(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-primary-600"
          >
            <RefreshCw
              className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              No orders found
            </h2>
            <p className="mb-5 text-sm text-gray-600">
              Your order history for this session will appear here.
            </p>
            <button
              type="button"
              onClick={() => navigate(buildCustomerPath("/home/menu"))}
              className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
            >
              Start Ordering
            </button>
          </div>
        ) : (
          orders.map((order, index) => {
            const isCurrent =
              index === 0 &&
              !["completed", "cancelled"].includes(order?.status);
            return (
              <button
                key={order?._id || order?.id || order?.orderNumber}
                type="button"
                onClick={() =>
                  navigate(
                    buildCustomerPath(
                      `/home/order-status/${order?._id || order?.id || ""}`,
                    ),
                  )
                }
                className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        #{order?.orderNumber || order?._id || order?.id}
                      </h2>
                      {isCurrent ? (
                        <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
                          Current Order
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize text-slate-700">
                        {String(order?.status || "pending").replace(/_/g, " ")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {order?.orderPlacedAt || order?.createdAt
                          ? new Date(
                              order.orderPlacedAt || order.createdAt,
                            ).toLocaleString()
                          : "Just now"}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-lg font-bold text-primary-600">
                      {formatPrice(order?.totalAmount || order?.total)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {(order?.items || []).reduce(
                        (sum, item) => sum + (Number(item?.quantity) || 0),
                        0,
                      )}{" "}
                      items
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {(order?.items || []).slice(0, 3).map((item, itemIndex) => (
                    <div
                      key={
                        item?._id || item?.id || `${order?._id}-${itemIndex}`
                      }
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700">
                        {item?.quantity}x{" "}
                        {item?.menuItem?.name || item?.name || "Menu item"}
                        {item?.sizeName || item?.size?.name
                          ? ` (${item?.sizeName || item?.size?.name})`
                          : ""}
                      </span>
                      <span className="text-gray-500">
                        {formatPrice(
                          item?.totalPrice ||
                            (item?.unitPrice || item?.price) *
                              (item?.quantity || 0),
                        )}
                      </span>
                    </div>
                  ))}
                  {(order?.items || []).length > 3 ? (
                    <p className="text-sm text-gray-500">
                      + {(order.items || []).length - 3} more items
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
