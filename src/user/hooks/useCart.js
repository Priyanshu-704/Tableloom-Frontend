import { useState, useEffect, useCallback, useRef } from "react";
import cartService from "../../common/services/cartService";
export function useCart(options = {}) {
  const {
    autoInitialize = true
  } = options;
  const [cart, setCart] = useState(null);
  const [cartSummary, setCartSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const syncCartState = useCallback(cartData => {
    setCart(cartData || null);
    if (!cartData) {
      setCartSummary(null);
      return;
    }
    const summary = cartData.summary || {};
    const items = cartData.items || [];
    setCartSummary({
      itemCount: summary.itemCount || 0,
      subtotal: summary.subtotal || 0,
      tax: summary.tax || 0,
      taxRate: summary.taxRate || 0,
      taxInclusive: Boolean(summary.taxInclusive),
      discount: summary.discount || 0,
      itemDiscount: summary.itemDiscount || 0,
      couponDiscount: summary.couponDiscount || 0,
      appliedCoupon: summary.appliedCoupon || null,
      deliveryFee: summary.deliveryFee || 0,
      serviceCharge: summary.serviceCharge || summary.deliveryFee || 0,
      serviceChargeRate: summary.serviceChargeRate || 0,
      currency: summary.currency || "INR",
      currencySymbol: summary.currencySymbol || "₹",
      total: summary.total || 0,
      table: cartData.table,
      items
    });
  }, []);
  const fetchCart = useCallback(async (forceRefresh = false) => {
    if (isFetchingRef.current && !forceRefresh) {
      return;
    }
    setLoading(true);
    setError(null);
    isFetchingRef.current = true;
    try {
      const result = await cartService.getCart(forceRefresh);
      if (result.success && mountedRef.current) {
        syncCartState(result.data);
        setError(null);
      } else if (mountedRef.current) {
        setError(result.message || "Failed to load cart");
        syncCartState(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || "Failed to fetch cart");
        syncCartState(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [syncCartState]);
  const fetchCartSummary = useCallback(async () => {
    try {
      const result = await cartService.getCartSummary();
      if (result.success) {
        setCartSummary(result.data);
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          message: result.message
        };
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || "Failed to fetch cart summary"
      };
    }
  }, []);
  const addToCart = useCallback(async (item, quantity = 1, specialInstructions = "", sizeId = null) => {
    setLoading(true);
    setError(null);
    try {
      const menuItemId = item._id || item.id;
      if (!menuItemId) {
        throw new Error("Item ID is required");
      }
      const result = await cartService.addItemToCart(menuItemId, quantity, specialInstructions, sizeId);
      if (result.success) {
        if (mountedRef.current) {
          syncCartState(result.data);
        }
        return {
          success: true,
          message: result.message,
          data: result.data
        };
      } else {
        setError(result.message);
        return {
          success: false,
          message: result.message
        };
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to add item to cart";
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [syncCartState]);
  const updateQuantity = useCallback(async (itemId, quantity, sizeId = null) => {
    setLoading(true);
    setError(null);
    try {
      if (!itemId) {
        throw new Error("Item ID is required");
      }
      const result = await cartService.updateItemQuantity(itemId, quantity, sizeId);
      if (result.success) {
        if (mountedRef.current) {
          syncCartState(result.data);
        }
        return {
          success: true,
          message: result.message
        };
      } else {
        setError(result.message);
        return {
          success: false,
          message: result.message
        };
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to update quantity";
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [syncCartState]);
  const removeFromCart = useCallback(async (itemId, sizeId = null) => {
    setLoading(true);
    setError(null);
    try {
      if (!itemId) {
        throw new Error("Item ID is required");
      }
      const result = await cartService.removeItemFromCart(itemId, sizeId);
      if (result.success) {
        if (mountedRef.current) {
          syncCartState(result.data);
        }
        return {
          success: true,
          message: result.message
        };
      } else {
        setError(result.message);
        return {
          success: false,
          message: result.message
        };
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to remove item";
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [syncCartState]);
  const clearCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.clearCart();
      if (result.success) {
        syncCartState(result.data);
        return {
          success: true,
          message: result.message
        };
      } else {
        setError(result.message);
        return {
          success: false,
          message: result.message
        };
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to clear cart";
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [syncCartState]);
  const getCartTotal = useCallback(async () => {
    try {
      const result = await cartService.getCartTotals();
      if (result.success) {
        const summary = result.data.summary || {};
        return {
          success: true,
          total: summary.total || 0,
          subtotal: summary.subtotal || 0,
          tax: summary.tax || 0,
          taxRate: summary.taxRate || 0,
          taxInclusive: Boolean(summary.taxInclusive),
          discount: summary.discount || 0,
          itemDiscount: summary.itemDiscount || 0,
          couponDiscount: summary.couponDiscount || 0,
          appliedCoupon: summary.appliedCoupon || null,
          deliveryFee: summary.deliveryFee || 0,
          serviceCharge: summary.serviceCharge || summary.deliveryFee || 0,
          serviceChargeRate: summary.serviceChargeRate || 0,
          currency: summary.currency || "INR",
          currencySymbol: summary.currencySymbol || "₹",
          itemCount: summary.itemCount || 0,
          table: result.data.table
        };
      } else {
        return {
          success: false,
          total: 0,
          message: result.message
        };
      }
    } catch (err) {
      return {
        success: false,
        total: 0,
        message: err.message || "Failed to get cart total"
      };
    }
  }, []);
  const getCartItemsCount = useCallback(async () => {
    try {
      const result = await cartService.getItemCount();
      if (result.success) {
        return {
          success: true,
          count: result.count || 0,
          total: result.total || 0
        };
      } else {
        return {
          success: false,
          count: 0,
          message: result.message
        };
      }
    } catch (err) {
      return {
        success: false,
        count: 0,
        message: err.message || "Failed to get cart count"
      };
    }
  }, []);
  const isItemInCart = useCallback(async (itemId, sizeId = null) => {
    try {
      const result = await cartService.isItemInCart(itemId, sizeId);
      return result;
    } catch (err) {
      return {
        success: false,
        isInCart: false,
        message: err.message || "Failed to check cart"
      };
    }
  }, []);
  const checkout = useCallback(async (specialInstructions = "", paymentMethod = "cash", tableNumber = "") => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.checkoutCart(specialInstructions, paymentMethod, tableNumber);
      if (result.success) {
        setCart(null);
        setCartSummary(null);
        return {
          success: true,
          message: result.message,
          order: result.data
        };
      } else {
        setError(result.message);
        return {
          success: false,
          message: result.message
        };
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to checkout";
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);
  const applyDiscount = useCallback(async (discountAmount, discountCode = "") => {
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.applyDiscount(discountAmount, discountCode);
      if (result.success) {
        await fetchCart(true);
        return {
          success: true,
          message: result.message
        };
      } else {
        setError(result.message);
        return {
          success: false,
          message: result.message
        };
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to apply discount";
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);
  useEffect(() => {
    mountedRef.current = true;
    const initializeCart = async () => {
      if (autoInitialize && mountedRef.current && !cart && !loading) {
        await fetchCart();
      }
    };
    initializeCart();
    return () => {
      mountedRef.current = false;
    };
  }, [autoInitialize, cart, fetchCart, loading]);
  return {
    cart,
    cartSummary,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout,
    applyDiscount,
    getCartTotal,
    getCartItemsCount,
    isItemInCart,
    fetchCart,
    fetchCartSummary,
    sessionId: cartService.sessionId
  };
}
