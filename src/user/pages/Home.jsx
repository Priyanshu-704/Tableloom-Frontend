import React, { useEffect, useState } from "react";
import { Receipt, Info, History, Utensils } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../common/NotificationContext";
import { useApp } from "../context/AppContext";
import { useSettings } from "../../common/context/SettingsContext";
import orderService from "../../common/services/orderService";
import { BrandBadge } from "../../common/components/BrandBadge";
import { buildCustomerPath } from "../../common/utils/routes";
export function Home() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const {
    tableNumber,
    sessionId,
    currentOrder,
    dispatch
  } = useApp();
  const {
    notify
  } = useNotification();
  const {
    settings
  } = useSettings();
  const currency = settings?.taxSettings?.currency || latestOrder?.currency || "INR";
  const [latestOrder, setLatestOrder] = useState(currentOrder || null);
  useEffect(() => {
    setLatestOrder(currentOrder || null);
  }, [currentOrder]);
  useEffect(() => {
    let active = true;
    const loadLatestOrder = async () => {
      if (!sessionId) {
        setLatestOrder(currentOrder || null);
        return;
      }
      const response = await orderService.getOrderHistoryBySession(sessionId, {
        limit: 1,
        summary: true
      });
      const nextOrder = Array.isArray(response?.data) ? response.data[0] || null : null;
      if (!active) {
        return;
      }
      setLatestOrder(nextOrder || currentOrder || null);
      const nextOrderId = nextOrder?._id || nextOrder?.id || "";
      const currentOrderId = currentOrder?._id || currentOrder?.id || "";
      if (nextOrder && nextOrderId && nextOrderId !== currentOrderId) {
        dispatch({
          type: "SET_CURRENT_ORDER",
          payload: nextOrder
        });
      }
    };
    loadLatestOrder();
    return () => {
      active = false;
    };
  }, [dispatch, sessionId]);
  const handleViewOrderHistory = () => {
    if (!sessionId && !latestOrder) {
      notify("No order history found for this session yet.", "info");
      return;
    }
    navigate(buildCustomerPath("/home/orders"));
  };
  return <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-100 pb-24">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-md text-center">
          
          <div className="mb-10 rounded-[2rem] bg-white/80 px-5 py-8 shadow-sm ring-1 ring-white/70 backdrop-blur sm:px-8">
            <BrandBadge logoSrc={settings?.restaurant?.logoThumbnail || settings?.restaurant?.logo || "/tableloom-mark.svg"} name={settings?.restaurant?.name || "Tableloom"} size="lg" className="justify-center mb-4" nameClassName="text-4xl text-gray-900" />
            <p className="text-gray-600 mb-4">
              {t("welcomeTo")} {t("digitalOrderingSystem")}
            </p>
            <div className="inline-block rounded-2xl bg-primary-50 p-4 shadow-sm">
              <p className="text-sm text-gray-600">{t("youAreAt")}</p>
              <p className="text-2xl font-bold text-primary-600">
                {t("table")} {tableNumber}
              </p>
            </div>
          </div>

          
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            <button onClick={() => navigate(buildCustomerPath("/home/menu"))} className="flex min-h-36 flex-col items-center justify-center rounded-3xl bg-primary-600 p-6 text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:bg-primary-700">
              <Utensils className="h-8 w-8 mb-2" />
              <span className="font-semibold">{t("startOrdering")}</span>
            </button>

            
            <button onClick={() => navigate(buildCustomerPath("/home/bill"))} className="flex min-h-36 flex-col items-center justify-center rounded-3xl bg-green-600 p-6 text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:bg-green-700">
              <Receipt className="h-8 w-8 mb-2" />
              <span className="font-semibold">{t("requestBill")}</span>
            </button>

            
            <button onClick={() => navigate(buildCustomerPath("/home/restaurant-info"))} className="flex min-h-36 flex-col items-center justify-center rounded-3xl bg-blue-600 p-6 text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:bg-blue-700">
              <Info className="h-8 w-8 mb-2" />
              <span className="font-semibold">{t("restaurantInfo")}</span>
            </button>

            
            <button onClick={handleViewOrderHistory} className="flex min-h-36 flex-col items-center justify-center rounded-3xl bg-purple-600 p-6 text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:bg-purple-700">
              <History className="h-8 w-8 mb-2" />
              <span className="font-semibold">{t("orderHistory")}</span>
            </button>
          </div>

          {latestOrder ? <div className="rounded-2xl border border-primary-100 bg-white/90 p-5 text-left shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-primary-700">
                    Continue with your order
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">
                    #{latestOrder.orderNumber || latestOrder._id || latestOrder.id}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 capitalize">
                    Status: {String(latestOrder.status || "pending").replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-600">
                    {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency,
                  maximumFractionDigits: 2
                }).format(Number(latestOrder.totalAmount || latestOrder.total || 0))}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(latestOrder.items || []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)}{" "}
                    items
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => navigate(buildCustomerPath(`/home/order-status/${latestOrder._id || latestOrder.id || ""}`))} className="cursor-pointer rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700">
                  View Current Order
                </button>
                <button type="button" onClick={() => navigate(buildCustomerPath("/home/orders"))} className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                  View Order History
                </button>
              </div>
            </div> : null}
        </div>
      </div>
    </div>;
}
