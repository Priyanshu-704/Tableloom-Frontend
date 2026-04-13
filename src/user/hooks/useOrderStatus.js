import { useCallback, useEffect, useState } from "react";
import orderService from "../../common/services/orderService";
import { useApp } from "../context/AppContext";
import { useUserLiveUpdates } from "../context/UserLiveUpdatesContext";
const normalizeOrder = (order = null) => {
  if (!order) {
    return null;
  }
  const items = Array.isArray(order?.items)
    ? order.items.map((item, index) => {
        const quantity = Number(item?.quantity) || 0;
        const totalPrice = Number(item?.totalPrice) || 0;
        const unitPrice =
          Number(item?.unitPrice) ||
          Number(item?.price) ||
          (quantity > 0 ? totalPrice / quantity : 0);
        return {
          ...item,
          id:
            item?._id ||
            item?.id ||
            `${item?.menuItem?._id || item?.menuItem || "item"}-${index}`,
          name: item?.name || item?.menuItem?.name || "Menu item",
          sizeName:
            item?.sizeName || item?.sizeId?.name || item?.size?.name || "",
          price: unitPrice,
          unitPrice,
          totalPrice: totalPrice || unitPrice * quantity,
        };
      })
    : [];
  return {
    ...order,
    id: order?._id || order?.id || order?.orderNumber || "",
    total: Number(
      order?.total ?? order?.totalAmount ?? order?.summary?.total ?? 0,
    ),
    createdAt:
      order?.createdAt || order?.orderPlacedAt || order?.updatedAt || "",
    paymentStatus: order?.paymentStatus || "pending",
    items,
  };
};
export function useOrderStatus(orderId) {
  useUserLiveUpdates();
  const { sessionId, currentOrder, dispatch } = useApp();
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderId || sessionId));
  const normalizedCurrentOrder = normalizeOrder(currentOrder);
  const normalizedFetchedOrder = normalizeOrder(fetchedOrder);
  const currentOrderId =
    normalizedCurrentOrder?._id || normalizedCurrentOrder?.id || "";
  const shouldUseCurrentOrder =
    !orderId || (currentOrderId && String(currentOrderId) === String(orderId));
  const order = shouldUseCurrentOrder
    ? normalizedCurrentOrder || normalizedFetchedOrder || null
    : normalizedFetchedOrder || null;
  const refreshOrder = useCallback(async () => {
    if (!orderId && !sessionId) {
      setFetchedOrder(null);
      setIsLoading(false);
      return {
        success: false,
        message: "No active order found",
      };
    }
    setIsLoading(true);
    const response = orderId
      ? await orderService.getOrderById(orderId)
      : await orderService.getOrderBySession(sessionId);
    const nextOrder = normalizeOrder(response?.data || null);
    if (response?.success && nextOrder) {
      setFetchedOrder(nextOrder);
      dispatch({
        type: "SET_CURRENT_ORDER",
        payload: nextOrder,
      });
      setIsLoading(false);
      return {
        success: true,
        data: nextOrder,
      };
    }
    setFetchedOrder(null);
    setIsLoading(false);
    return {
      success: false,
      message: response?.message || "Failed to fetch order status",
    };
  }, [dispatch, orderId, sessionId]);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshOrder();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshOrder]);
  return {
    order,
    isLoading,
    refreshOrder,
  };
}
