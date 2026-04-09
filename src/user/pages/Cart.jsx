import { logger } from "../../common/utils/logger.js";
import React, { useState, useEffect } from "react";
import { ArrowLeft, Trash2, Plus, Minus, ChefHat, Loader2 } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { useTranslation } from "../hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../common/NotificationContext";
import { useApp } from "../context/AppContext";
import { buildCustomerPath } from "../../common/utils/routes";
import { useSettings } from "../../common/context/SettingsContext";
export function Cart() {
  const {
    notify
  } = useNotification();
  const navigate = useNavigate();
  const {
    t
  } = useTranslation();
  const {
    dispatch,
    tableNumber
  } = useApp();
  const {
    settings
  } = useSettings();
  const {
    cart,
    cartSummary,
    loading,
    error,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout,
    fetchCart,
    applyDiscount
  } = useCart();
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const formatPrice = value => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: settings?.taxSettings?.currency || cart?.summary?.currency || cartSummary?.currency || "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
  const currentTableNumber = cart?.table?.number || cart?.table?.tableNumber || tableNumber || "1";
  const activeSummary = cart?.summary || cartSummary || null;
  const activeCouponCode = activeSummary?.appliedCoupon?.code || "";
  const isTaxInclusive = Boolean(activeSummary?.taxInclusive ?? settings?.taxSettings?.taxInclusive);
  useEffect(() => {
    let mounted = true;
    const loadCart = async () => {
      if (mounted) {
        await fetchCart();
      }
    };
    loadCart();
    return () => {
      mounted = false;
    };
  }, [fetchCart]);
  const handleIncrement = async (menuItemId, sizeId) => {
    const cartItem = cart?.items?.find(item => String(item.menuItemId || item._id) === String(menuItemId) && String(item.sizeId || "") === String(sizeId || ""));
    if (cartItem) {
      const result = await updateQuantity(menuItemId, 1, sizeId);
      if (!result.success) {
        notify(result.message || "Failed to update quantity", "error");
      }
    }
  };
  const handleDecrement = async (menuItemId, sizeId) => {
    const cartItem = cart?.items?.find(item => String(item.menuItemId || item._id) === String(menuItemId) && String(item.sizeId || "") === String(sizeId || ""));
    if (cartItem) {
      if (cartItem.quantity === 1) {
        const result = await removeFromCart(menuItemId, sizeId);
        if (!result.success) {
          notify(result.message || "Failed to remove item", "error");
        }
      } else {
        const result = await updateQuantity(menuItemId, -1, sizeId);
        if (!result.success) {
          notify(result.message || "Failed to update quantity", "error");
        }
      }
    }
  };
  const handleRemoveItem = async (menuItemId, sizeId) => {
    const result = await removeFromCart(menuItemId, sizeId);
    if (!result.success) {
      notify(result.message || "Failed to remove item", "error");
      return;
    }
    notify("Item removed from cart", "success");
  };
  const handleClearCart = async () => {
    const result = await clearCart();
    if (!result.success) {
      notify(result.message || "Failed to clear cart", "error");
      return;
    }
    notify("Cart cleared successfully", "success");
  };
  const handleApplyDiscount = async () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) {
      notify("Enter a valid coupon code", "warning");
      return;
    }
    setIsApplyingDiscount(true);
    try {
      const result = await applyDiscount(0, normalizedCode);
      if (!result.success) {
        notify(result.message || "Failed to apply coupon", "error");
        return;
      }
      setCouponCode("");
      notify(result.message || "Coupon applied successfully", "success");
    } finally {
      setIsApplyingDiscount(false);
    }
  };
  const handleOrderPlaced = order => {
    if (order) {
      dispatch({
        type: "SET_CURRENT_ORDER",
        payload: order
      });
    }
    navigate(buildCustomerPath(`/home/order-status/${order?._id || order?.id || ""}`));
    notify("Order placed successfully! Our chefs are now preparing your meal.", "success");
  };
  const handleSubmitOrder = async () => {
    if (!cart?.items || cart.items.length === 0) {
      notify("Your cart is empty", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await checkout(specialInstructions, "cash", currentTableNumber);
      if (result.success) {
        handleOrderPlaced(result.order || result.data);
      } else {
        notify(result.message || "Failed to place order", "error");
      }
    } catch (error) {
      logger.error("Failed to place order:", error);
      notify("Failed to place order. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  if (loading && (!cart || !cart.items)) {
    return <div className="max-w-2xl mx-auto p-4 pt-20">
        <div className="text-center py-12">
          <Loader2 className="h-16 w-16 text-primary-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">
            Loading your cart...
          </h2>
        </div>
      </div>;
  }
  if (error && (!cart || !cart.items)) {
    return <div className="max-w-2xl mx-auto p-4 pt-20">
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error loading cart
          </h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button onClick={fetchCart} className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold">
            Retry
          </button>
        </div>
      </div>;
  }
  if (!cart?.items || cart.items.length === 0) {
    return <div className="max-w-2xl mx-auto p-4 pt-20">
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t("emptyCart")}
          </h2>
          <p className="text-gray-500 mb-6">
            Add some delicious items from our menu
          </p>
          <button onClick={() => navigate(buildCustomerPath("/home/menu"))} className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold">
            {t("browseMenu")}
          </button>
        </div>
      </div>;
  }
  return <div className="mx-auto max-w-4xl pb-24">
      {}
      <div className="sticky top-[4.5rem] z-40 border-b border-gray-200 bg-white p-4 lg:top-0">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="cursor-pointer flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t("back")}
          </button>
          <h1 className="text-center text-lg font-bold text-gray-900 sm:text-xl">{t("yourOrder")}</h1>
          <div className="w-10 sm:w-16" />
        </div>
      </div>

      {}
      {cart?.table && <div className="border-b border-primary-100 bg-primary-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Table</p>
              <p className="text-lg font-bold text-primary-900">
                {cart.table.number || cart.table.tableNumber} • {cart.table.name || cart.table.tableName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-700">Items in cart</p>
              <p className="text-lg font-bold text-primary-900">
                {cart.summary?.itemCount || cart.items?.length || 0}
              </p>
            </div>
          </div>
        </div>}

      {}
      <div className="p-4 space-y-4">
        {cart.items.map(item => {
        const menuItemId = item.menuItemId || item._id;
        const sizeId = item.sizeId || null;
        const lineItemKey = `${menuItemId}-${sizeId || "default"}`;
        return <div key={lineItemKey} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                {}
                {(item.thumbnail || item.image) && <div className="w-16 h-16 flex-shrink-0 mr-4">
                    <img src={item.thumbnail || item.image} alt={item.name} className="w-full h-full object-cover rounded" loading="lazy" />
                  </div>}

                <div className="flex-1">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {item.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {item.size ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            Size: {item.size}
                          </span> : null}
                        <span className="text-sm text-gray-500">
                          Unit Price: {formatPrice(item.unitPrice)}
                        </span>
                        {item.unitDiscountAmount > 0 ? <span className="text-sm text-green-600">
                            Saved {formatPrice(item.unitDiscountAmount)} each
                          </span> : null}
                      </div>
                      <p className="text-primary-600 font-semibold">
                        {formatPrice(item.totalPrice || item.unitPrice * item.quantity)}
                      </p>
                    </div>

                    <div className="ml-0 flex items-center justify-between rounded-xl bg-slate-50 p-2 sm:ml-4 sm:justify-start sm:bg-transparent sm:p-0 sm:space-x-3">
                      <button onClick={() => handleDecrement(menuItemId, sizeId)} className="cursor-pointer p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                        <Minus className="h-4 w-4" />
                      </button>

                      <span className="font-semibold text-gray-900 min-w-8 text-center">
                        {item.quantity}
                      </span>

                      <button onClick={() => handleIncrement(menuItemId, sizeId)} className="cursor-pointer p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>

                      <button onClick={() => handleRemoveItem(menuItemId, sizeId)} className="cursor-pointer p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {item.instructions && <div className="mt-2 text-sm text-gray-600 italic">
                      Note: {item.instructions}
                    </div>}

                  <div className="mt-2 text-sm text-gray-600">
                    Subtotal: {formatPrice(item.totalPrice || item.unitPrice * item.quantity)}
                    {item.quantity > 1 && <span className="text-gray-500 ml-2">
                        ({formatPrice(item.unitPrice)} × {item.quantity})
                      </span>}
                  </div>
                </div>
              </div>
            </div>;
      })}
      </div>

      {}
      <div className="border-t border-gray-200 bg-white p-4">
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
          {t("specialInstructions")} ({t("optional")})
        </label>
        <textarea id="instructions" rows={3} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder={t("anySpecialRequests")} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
      </div>

      {}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label htmlFor="couponCode" className="mb-2 block text-sm font-medium text-gray-700">
            Apply Coupon
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="couponCode" type="text" value={couponCode} onChange={event => setCouponCode(event.target.value)} placeholder="Enter coupon code" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500" />
            <button type="button" onClick={handleApplyDiscount} disabled={isApplyingDiscount || loading} className="cursor-pointer w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-gray-400 sm:w-auto">
              {isApplyingDiscount ? "Applying..." : activeCouponCode ? "Replace Coupon" : "Apply Coupon"}
            </button>
          </div>
          {activeCouponCode ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <p>Active coupon: <span className="font-semibold">{activeCouponCode}</span></p>
              <p className="mt-1 text-xs text-emerald-600">Applying a new coupon will replace the current one.</p>
            </div> : null}
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Order Summary
          </h3>

          {cart?.summary ? <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">
                  {formatPrice(cart.summary.subtotal)}
                </span>
              </div>

              {cart.summary.tax > 0 && <div className="flex justify-between">
                  <span className="text-gray-600">
                    Tax {cart.summary.taxRate ? `(${cart.summary.taxRate}%)` : ""}
                    {cart.summary.taxInclusive ? " included" : ""}
                  </span>
                  <span>{formatPrice(cart.summary.tax || 0)}</span>
                  
                </div>}

              {cart.summary.itemDiscount > 0 && <div className="flex justify-between text-green-600">
                  <span>Item discounts</span>
                  <span>-{formatPrice(cart.summary.itemDiscount || 0)}</span>
                </div>}

              {cart.summary.couponDiscount > 0 && <div className="flex justify-between text-green-600">
                  <span>Coupon discount</span>
                  <span>-{formatPrice(cart.summary.couponDiscount || 0)}</span>
                </div>}

              {cart.summary.discount > 0 && <div className="flex justify-between text-green-600">
                  <span>Total savings</span>
                  <span>-{formatPrice(cart.summary.discount || 0)}</span>
                </div>}

              {cart.summary.serviceCharge > 0 && <div className="flex justify-between">
                  <span className="text-gray-600">
                    Service Charge {cart.summary.serviceChargeRate ? `(${cart.summary.serviceChargeRate}%)` : ""}
                  </span>
                  <span>{formatPrice(cart.summary.serviceCharge || 0)}</span>
                </div>}

              <div className="flex justify-between text-lg font-bold border-t pt-3 mt-2">
                <span>Total</span>
                <span>{formatPrice(cart.summary.total)}</span>
              </div>
            </div> : cartSummary ? <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">
                  {formatPrice(cartSummary.subtotal)}
                </span>
              </div>

              {cartSummary.tax > 0 && <div className="flex justify-between">
                  <span className="text-gray-600">
                    Tax {cartSummary.taxRate ? `(${cartSummary.taxRate}%)` : ""}
                    {cartSummary.taxInclusive ? " included" : ""}
                  </span>
                  <span>{formatPrice(cartSummary.tax)}</span>
                </div>}

              {cartSummary.itemDiscount > 0 && <div className="flex justify-between text-green-600">
                  <span>Item discounts</span>
                  <span>-{formatPrice(cartSummary.itemDiscount)}</span>
                </div>}

              {cartSummary.couponDiscount > 0 && <div className="flex justify-between text-green-600">
                  <span>Coupon discount</span>
                  <span>-{formatPrice(cartSummary.couponDiscount)}</span>
                </div>}

              {cartSummary.discount > 0 && <div className="flex justify-between text-green-600">
                  <span>Total savings</span>
                  <span>-{formatPrice(cartSummary.discount)}</span>
                </div>}

              {cartSummary.serviceCharge > 0 && <div className="flex justify-between">
                  <span className="text-gray-600">
                    Service Charge {cartSummary.serviceChargeRate ? `(${cartSummary.serviceChargeRate}%)` : ""}
                  </span>
                  <span>{formatPrice(cartSummary.serviceCharge)}</span>
                </div>}

              <div className="flex justify-between text-lg font-bold border-t pt-3 mt-2">
                <span>Total</span>
                <span>{formatPrice(cartSummary.total)}</span>
              </div>
            </div> : <div className="text-center py-4">
              <Loader2 className="h-6 w-6 text-primary-600 animate-spin mx-auto" />
              <p className="text-gray-500 mt-2">Calculating total...</p>
            </div>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={handleClearCart} disabled={loading || isSubmitting} className="w-full cursor-pointer rounded-lg bg-red-600 px-6 py-4 font-semibold text-white transition-colors duration-200 hover:bg-red-700 disabled:bg-gray-400">
            Clear All
          </button>

          <button onClick={handleSubmitOrder} disabled={isSubmitting || loading} className="w-full cursor-pointer bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center">
            {isSubmitting ? <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Placing Order...
              </> : <>
                {t("placeOrder")} •{" "}
                {formatPrice(cart?.summary?.total || cartSummary?.total || 0)}
              </>}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          {cart?.table ? `Your order will be prepared and served at Table ${cart.table.number} (${cart.table.name})` : "Your order will be prepared and served"}
        </p>
        {isTaxInclusive ? <p className="mt-1 text-center text-xs text-amber-600">
            Tax is already included in listed item prices for this restaurant.
          </p> : null}
      </div>
    </div>;
}
