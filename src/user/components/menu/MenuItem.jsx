import { logger } from "../../../common/utils/logger.js";
import React, { useState, useEffect } from "react";
import { Plus, Minus, ChevronDown, X } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useTranslation } from "../../hooks/useTranslation";
import { useSettings } from "../../../common/context/SettingsContext";
export function MenuItem({
  item
}) {
  const {
    addToCart,
    updateQuantity,
    removeFromCart,
    isItemInCart
  } = useCart({
    autoInitialize: false
  });
  const {
    t
  } = useTranslation();
  const {
    settings
  } = useSettings();
  const [selectedSize, setSelectedSize] = useState(item.sizes?.[0] || null);
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [cartItemInfo, setCartItemInfo] = useState({
    quantity: 0,
    item: null
  });
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formatPrice = value => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: settings?.taxSettings?.currency || "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
  useEffect(() => {
    const checkCartStatus = async () => {
      if (!item.id) return;
      setCheckingStatus(true);
      try {
        const result = await isItemInCart(item.id, selectedSize?.id);
        if (result.success) {
          setCartItemInfo({
            quantity: result.quantity,
            item: result.item
          });
        }
      } catch (error) {
        logger.error("Error checking cart status:", error);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkCartStatus();
  }, [item.id, selectedSize?.id, isItemInCart]);
  const handleSizeSelect = size => {
    setSelectedSize(size);
  };
  const handleAdd = async (sizeOverride = null) => {
    if (item.sizes?.length > 1 && !selectedSize && !sizeOverride) {
      setShowSizeSelector(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const activeSize = sizeOverride || selectedSize || item.sizes?.[0] || null;
      const result = await addToCart(item, 1, "", activeSize?.id);
      if (result.success) {
        setSelectedSize(activeSize);
        setShowSizeSelector(false);
        setCartItemInfo(current => ({
          ...current,
          quantity: current.quantity + 1
        }));
      } else {
        logger.error("Failed to add item:", result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleIncrement = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateQuantity(item.id, 1, selectedSize?.id);
      if (!result.success) {
        logger.error("Failed to increment quantity:", result.message);
        return;
      }
      setCartItemInfo(current => ({
        ...current,
        quantity: current.quantity + 1
      }));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDecrement = async () => {
    setIsSubmitting(true);
    try {
      if (cartItemInfo.quantity === 1) {
        const result = await removeFromCart(item.id, selectedSize?.id);
        if (!result.success) {
          logger.error("Failed to remove item:", result.message);
          return;
        }
        setCartItemInfo({
          quantity: 0,
          item: null
        });
      } else {
        const result = await updateQuantity(item.id, -1, selectedSize?.id);
        if (!result.success) {
          logger.error("Failed to decrement quantity:", result.message);
          return;
        }
        setCartItemInfo(current => ({
          ...current,
          quantity: Math.max(0, current.quantity - 1)
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const getDisplayPrice = () => {
    if (selectedSize) {
      return Number(selectedSize.price || 0);
    }
    return Number(item.sizes?.[0]?.price || item.price || 0);
  };
  const getOriginalPrice = () => {
    if (selectedSize) {
      return Number(selectedSize.originalPrice || selectedSize.price || 0);
    }
    return Number(item.prices?.[0]?.price || item.price || 0);
  };
  return <>
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {}
        <div className="h-40 w-full flex-shrink-0 sm:h-24 sm:w-24">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>

        {}
        <div className="flex-1 p-4">
          <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
            {item.description}
          </p>

          {}
          {item.sizes?.length > 1 && <div className="mb-2">
              <button type="button" onClick={() => setShowSizeSelector(true)} className="flex w-full items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-left">
                <div className="min-w-0 flex-1 text-sm text-gray-700">
                  {selectedSize ? `${selectedSize.name} - ${formatPrice(selectedSize.price)}` : "Choose a size"}
                </div>
                <span className="rounded-md p-1 text-gray-600">
                  <ChevronDown className={`h-4 w-4 transition-transform ${showSizeSelector ? "rotate-180" : ""}`} />
                </span>
              </button>
            </div>}

          {}
          {item.sizes?.length === 1 && <div className="text-sm text-gray-500 mb-2">
              {item.sizes[0].name} - {formatPrice(item.sizes[0].price)}
            </div>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="text-lg font-bold text-primary-600">
                {formatPrice(getDisplayPrice())}
              </span>
              {getOriginalPrice() > getDisplayPrice() ? <span className="ml-2 text-sm text-gray-400 line-through">
                  {formatPrice(getOriginalPrice())}
                </span> : null}
            </div>

            {}
            {checkingStatus || isSubmitting ? <div className="h-10 w-full rounded-lg bg-gray-100 animate-pulse sm:w-20"></div> : cartItemInfo.quantity > 0 ? <div className="flex w-full items-center justify-between rounded-xl bg-primary-50 px-3 py-2 sm:w-auto sm:justify-start sm:bg-transparent sm:px-0 sm:py-0 sm:space-x-2">
                <button onClick={handleDecrement} disabled={isSubmitting} className="p-1 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors disabled:opacity-50">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-semibold text-gray-900 min-w-8 text-center">
                  {cartItemInfo.quantity}
                </span>
                <button onClick={handleIncrement} disabled={isSubmitting} className="p-1 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors disabled:opacity-50">
                  <Plus className="h-4 w-4" />
                </button>
              </div> : <button onClick={handleAdd} disabled={checkingStatus || isSubmitting || item.sizes?.length === 0} className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {item.sizes?.length === 0 ? "Not Available" : t("addToCart")}
              </button>}
          </div>
        </div>
      </div>

      {}
      {item.isVegetarian && <div className="absolute top-2 left-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
          Veg
        </div>}

      {item.preparationTime && <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          {item.preparationTime} min
        </div>}

      {item.activeDiscount?.isActive ? <div className="absolute bottom-2 left-2 rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800">
          {item.activeDiscount.type === "percentage" ? `${item.activeDiscount.value}% OFF` : `Save ${formatPrice(item.activeDiscount.value)}`}
        </div> : null}
    </div>

    {showSizeSelector ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={() => setShowSizeSelector(false)}>
        <div className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl" onClick={event => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
              <p className="text-sm text-slate-500">Select a size to add this item</p>
            </div>
            <button type="button" onClick={() => setShowSizeSelector(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close size selection">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-5">
            {item.sizes.map(size => {
            const isActiveSize = selectedSize?.id === size.id;
            return <div key={size.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isActiveSize ? "border-primary-500 bg-primary-50" : "border-slate-200 bg-white"}`}>
                  <button type="button" onClick={() => handleSizeSelect(size)} className="min-w-0 flex-1 text-left">
                    <div className="font-medium text-slate-900">{size.name}</div>
                    <div className="text-sm text-slate-500">{formatPrice(size.price)}</div>
                  </button>

                  <button type="button" onClick={() => handleAdd(size)} disabled={isSubmitting} className="ml-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50">
                    Add
                  </button>
                </div>;
          })}
          </div>
        </div>
      </div> : null}
    </>;
}
