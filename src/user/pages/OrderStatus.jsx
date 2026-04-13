import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  Truck,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useOrderStatus } from "../../user/hooks/useOrderStatus";
import { ORDER_STATUS } from "../../common/utils/constants";
import { useApp } from "../context/AppContext";
import { useWaiterCall } from "../hooks/useWaiterCall";
import { useNotification } from "../../common/NotificationContext";
import { useNavigate, useParams } from "react-router-dom";
import { WaiterModal } from "../components/waiter/WaiterModal";
import { buildCustomerPath } from "../../common/utils/routes";
import { useSettings } from "../../common/context/SettingsContext";
const FINAL_STATUS_KEY = ORDER_STATUS.SERVED;
const STATUS_STEPS = [
  {
    key: ORDER_STATUS.PENDING,
    label: "Order Placed",
    icon: Clock,
    description: "We have received your order",
  },
  {
    key: ORDER_STATUS.CONFIRMED,
    label: "Order Confirmed",
    icon: CheckCircle2,
    description: "Kitchen is preparing your food",
  },
  {
    key: ORDER_STATUS.PREPARING,
    label: "Preparing",
    icon: ChefHat,
    description: "Our chefs are cooking your meal",
  },
  {
    key: ORDER_STATUS.READY,
    label: "Ready to Serve",
    icon: Utensils,
    description: "Your order is ready",
  },
  {
    key: ORDER_STATUS.SERVED,
    label: "Served",
    icon: Truck,
    description: "Enjoy your meal!",
  },
];
const getResolvedOrderStatus = (status) =>
  status === "completed" ? FINAL_STATUS_KEY : status;
export function OrderStatus({ onBack }) {
  const params = useParams();
  const navigate = useNavigate();
  const routeOrderId = params?.orderId;
  const { order, isLoading, refreshOrder } = useOrderStatus(routeOrderId);
  const { state } = useApp();
  const { settings } = useSettings();
  const { notify } = useNotification();
  const { callWaiter, isCalling } = useWaiterCall();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [waiterModalState, setWaiterModalState] = useState({
    isOpen: false,
    reason: "",
  });
  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings?.taxSettings?.currency || order?.currency || "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  const tableNumber = state.tableInfo?.tableNumber;
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrder();
    setIsRefreshing(false);
  };
  const handleCallWaiter = async (reason, customMessage = "") => {
    const response = await callWaiter(reason, customMessage);
    if (response?.success) {
      notify(
        "Waiter has been notified! They will be with you shortly.",
        "waiter",
      );
      return;
    }
    notify(
      response?.message || "Failed to call waiter. Please try again.",
      "error",
    );
  };
  const handleQuickCall = (reason) => {
    setWaiterModalState({
      isOpen: true,
      reason,
    });
  };
  const handleRequestBill = () => {
    handleCallWaiter("bill_request", "Please bring the bill to the table");
    notify("Bill request sent! Your waiter will be with you shortly.", "info");
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading order status...</p>
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No active order found
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Start ordering from the menu and your live order updates will appear
            here.
          </p>
          <button
            onClick={() => navigate(buildCustomerPath("/home/menu"))}
            className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }
  const getCurrentStepIndex = () => {
    return STATUS_STEPS.findIndex(
      (step) => step.key === getResolvedOrderStatus(order.status),
    );
  };
  const getEstimatedTime = () => {
    const fallbackPreparationTime = Number(order?.preparationTime || 0);
    const fallbackReadyAt =
      fallbackPreparationTime > 0
        ? new Date(
            // eslint-disable-next-line react-hooks/purity
            new Date(order?.createdAt || Date.now()).getTime() +
              fallbackPreparationTime * 60000,
          )
        : null;
    const estimated = order.estimatedReadyTime
      ? new Date(order.estimatedReadyTime)
      : fallbackReadyAt;
    if (!estimated) return 0;
    const now = new Date();
    const diffMs = estimated - now;
    const diffMins = Math.max(0, Math.round(diffMs / 60000));
    return diffMins;
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const currentStepIndex = getCurrentStepIndex();
  const resolvedStatus = getResolvedOrderStatus(order.status);
  const isFinalStatus = resolvedStatus === FINAL_STATUS_KEY;
  return (
    <div className="min-h-screen bg-gray-50 mb-14">
      <WaiterModal
        isOpen={waiterModalState.isOpen}
        onClose={() =>
          setWaiterModalState({
            isOpen: false,
            reason: "",
          })
        }
        tableNumber={tableNumber}
        onCallWaiter={handleCallWaiter}
        initialReason={waiterModalState.reason}
      />

      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (onBack) {
                  onBack();
                  return;
                }
                navigate(-1);
              }}
              className="cursor-pointer flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Order Status</h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="cursor-pointer p-2 text-gray-600 hover:text-primary-600 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Order #{order.orderNumber || order.id || order._id || "Current"}
              </h2>
              <p className="text-gray-600">Table {tableNumber}</p>
              <p className="mt-1 text-sm capitalize text-gray-500">
                Payment:{" "}
                {String(order?.paymentStatus || "pending").replace(/_/g, " ")}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">
                {formatCurrency(order?.total || 0)}
              </div>
              <div className="text-sm text-gray-500">
                {order?.createdAt
                  ? new Date(order.createdAt).toLocaleTimeString()
                  : "--:--"}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-medium text-gray-900 mb-2">Order Items:</h3>
            <div className="space-y-2">
              {(order?.items || []).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity}x {item.name}
                    {item?.sizeName ? ` (${item.sizeName})` : ""}
                  </span>
                  <span className="text-gray-900">
                    {formatCurrency(item.totalPrice || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {order.specialInstructions && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Special Instructions:
              </h3>
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                {order.specialInstructions}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Order Progress
            </h2>
            {!isFinalStatus && (
              <div className="text-sm text-gray-600">
                Est. {getEstimatedTime()} min
              </div>
            )}
          </div>

          <div className="space-y-4">
            {STATUS_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div
                  key={step.key}
                  className="flex items-start space-x-4 relative"
                >
                  {index < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute left-7 w-0.5 h-12 -bottom-12 ${isCompleted ? "bg-primary-600" : "bg-gray-300"}`}
                    />
                  )}

                  <div
                    className={`relative z-10 shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${isCompleted ? "bg-primary-600 text-white" : isCurrent ? "bg-primary-100 text-primary-600 border-2 border-primary-600" : "bg-gray-100 text-gray-400"}`}
                  >
                    <StepIcon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 pt-1">
                    <h3
                      className={`font-medium ${isCompleted || isCurrent ? "text-gray-900" : "text-gray-500"}`}
                    >
                      {step.label}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {step.description}
                    </p>
                    {isCurrent && !isFinalStatus ? (
                      <div className="flex items-center mt-2 text-sm text-primary-600">
                        <Clock className="h-4 w-4 mr-1" />
                        In progress...
                      </div>
                    ) : null}
                    {(isCompleted || (isFinalStatus && isCurrent)) && (
                      <div className="flex items-center mt-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Time Tracking</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(timeElapsed)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Time Elapsed</div>
            </div>
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary-600">
                {getEstimatedTime()} min
              </div>
              <div className="text-sm text-primary-600 mt-1">
                Estimated Wait
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
          <h3 className="font-semibold text-orange-900 mb-2">
            Need Help with Your Order?
          </h3>
          <p className="text-orange-800 text-sm mb-4">
            If there is an issue with your order or you need general assistance,
            our staff is here to help.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickCall("order_issue")}
              disabled={isCalling}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1"
            >
              {isCalling ? "Calling..." : "Order Issue"}
            </button>
            <button
              onClick={() => handleQuickCall("menu_help")}
              disabled={isCalling}
              className="bg-white hover:bg-gray-50 disabled:bg-gray-200 text-orange-600 border border-orange-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1"
            >
              {isCalling ? "Calling..." : "Need Help"}
            </button>
          </div>
        </div>

        {order.status === ORDER_STATUS.SERVED && (
          <div className="bg-green-50  rounded-lg border border-green-200 p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Order Complete!
            </h3>
            <p className="text-green-800 mb-4">
              Thank you for dining with us. We hope you enjoyed your meal!
            </p>
            <button
              onClick={handleRequestBill}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Request Bill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
