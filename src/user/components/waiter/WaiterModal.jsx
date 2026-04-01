import { logger } from "../../../common/utils/logger.js";
import React from "react";
import { X, User, Clock, MessageCircle } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
const REASON_OPTIONS = [{
  id: "menu_help",
  label: "needHelpWithMenu",
  icon: MessageCircle
}, {
  id: "order_issue",
  label: "issueWithOrder",
  icon: Clock
}, {
  id: "bill_request",
  label: "requestBill",
  icon: User
}, {
  id: "other",
  label: "otherAssistance",
  icon: User
}];
export function WaiterModal({
  isOpen,
  onClose,
  tableNumber,
  onCallWaiter,
  initialReason = ""
}) {
  const {
    t
  } = useTranslation();
  const [customMessage, setCustomMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedReason, setSelectedReason] = React.useState(initialReason || "");
  React.useEffect(() => {
    if (!isOpen) {
      setCustomMessage("");
      setSelectedReason(initialReason || "");
      return;
    }
    setSelectedReason(initialReason || "");
  }, [initialReason, isOpen]);
  if (!isOpen) return null;
  const handleSubmit = async (reason = "", message = customMessage) => {
    if (!reason) return;
    setIsSubmitting(true);
    try {
      if (onCallWaiter) {
        await onCallWaiter(tableNumber, reason, message);
      }
    } catch (error) {
      logger.error("Failed to call waiter:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleQuickCall = reason => {
    setSelectedReason(reason);
  };
  const selectedReasonOption = REASON_OPTIONS.find(option => option.id === selectedReason);
  const handleSelectedReasonSubmit = () => {
    if (!selectedReason) {
      return;
    }
    handleSubmit(selectedReason, customMessage);
  };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="no-scrollbar mb-0 mt-0 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white sm:mb-10 sm:mt-[100px] sm:rounded-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t("callWaiter")}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("howCanWeHelpYou")}
            </h3>
            <p className="text-gray-600">
              {t("table")} {tableNumber}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REASON_OPTIONS.map(option => {
            const Icon = option.icon;
            const isSelected = selectedReason === option.id;
            return <button key={option.id} onClick={() => handleQuickCall(option.id)} disabled={isSubmitting} className={`rounded-lg border p-4 text-center transition-colors disabled:opacity-50 ${isSelected ? "border-primary-500 bg-primary-50" : "bg-gray-50 border-gray-200 hover:bg-primary-50 hover:border-primary-300"}`}>
                  <Icon className={`mx-auto mb-2 h-6 w-6 ${isSelected ? "text-primary-600" : "text-gray-600"}`} />
                  <span className={`text-sm font-medium ${isSelected ? "text-primary-700" : "text-gray-700"}`}>
                    {t(option.label)}
                  </span>
                </button>;
          })}
          </div>

          <div className="border-t border-gray-200 pt-6">
            {selectedReasonOption ? <div className="mb-4 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
                {t(selectedReasonOption.label)}
              </div> : null}
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t("orSendCustomMessage")}
            </label>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder={t("describeWhatYouNeed")} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" />
            <button onClick={handleSelectedReasonSubmit} disabled={!selectedReason || isSubmitting} className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg mt-3 transition-colors">
              {isSubmitting ? t("sending") : selectedReason ? t("sendMessageToWaiter") : t("callWaiter")}
            </button>
          </div>
        </div>
      </div>
    </div>;
}
