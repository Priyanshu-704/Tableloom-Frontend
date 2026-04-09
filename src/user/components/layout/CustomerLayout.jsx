import React from "react";
import { useApp } from "../../context/AppContext";
import { useNotification } from "../../../common/NotificationContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useWaiterCall } from "../../hooks/useWaiterCall";
import { Outlet, useLocation } from "react-router-dom";
import { stripTenantPrefix } from "../../../common/utils/routes";
import { WaiterModal } from "../waiter/WaiterModal";
import { Header } from "./Header";
import { CallWaiterButton } from "../waiter/CallWaiterButton";
import { ToastContainer } from "../common/Toast";
function CustomerLayout() {
  const {
    notify,
    toasts,
    removeToast
  } = useNotification();
  const {
    t
  } = useTranslation();
  const {
    tableNumber
  } = useApp();
  const [showWaiterModal, setShowWaiterModal] = React.useState(false);
  const {
    callWaiter,
    isCalling,
    activeCall
  } = useWaiterCall();
  const location = useLocation();
  const scopedPath = stripTenantPrefix(location.pathname);
  const hideHeader = ["/", "/home", "/home/order-status", "/home/restaurant-info", "/home/bill"].includes(scopedPath);
  const hideFooter = ["/", "/home", "/home/restaurant-info"].includes(scopedPath);
  const handleCallWaiter = async (tableNum, reason, customMessage) => {
    const response = await callWaiter(reason, customMessage);
    if (response?.success) {
      notify("Waiter has been notified! They will be with you shortly.", "waiter");
      setShowWaiterModal(false);
      return;
    }
    notify(response?.message || "Failed to call waiter. Please try again.", "error");
  };
  return <div className="customer-scope min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_22%,#ffffff_100%)]">
      {}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {}
      <WaiterModal isOpen={showWaiterModal} onClose={() => setShowWaiterModal(false)} tableNumber={tableNumber} onCallWaiter={handleCallWaiter} />

      {}
      {!hideHeader && <Header />}

      {}
      <Outlet />

      {}
      {!hideFooter && <div className="fixed bottom-0 left-0 z-40 w-full border-t border-sky-100 bg-white/92 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-12px_30px_rgba(8,47,73,0.08)] backdrop-blur">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:gap-4">
          <button onClick={() => handleCallWaiter(tableNumber, "quick_assist")} disabled={isCalling || Boolean(activeCall)} className="flex min-h-[3.25rem] min-w-0 items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-center text-white shadow-md transition-colors hover:bg-primary-700 disabled:bg-gray-400">
            {isCalling ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <span className="font-semibold text-sm">{t("quickHelp")}</span>}
          </button>

          <CallWaiterButton inline tableNumber={tableNumber} onCallWaiter={() => setShowWaiterModal(true)} hasActiveCall={Boolean(activeCall)} className="flex min-h-[3.25rem] w-full min-w-0 items-center justify-center rounded-xl px-4 py-3 text-center text-sm shadow-md hover:scale-100" />
        </div>
        </div>}
    </div>;
}
export default CustomerLayout;
