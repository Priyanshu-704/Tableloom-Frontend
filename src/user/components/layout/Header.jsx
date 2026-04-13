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
  const { tableNumber, sessionId, dispatch } = useApp();
  const navigate = useNavigate();
  const { getCartItemsCount } = useCart({
    autoInitialize: false,
  });
  const {
    notifications,
    unreadCount,
    notify,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useNotification();
  const { t } = useTranslation();
  const { settings } = useSettings();
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
      const response =
        await customerSessionService.logoutFromSession(sessionId);
      const shouldRedirectToThankYou = Boolean(
        response?.data?.redirectToThankYou,
      );
      const thankYouMessage =
        response?.data?.thankYouMessage || "Thank you for visiting us.";
      notify(response?.message || "Logged out successfully.", "success");
      try {
        await clearNotifications();
      } catch (notificationError) {
        notify(
          notificationError?.message ||
            "Logged out, but we could not clear old notifications.",
          "warning",
        );
      }
      dispatch({
        type: "CLEAR_SESSION",
      });
      navigate(
        buildCustomerPath(shouldRedirectToThankYou ? "/thank-you" : "/"),
        {
          replace: true,
          state: shouldRedirectToThankYou
            ? {
                message: thankYouMessage,
              }
            : null,
        },
      );
    } catch (error) {
      const message =
        error?.message ||
        error?.response?.data?.message ||
        "Unable to logout right now. Please try again.";
      notify(message, "error");
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/88 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 py-3 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2">
          <div className="flex items-start justify-between gap-3 sm:min-w-0 sm:flex-1 sm:items-center">
            <button
              type="button"
              onClick={() => navigate(buildCustomerPath("/home"))}
              className="flex min-w-0 flex-1 flex-col items-start text-left sm:flex-row sm:items-center sm:gap-3"
            >
              <BrandBadge
                logoSrc={
                  settings?.restaurant?.logoThumbnail ||
                  settings?.restaurant?.logo ||
                  "/tableloom-mark.svg"
                }
                name={settings?.restaurant?.name || "Tableloom"}
                size="sm"
                nameClassName="max-w-[10rem] text-base text-slate-900 sm:max-w-[14rem] sm:text-xl"
              />
              {tableNumber ? (
                <span className="mt-2 rounded-full bg-primary-100 px-2 py-1 text-xs text-primary-700 shadow-sm sm:mt-0 sm:text-sm">
                  {t("table")} {tableNumber}
                </span>
              ) : null}
            </button>

            {sessionId ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full p-2 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 sm:hidden"
                aria-label="Logout"
              >
                <LogOut className="h-6 w-6" />
              </button>
            ) : null}
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,2.75rem))] gap-2 sm:flex sm:w-auto sm:grid-cols-none sm:items-center sm:justify-end sm:gap-3">
            <div className="min-w-0">
              <LanguageSwitcher />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-sky-50 hover:text-primary-600 sm:w-auto sm:rounded-full sm:border-transparent"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 w-[min(96vw,24rem)] rounded-2xl border border-sky-100 bg-white shadow-xl shadow-sky-100/50">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 p-4">
                    <h3 className="font-semibold text-gray-900">
                      {t("notifications")}
                    </h3>
                    <div className="flex w-full flex-wrap items-center gap-3 text-sm sm:w-auto">
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        Mark all read
                      </button>
                      <button
                        onClick={clearNotifications}
                        className="text-red-600 hover:text-red-700"
                      >
                        {t("clearAll")}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-sm text-gray-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification._id}
                          type="button"
                          onClick={() => markNotificationRead(notification._id)}
                          className={`block w-full border-b border-sky-50 p-4 text-left last:border-b-0 hover:bg-sky-50/60 ${notification.isRead ? "bg-white" : "bg-primary-50/50"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.title || "Notification"}
                              </p>
                              <p className="mt-1 text-sm text-gray-700">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.isRead ? (
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-600" />
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            {new Date(
                              notification.createdAt || Date.now(),
                            ).toLocaleString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(buildCustomerPath("/home/feedback"))}
              className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-sky-50 hover:text-primary-600 sm:rounded-full sm:border-transparent"
              aria-label="Feedback"
            >
              <MessageSquareText className="h-6 w-6" />
            </button>

            <button
              onClick={() => navigate(buildCustomerPath("/home/cart"))}
              className="relative flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-sky-50 hover:text-primary-600 sm:rounded-full sm:border-transparent"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {sessionId ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="hidden rounded-full p-2 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
                aria-label="Logout"
              >
                <LogOut className="h-6 w-6" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
