import React, { useState } from "react";
import { useEffect } from "react";
import { ShoppingCart, Bell, MessageSquareText, LogOut } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useNotification } from "../../../common/NotificationContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { useTranslation } from "../../hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useSettings } from "../../../common/context/SettingsContext";
import customerSessionService from "../../../common/services/CustomerSessionService";
import { BrandBadge } from "../../../common/components/BrandBadge";
import { buildCustomerPath } from "../../../common/utils/routes";
export function Header() {
  const {
    tableNumber,
    sessionId,
    dispatch
  } = useApp();
  const navigate = useNavigate();
  const {
    getCartItemsCount
  } = useCart();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications
  } = useNotification();
  const {
    t
  } = useTranslation();
  const {
    settings
  } = useSettings();
  const [showNotifications, setShowNotifications] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    let mounted = true;
    const loadCount = async () => {
      const result = await getCartItemsCount();
      if (mounted) {
        setCartCount(Number(result?.count) || 0);
      }
    };
    loadCount();
    const intervalId = window.setInterval(loadCount, 5000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [getCartItemsCount]);
  const handleLogout = async () => {
    if (!sessionId || loggingOut) {
      return;
    }
    try {
      setLoggingOut(true);
      await customerSessionService.logoutFromSession(sessionId);
      dispatch({
        type: "CLEAR_SESSION"
      });
      await clearNotifications();
      navigate(buildCustomerPath("/"), {
        replace: true
      });
    } catch (error) {
      const message = error?.message || error?.response?.data?.message || "Unable to logout right now. Please try again.";
      window.showNotification?.(message, "error");
    } finally {
      setLoggingOut(false);
    }
  };
  return <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/88 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 sm:flex-nowrap sm:py-2">
          <button type="button" onClick={() => navigate(buildCustomerPath("/home"))} className="flex min-w-0 flex-1 items-center text-left sm:flex-none">
            <BrandBadge logoSrc={settings?.restaurant?.logo || "/tableloom-mark.svg"} name={settings?.restaurant?.name || "Tableloom"} size="sm" nameClassName="max-w-[8rem] text-base text-slate-900 sm:max-w-[14rem] sm:text-xl" />
            {tableNumber && <span className="ml-2 rounded-full bg-primary-100 px-2 py-1 text-xs text-primary-700 shadow-sm sm:ml-4 sm:text-sm">
                {t("table")} {tableNumber}
              </span>}
          </button>

          <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:gap-3">
            <LanguageSwitcher />

            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-sky-50 hover:text-primary-600">
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>}
              </button>

              {showNotifications && <div className="absolute right-0 z-50 mt-2 w-[min(96vw,24rem)] rounded-2xl border border-sky-100 bg-white shadow-xl shadow-sky-100/50">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 p-4">
                    <h3 className="font-semibold text-gray-900">
                      {t("notifications")}
                    </h3>
                    <div className="flex w-full flex-wrap items-center gap-3 text-sm sm:w-auto">
                      <button onClick={markAllNotificationsRead} className="text-primary-600 hover:text-primary-700">
                        Mark all read
                      </button>
                      <button onClick={clearNotifications} className="text-red-600 hover:text-red-700">
                        {t("clearAll")}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? <div className="p-6 text-sm text-gray-500">No notifications yet.</div> : notifications.map(notification => <button key={notification._id} type="button" onClick={() => markNotificationRead(notification._id)} className={`block w-full border-b border-sky-50 p-4 text-left last:border-b-0 hover:bg-sky-50/60 ${notification.isRead ? "bg-white" : "bg-primary-50/50"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.title || "Notification"}
                              </p>
                              <p className="mt-1 text-sm text-gray-700">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.isRead ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-600" /> : null}
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            {new Date(notification.createdAt || Date.now()).toLocaleString()}
                          </p>
                        </button>)}
                  </div>
                </div>}
            </div>

            <button onClick={() => navigate(buildCustomerPath("/home/feedback"))} className="rounded-full p-2 text-slate-600 transition-colors hover:bg-sky-50 hover:text-primary-600" aria-label="Feedback">
              <MessageSquareText className="h-6 w-6" />
            </button>

            <button onClick={() => navigate(buildCustomerPath("/home/cart"))} className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-sky-50 hover:text-primary-600">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>}
            </button>

            {sessionId ? <button type="button" onClick={handleLogout} disabled={loggingOut} className="rounded-full p-2 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Logout">
                <LogOut className="h-6 w-6" />
              </button> : null}
          </div>
        </div>
      </div>
    </header>;
}
