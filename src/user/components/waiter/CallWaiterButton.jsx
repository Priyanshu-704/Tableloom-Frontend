import { logger } from "../../../common/utils/logger.js";
import React, { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
export function CallWaiterButton({
  className = "",
  tableNumber,
  onCallWaiter,
  hasActiveCall = false,
  inline = false
}) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    t
  } = useTranslation();
  const handleCallWaiter = async () => {
    if (isLoading || hasActiveCall) return;
    setIsLoading(true);
    try {
      if (onCallWaiter) {
        await onCallWaiter(tableNumber);
      }
    } catch (error) {
      logger.error("Failed to call waiter:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return <div className={inline ? "w-full" : "fixed bottom-4 right-6 z-50"}>
      {hasActiveCall ? <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-3 animate-pulse">
          <Check className="h-5 w-5" />
          <span className="font-semibold">{t("waiterNotified")}</span>
          <X className={`h-4 w-4 ${className}`} />
        </div> : <button onClick={handleCallWaiter} disabled={isLoading} className={`bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 flex items-center space-x-2 ${className}`}>
          {isLoading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <Bell className="h-6 w-6" />}
          <span className="font-semibold">{t("callWaiter")}</span>
        </button>}
    </div>;
}
