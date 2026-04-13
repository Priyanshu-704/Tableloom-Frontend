import { logger } from "../utils/logger.js";
import { axiosInstance } from "./api";
const TEST_SESSION_ID = "sess_634cc306334465fde6a5011813d95e1a_1773924197354";
let cachedCartData = null;
let cartRequestPromise = null;
const buildFailure = (error, fallbackMessage) => ({
  success: false,
  message:
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage,
  error: error?.response?.data?.error || error?.message || fallbackMessage,
  data: null,
});
const getValidSessionId = () => {
  const sessionId =
    cartService.sessionId ||
    sessionStorage.getItem("sessionId") ||
    localStorage.getItem("sessionId") ||
    TEST_SESSION_ID;
  if (sessionId === TEST_SESSION_ID) {
    sessionStorage.setItem("sessionId", TEST_SESSION_ID);
  }
  if (!sessionId) {
    throw new Error("No session ID available");
  }
  return sessionId;
};
const ensureSuccess = (response, fallbackMessage) => {
  if (!response?.data?.success) {
    throw new Error(response?.data?.message || fallbackMessage);
  }
  return response.data;
};
const extractCartData = (data) => {
  const cartData = data?.data ?? null;
  cachedCartData = cartData;
  cartRequestPromise = null;
  return cartData;
};
export const cartService = {
  sessionId: "",
  getCachedCart() {
    return cachedCartData;
  },
  setCachedCart(cartData) {
    cachedCartData = cartData || null;
  },
  clearCachedCart() {
    cachedCartData = null;
    cartRequestPromise = null;
  },
  setSessionId(sessionId) {
    this.sessionId = sessionId || "";
  },
  getCart: async (forceRefresh = false) => {
    try {
      if (!forceRefresh && cachedCartData) {
        return {
          success: true,
          data: cachedCartData,
          message: "Cart fetched successfully",
        };
      }
      if (!forceRefresh && cartRequestPromise) {
        return cartRequestPromise;
      }
      cartRequestPromise = axiosInstance
        .get("/cart", {
          params: {
            sessionId: getValidSessionId(),
          },
        })
        .then((response) => {
          const data = ensureSuccess(response, "Failed to get cart");
          return {
            success: true,
            data: extractCartData(data),
            message: data?.message || "Cart fetched successfully",
          };
        })
        .finally(() => {
          cartRequestPromise = null;
        });
      return await cartRequestPromise;
    } catch (error) {
      logger.error("Error getting cart:", error);
      cartRequestPromise = null;
      return buildFailure(error, "Failed to get cart");
    }
  },
  addItemToCart: async (
    menuItemId,
    quantity = 1,
    specialInstructions = "",
    sizeId = null,
  ) => {
    try {
      if (!menuItemId) {
        throw new Error("Menu item ID is required");
      }
      const payload = {
        sessionId: getValidSessionId(),
        menuItem: menuItemId,
        quantity: Math.max(1, Number(quantity) || 1),
        specialInstructions: String(specialInstructions || "").trim(),
      };
      if (sizeId) {
        payload.sizeId = sizeId;
      }
      const response = await axiosInstance.post("/cart/items", payload);
      const data = ensureSuccess(response, "Failed to add item to cart");
      return {
        success: true,
        data: extractCartData(data),
        message: data?.message || "Item added to cart successfully",
      };
    } catch (error) {
      logger.error("Error adding item to cart:", error);
      return buildFailure(error, "Failed to add item to cart");
    }
  },
  updateItemQuantity: async (menuItemId, delta, sizeId = null) => {
    try {
      if (!menuItemId) {
        throw new Error("Menu item ID is required");
      }
      if (![1, -1].includes(Number(delta))) {
        throw new Error("Quantity delta must be 1 or -1");
      }
      const payload = {
        sessionId: getValidSessionId(),
        delta: Number(delta),
      };
      if (sizeId) {
        payload.sizeId = sizeId;
      }
      const response = await axiosInstance.put(
        `/cart/items/${menuItemId}`,
        payload,
      );
      const data = ensureSuccess(response, "Failed to update item quantity");
      return {
        success: true,
        data: extractCartData(data),
        message: data?.message || "Item quantity updated successfully",
      };
    } catch (error) {
      logger.error("Error updating item quantity:", error);
      return buildFailure(error, "Failed to update item quantity");
    }
  },
  removeItemFromCart: async (menuItemId, sizeId = null) => {
    try {
      if (!menuItemId) {
        throw new Error("Menu item ID is required");
      }
      const payload = {
        sessionId: getValidSessionId(),
      };
      if (sizeId) {
        payload.sizeId = sizeId;
      }
      const response = await axiosInstance.delete(`/cart/items/${menuItemId}`, {
        data: payload,
      });
      const data = ensureSuccess(response, "Failed to remove item from cart");
      return {
        success: true,
        data: extractCartData(data),
        message: data?.message || "Item removed from cart successfully",
      };
    } catch (error) {
      logger.error("Error removing item from cart:", error);
      return buildFailure(error, "Failed to remove item from cart");
    }
  },
  clearCart: async () => {
    try {
      const response = await axiosInstance.delete("/cart", {
        data: {
          sessionId: getValidSessionId(),
        },
      });
      const data = ensureSuccess(response, "Failed to clear cart");
      extractCartData(data);
      return {
        success: true,
        data: data?.data ?? null,
        message: data?.message || "Cart cleared successfully",
      };
    } catch (error) {
      logger.error("Error clearing cart:", error);
      return buildFailure(error, "Failed to clear cart");
    }
  },
  applyDiscount: async (_discountAmount, discountCode = "") => {
    try {
      if (!String(discountCode || "").trim()) {
        throw new Error("Coupon code is required");
      }
      const response = await axiosInstance.put("/cart/discount", {
        sessionId: getValidSessionId(),
        discountAmount: 0,
        discountCode: String(discountCode).trim().toUpperCase(),
      });
      const data = ensureSuccess(response, "Failed to apply discount");
      return {
        success: true,
        data: data?.data ?? null,
        message: data?.message || "Discount applied successfully",
      };
    } catch (error) {
      logger.error("Error applying discount:", error);
      return buildFailure(error, "Failed to apply discount");
    }
  },
  checkoutCart: async (
    specialInstructions = "",
    paymentMethod = "cash",
    tableNumber = "",
  ) => {
    try {
      const response = await axiosInstance.post("/cart/checkout", {
        sessionId: getValidSessionId(),
        specialInstructions: String(specialInstructions || "").trim(),
        paymentMethod,
        ...(tableNumber
          ? {
              tableNumber,
            }
          : {}),
      });
      const data = ensureSuccess(response, "Failed to checkout cart");
      cartService.clearCachedCart();
      return {
        success: true,
        data: data?.data ?? null,
        message: data?.message || "Order placed successfully",
      };
    } catch (error) {
      logger.error("Error checking out cart:", error);
      return buildFailure(error, "Failed to checkout cart");
    }
  },
  getItemCount: async () => {
    try {
      const cart = await cartService.getCart();
      const summary = cart?.data?.summary || {};
      return {
        success: Boolean(cart?.success),
        count: summary?.itemCount || 0,
        total: summary?.total || 0,
        message: cart?.message,
      };
    } catch (error) {
      logger.error("Error getting item count:", error);
      return {
        success: false,
        count: 0,
        total: 0,
        message: error?.message || "Failed to get item count",
      };
    }
  },
  getCartSummary: async () => {
    try {
      const cart = await cartService.getCart();
      const cartData = cart?.data || {};
      const summary = cartData?.summary || {};
      if (!cart?.success) {
        return {
          success: false,
          message: cart?.message || "Failed to get cart summary",
        };
      }
      return {
        success: true,
        data: {
          itemCount: summary?.itemCount || 0,
          subtotal: summary?.subtotal || 0,
          tax: summary?.tax || 0,
          taxRate: summary?.taxRate || 0,
          taxInclusive: Boolean(summary?.taxInclusive),
          discount: summary?.discount || 0,
          itemDiscount: summary?.itemDiscount || 0,
          couponDiscount: summary?.couponDiscount || 0,
          appliedCoupon: summary?.appliedCoupon || null,
          deliveryFee: summary?.deliveryFee || 0,
          serviceCharge: summary?.serviceCharge || summary?.deliveryFee || 0,
          serviceChargeRate: summary?.serviceChargeRate || 0,
          currency: summary?.currency || "INR",
          currencySymbol: summary?.currencySymbol || "₹",
          total: summary?.total || 0,
          items: cartData?.items || [],
        },
      };
    } catch (error) {
      logger.error("Error getting cart summary:", error);
      return buildFailure(error, "Failed to get cart summary");
    }
  },
  isItemInCart: async (menuItemId, sizeId = null) => {
    try {
      const cart = cachedCartData
        ? {
            success: true,
            data: cachedCartData,
            message: "Cart fetched successfully",
          }
        : await cartService.getCart();
      const items = cart?.data?.items || [];
      const item =
        items.find((entry) => {
          const matchesMenuItem =
            String(entry?.menuItemId || entry?._id || "") ===
            String(menuItemId);
          const matchesSize = sizeId
            ? String(entry?.sizeId || "") === String(sizeId)
            : true;
          return matchesMenuItem && matchesSize;
        }) || null;
      return {
        success: Boolean(cart?.success),
        isInCart: Boolean(item),
        item,
        quantity: item?.quantity || 0,
        message: cart?.message,
      };
    } catch (error) {
      logger.error("Error checking if item is in cart:", error);
      return {
        success: false,
        isInCart: false,
        item: null,
        quantity: 0,
        message: error?.message || "Failed to check cart",
      };
    }
  },
  getCartTotals: async () => {
    try {
      const cart = await cartService.getCart();
      const cartData = cart?.data || {};
      const summary = cartData?.summary || {};
      if (!cart?.success) {
        return {
          success: false,
          message: cart?.message || "Failed to get cart totals",
        };
      }
      return {
        success: true,
        data: {
          items: cartData?.items || [],
          table: cartData?.table || null,
          summary,
          subtotal: summary?.subtotal || 0,
          tax: summary?.tax || 0,
          taxRate: summary?.taxRate || 0,
          taxInclusive: Boolean(summary?.taxInclusive),
          discount: summary?.discount || 0,
          itemDiscount: summary?.itemDiscount || 0,
          couponDiscount: summary?.couponDiscount || 0,
          appliedCoupon: summary?.appliedCoupon || null,
          deliveryFee: summary?.deliveryFee || 0,
          serviceCharge: summary?.serviceCharge || summary?.deliveryFee || 0,
          serviceChargeRate: summary?.serviceChargeRate || 0,
          currency: summary?.currency || "INR",
          currencySymbol: summary?.currencySymbol || "₹",
          total: summary?.total || 0,
          itemCount: summary?.itemCount || 0,
        },
      };
    } catch (error) {
      logger.error("Error getting cart totals:", error);
      return buildFailure(error, "Failed to get cart totals");
    }
  },
};
export default cartService;
