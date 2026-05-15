import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Download,
  Eye,
  Mail,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import customerSessionService from "../../common/services/CustomerSessionService";
import { useNotification } from "../../common/NotificationContext";
import { useSettings } from "../../common/context/SettingsContext";
import billService from "../../common/services/billService";
import { buildCustomerPath } from "../../common/utils/routes";
import loadRazorpayCheckout from "../../common/utils/loadRazorpayCheckout";
import { storeCompletedVisit } from "../utils/completedVisit";
const PAYMENT_LABELS = {
  online: "Online Payment",
  card: "Credit or Debit Card",
  upi: "UPI",
  wallet: "Wallet",
  cash: "Cash",
};
const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const normalizeBillItems = (payload = {}) => {
  if (Array.isArray(payload?.orders) && payload.orders.length > 0) {
    return payload.orders.flatMap((order, orderIndex) =>
      (order?.items || []).map((item, itemIndex) => ({
        id:
          item?._id ||
          `${order?._id || orderIndex}-${item?.menuItem?._id || itemIndex}`,
        name: item?.menuItem?.name || item?.name || "Menu item",
        size: item?.sizeName || item?.sizeId?.name || "",
        quantity: Number(item?.quantity) || 0,
        unitPrice: Number(item?.unitPrice || item?.price) || 0,
        totalPrice:
          Number(item?.totalPrice) ||
          (Number(item?.unitPrice || item?.price) || 0) *
            (Number(item?.quantity) || 0),
      })),
    );
  }
  if (Array.isArray(payload?.bill?.items) && payload.bill.items.length > 0) {
    return payload.bill.items.map((item, index) => ({
      id: item?._id || `${item?.menuItem || "bill-item"}-${index}`,
      name: item?.name || "Menu item",
      size: item?.size || "",
      quantity: Number(item?.quantity) || 0,
      unitPrice: Number(item?.unitPrice) || 0,
      totalPrice:
        Number(item?.totalPrice) ||
        (Number(item?.unitPrice) || 0) * (Number(item?.quantity) || 0),
    }));
  }
  const currentOrderItems = payload?.session?.currentOrder?.items || [];
  return currentOrderItems.map((item, index) => ({
    id: item?._id || `${item?.menuItem || "current-item"}-${index}`,
    name: item?.menuItem?.name || item?.name || "Menu item",
    size: item?.sizeName || item?.sizeId?.name || "",
    quantity: Number(item?.quantity) || 0,
    unitPrice: Number(item?.unitPrice || item?.price) || 0,
    totalPrice:
      Number(item?.totalPrice) ||
      (Number(item?.unitPrice || item?.price) || 0) *
        (Number(item?.quantity) || 0),
  }));
};
export function BillRequest() {
  const navigate = useNavigate();
  const { sessionId, tableNumber, customerInfo } = useApp();
  const { notify, clearNotifications } = useNotification();
  const { settings } = useSettings();
  const [billData, setBillData] = useState(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("online");
  const [splitCountInput, setSplitCountInput] = useState("2");
  const [lastPaymentSummary, setLastPaymentSummary] = useState(null);
  const paymentOptions = useMemo(() => {
    const configuredMethods = settings?.paymentMethods || {};
    const options = [
      configuredMethods.online !== false ? "online" : null,
      configuredMethods.card ? "card" : null,
      configuredMethods.upi ? "upi" : null,
      configuredMethods.digitalWallet ? "wallet" : null,
      configuredMethods.cash ? "cash" : null,
    ].filter(Boolean);
    return options.length > 0 ? options : ["cash"];
  }, [settings?.paymentMethods]);
  useEffect(() => {
    if (
      paymentOptions.length > 0 &&
      !paymentOptions.includes(selectedPayment)
    ) {
      setSelectedPayment(paymentOptions[0]);
    }
  }, [paymentOptions, selectedPayment]);
  useEffect(() => {
    const persistedPaymentMethod = billData?.session?.paymentMethod || "";
    if (
      persistedPaymentMethod &&
      paymentOptions.includes(persistedPaymentMethod) &&
      persistedPaymentMethod !== selectedPayment
    ) {
      setSelectedPayment(persistedPaymentMethod);
    }
  }, [billData?.session?.paymentMethod, paymentOptions, selectedPayment]);
  const loadBillData = useCallback(
    async (showRefresh = false) => {
      if (!sessionId) {
        setBillData(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const response =
          await customerSessionService.getSessionWithBill(sessionId);
        const payload = response?.data || null;
        if (!payload) {
          setBillData(null);
          return;
        }
        setEmail(payload?.session?.email || customerInfo?.email || "");
        setBillData({
          session: payload.session || null,
          summary: payload.summary || {},
          bill: payload.bill || null,
          orders: Array.isArray(payload.orders) ? payload.orders : [],
          items: normalizeBillItems(payload),
          hasBillableOrders: Boolean(payload.hasBillableOrders),
          allOrdersServed: Boolean(payload.allOrdersServed),
          blockedOrderCount: Number(payload.blockedOrderCount || 0),
          blockedStatuses: Array.isArray(payload.blockedStatuses)
            ? payload.blockedStatuses
            : [],
          paymentBlockedMessage: String(payload.paymentBlockedMessage || ""),
          canRequestBill: Boolean(payload.canRequestBill),
          canCompleteSession: Boolean(payload.canCompleteSession),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [customerInfo?.email, sessionId],
  );
  useEffect(() => {
    loadBillData();
  }, [loadBillData]);
  const applyPaidState = useCallback(
    (paymentResponse, fallbackMethod = selectedPayment) => {
      const paidBill = paymentResponse?.bill || null;
      const paidSession =
        paymentResponse?.session || paymentResponse?.customer || null;

      setLastPaymentSummary(paymentResponse || null);
      setBillData((current) => ({
        ...(current || {}),
        session: {
          ...(current?.session || {}),
          ...(paidSession || {}),
          sessionStatus:
            paidSession?.status || paidSession?.sessionStatus || "completed",
          paymentMethod:
            paidSession?.paymentMethod || fallbackMethod || "online",
          paymentStatus: paidSession?.paymentStatus || "paid",
        },
        bill: paidBill
          ? {
              ...(current?.bill || {}),
              _id: paidBill.id || paidBill._id || current?.bill?._id,
              billNumber: paidBill.billNumber || current?.bill?.billNumber,
              totalAmount: paidBill.totalAmount || current?.bill?.totalAmount,
              paymentStatus: paidBill.paymentStatus || "paid",
              pdfUrl: paidBill.pdfUrl || current?.bill?.pdfUrl || "",
            }
          : current?.bill,
      }));
    },
    [selectedPayment],
  );
  const sessionEmail = String(
    billData?.session?.email || customerInfo?.email || "",
  ).trim();
  const billDeliveryEmail = String(email || sessionEmail || "")
    .trim()
    .toLowerCase();
  const ensureBillEmail = () => {
    if (!billDeliveryEmail) {
      notify("Enter your email address to receive the bill.", "error");
      return false;
    }
    if (!isValidEmail(billDeliveryEmail)) {
      notify("Enter a valid email address to continue.", "error");
      return false;
    }
    return true;
  };
  const requestBillForSelection = async ({ notifyUser = true } = {}) => {
    if (!sessionId) {
      if (notifyUser) {
        notify("Customer session is not active", "error");
      }
      return null;
    }
    setIsRequestingBill(true);
    const response = await customerSessionService.requestBill(sessionId, {
      email: billDeliveryEmail,
      forceNew: false,
      paymentMethod: selectedPayment,
    });
    setIsRequestingBill(false);
    if (!response?.success) {
      if (notifyUser) {
        notify(response?.message || "Failed to request bill", "error");
      }
      return null;
    }
    if (notifyUser) {
      notify(response?.message || "Bill requested successfully", "success");
    }
    await loadBillData(true);
    return response;
  };
  const handleRequestBill = async () => {
    if (billData?.paymentBlockedMessage) {
      notify(billData.paymentBlockedMessage, "warning");
      return;
    }
    if (!ensureBillEmail()) {
      return;
    }
    await requestBillForSelection();
  };
  const openBillDocument = (mode = "view") => {
    const billId = billData?.bill?._id || lastPaymentSummary?.bill?.id;
    const pdfUrl =
      billData?.bill?.pdfUrl || lastPaymentSummary?.bill?.pdfUrl || "";
    const targetUrl =
      pdfUrl || (billId ? billService.getBillViewUrl(billId) : "");
    if (!targetUrl) {
      notify("Bill PDF is not available yet", "warning");
      return;
    }
    if (mode === "download") {
      const anchor = document.createElement("a");
      anchor.href = targetUrl;
      anchor.download = `bill-${billData?.bill?.billNumber || lastPaymentSummary?.bill?.billNumber || "receipt"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return;
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };
  const launchRazorpayCheckout = async () => {
    if (!sessionId || !billData?.summary?.totalAmount) {
      notify("Unable to process payment right now", "error");
      return;
    }
    if (!ensureBillEmail()) {
      return;
    }
    try {
      setIsPaying(true);
      const orderResponse = await customerSessionService.createRazorpayOrder(
        sessionId,
        {
          email: billDeliveryEmail,
          forceNew: false,
          paymentMethod: selectedPayment,
        },
      );

      if (!orderResponse?.success) {
        notify(
          orderResponse?.message || "Failed to create payment order",
          "error",
        );
        setIsPaying(false);
        return;
      }

      const orderPayload = orderResponse?.data?.order || null;
      const activeBill = orderResponse?.data?.bill || null;
      const activeSession = orderResponse?.data?.session || {};
      const razorpayKey = orderResponse?.data?.keyId || "";

      if (!orderPayload?.id || !activeBill?._id) {
        notify("Payment order is incomplete. Please try again.", "error");
        setIsPaying(false);
        return;
      }

      if (!razorpayKey) {
        notify(
          "Razorpay key is missing. Please add the Razorpay test key before retrying.",
          "error",
        );
        setIsPaying(false);
        return;
      }

      const RazorpayCheckout = await loadRazorpayCheckout();
      const checkout = new RazorpayCheckout({
        key: razorpayKey,
        amount: Number(orderPayload.amount || 0),
        currency: orderPayload.currency || currency,
        name:
          settings?.restaurantName ||
          settings?.restaurantInfo?.name ||
          "TableLoom",
        description: `Payment for Bill ${activeBill.billNumber || activeBill._id}`,
        order_id: orderPayload.id,
        prefill: {
          name: activeSession?.name || billData?.session?.name || "",
          email: activeSession?.email || billDeliveryEmail || "",
          contact:
            activeSession?.phone ||
            billData?.session?.phone ||
            customerInfo?.phone ||
            "",
        },
        notes: {
          billId: activeBill._id,
          billNumber: activeBill.billNumber || "",
          sessionId,
          preferredPaymentMethod: selectedPayment,
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          },
        },
        handler: async (paymentResult) => {
          const verificationResponse =
            await customerSessionService.verifyRazorpayPayment(sessionId, {
              billId: activeBill._id,
              paymentMethod: selectedPayment,
              razorpayOrderId:
                paymentResult?.razorpay_order_id || orderPayload.id,
              razorpayPaymentId: paymentResult?.razorpay_payment_id || "",
              razorpaySignature: paymentResult?.razorpay_signature || "",
            });

          setIsPaying(false);

          if (!verificationResponse?.success) {
            notify(
              verificationResponse?.message || "Payment verification failed",
              "error",
            );
            return;
          }

          applyPaidState(verificationResponse?.data || null, selectedPayment);
          const thankYouMessage =
            verificationResponse?.data?.thankYouMessage ||
            "Payment successful. Thank you for dining with us.";
          storeCompletedVisit({
            sessionId,
            billId:
              verificationResponse?.data?.bill?.id ||
              verificationResponse?.data?.bill?._id ||
              activeBill._id,
            billNumber:
              verificationResponse?.data?.bill?.billNumber ||
            activeBill.billNumber ||
            "",
            message: thankYouMessage,
          });
          try {
            await clearNotifications();
          } catch {
            // Keep the happy path moving even if notification cleanup fails.
          }
          notify(
            "Payment successful! Your bill is ready to view and download.",
            "success",
          );
          navigate(buildCustomerPath("/thank-you"), {
            replace: true,
            state: {
              message: thankYouMessage,
            },
          });
        },
      });

      checkout.on("payment.failed", (event) => {
        setIsPaying(false);
        notify(
          event?.error?.description || "Payment failed. Please try again.",
          "error",
        );
      });

      checkout.open();
    } catch (error) {
      setIsPaying(false);
      notify(error?.message || "Unable to start Razorpay checkout", "error");
    }
  };
  const handlePayment = async () => {
    if (billData?.paymentBlockedMessage) {
      notify(billData.paymentBlockedMessage, "warning");
      return;
    }
    if (!ensureBillEmail()) {
      return;
    }
    if (selectedPayment === "cash") {
      const response = await requestBillForSelection({
        notifyUser: false,
      });
      if (!response?.success) {
        notify(response?.message || "Failed to request cash payment", "error");
        return;
      }
      notify(
        "Cash payment selected. Staff has been notified. You can now logout to open the Thank You page.",
        "success",
      );
      return;
    }
    await launchRazorpayCheckout();
  };
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Receipt className="mx-auto mb-4 h-12 w-12 animate-pulse text-primary-600" />
          <p className="text-gray-600">Loading your bill details...</p>
        </div>
      </div>
    );
  }
  if (!billData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Bill details are not available
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            We could not load your session billing information right now.
          </p>
          <button
            type="button"
            onClick={() => navigate(buildCustomerPath("/home"))}
            className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }
  const currency = settings?.taxSettings?.currency || "INR";
  const isTaxInclusive = Boolean(
    billData?.bill?.taxInclusive ?? settings?.taxSettings?.taxInclusive,
  );
  const taxRate = Number(
    billData?.bill?.taxRate ?? settings?.taxSettings?.taxRate ?? 0,
  );
  const serviceChargeRate = Number(
    billData?.bill?.serviceChargeRate ??
      settings?.taxSettings?.serviceCharge ??
      0,
  );
  const totalAmount = Number(
    billData?.summary?.totalAmount || billData?.bill?.totalAmount || 0,
  );
  const hasGeneratedBill = Boolean(billData?.bill?._id);
  const isPaid =
    (billData?.bill?.paymentStatus || billData?.session?.paymentStatus) ===
    "paid";
  const splitBillEnabled = settings?.paymentMethods?.splitBill !== false;
  const normalizedSplitCount = Math.min(
    Math.max(Number(splitCountInput || 2) || 2, 2),
    12,
  );
  const splitPerPersonAmount =
    normalizedSplitCount > 0 ? totalAmount / normalizedSplitCount : totalAmount;
  const paymentBlockedMessage = String(
    billData?.paymentBlockedMessage || "",
  ).trim();
  const blockedStatusesLabel = (billData?.blockedStatuses || [])
    .map((status) => String(status || "").replace(/_/g, " "))
    .join(", ");
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => navigate(buildCustomerPath("/home"))}
            className="cursor-pointer flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Bill & Payment</h1>
          <button
            type="button"
            onClick={() => loadBillData(true)}
            className="cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-primary-600"
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Session Summary
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Table{" "}
                {billData?.session?.table?.tableNumber || tableNumber || "N/A"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {billData?.session?.name || "Guest"}
                {billData?.session?.phone ? ` • ${billData.session.phone}` : ""}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500">
                {hasGeneratedBill
                  ? `Bill #${billData.bill.billNumber || billData.bill._id}`
                  : "Bill preview"}
              </p>
              <p className="mt-2 text-3xl font-bold text-primary-600">
                {formatCurrency(totalAmount, currency)}
              </p>
              <p className="text-sm capitalize text-gray-500">
                Session status:{" "}
                {String(billData?.session?.sessionStatus || "active").replace(
                  /_/g,
                  " ",
                )}
              </p>
            </div>
          </div>

          {isPaid ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openBillDocument("view")}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-4 w-4" />
                View Bill
              </button>
              <button
                type="button"
                onClick={() => openBillDocument("download")}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Orders
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {Number(billData?.summary?.orderCount || 0)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Items
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {Number(
                  billData?.summary?.itemsCount || billData?.items?.length || 0,
                )}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Payment
              </p>
              <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
                {billData?.bill?.paymentStatus ||
                  billData?.session?.paymentStatus ||
                  "pending"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Generated
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {hasGeneratedBill ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {paymentBlockedMessage ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold text-amber-950">
                Payment is locked for now
              </p>
              <p className="mt-1">{paymentBlockedMessage}</p>
              {blockedStatusesLabel ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-amber-700">
                  Waiting on status: {blockedStatusesLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Bill Details
            </h3>
            {billData?.canRequestBill ? (
              <button
                type="button"
                onClick={handleRequestBill}
                disabled={isRequestingBill}
                className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequestingBill
                  ? "Requesting..."
                  : hasGeneratedBill
                    ? "Refresh Bill"
                    : "Request Bill"}
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {(billData?.items || []).map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {item.quantity}x {item.name}
                  </p>
                  {item.size ? (
                    <p className="text-sm text-gray-500">Size: {item.size}</p>
                  ) : null}
                </div>
                <p className="font-semibold text-gray-900 sm:text-right">
                  {formatCurrency(item.totalPrice, currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">
                {formatCurrency(billData?.summary?.subtotal || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Tax {taxRate ? `(${taxRate}%)` : ""}
                {isTaxInclusive ? " included" : ""}
              </span>
              <span className="text-gray-900">
                {formatCurrency(billData?.summary?.taxAmount || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Service Charge{" "}
                {serviceChargeRate ? `(${serviceChargeRate}%)` : ""}
              </span>
              <span className="text-gray-900">
                {formatCurrency(
                  billData?.summary?.serviceCharge || 0,
                  currency,
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="text-gray-900">
                -
                {formatCurrency(
                  billData?.summary?.discountAmount || 0,
                  currency,
                )}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-3 text-lg font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-primary-600">
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center text-lg font-semibold text-gray-900">
            <Mail className="mr-2 h-5 w-5 text-primary-600" />
            Bill Delivery
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Enter the email address where you want the bill delivered.
          </p>
          {isTaxInclusive ? (
            <p className="mt-2 text-xs text-amber-600">
              Listed item prices already include tax for this restaurant.
            </p>
          ) : null}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center text-lg font-semibold text-gray-900">
            <CreditCard className="mr-2 h-5 w-5 text-primary-600" />
            Payment Method
          </h3>
          <div className="mt-4 space-y-3">
            {paymentOptions.map((method) => {
              const isCash = method === "cash";
              const dimCashDescription = isCash && paymentOptions.length > 1;
              return (
                <label
                  key={method}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${selectedPayment === method ? "border-primary-600 bg-primary-50" : "border-gray-200"} ${dimCashDescription ? "opacity-70" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={method}
                    checked={selectedPayment === method}
                    onChange={(event) => setSelectedPayment(event.target.value)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {PAYMENT_LABELS[method] || method}
                    </p>
                    {isCash ? (
                      <p className="text-xs text-gray-500">
                        Cash payments are marked paid by admin, manager, or
                        waiter.
                      </p>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {splitBillEnabled && totalAmount > 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-emerald-950">
                  Equal Split
                </h3>
                <p className="mt-2 text-sm text-emerald-800">
                  Divide the current session bill equally before collecting
                  payment.
                </p>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
                  People
                </label>
                <input
                  type="number"
                  min="2"
                  max="12"
                  inputMode="numeric"
                  value={splitCountInput}
                  onChange={(event) => {
                    const nextValue = String(event.target.value || "").replace(
                      /[^\d]/g,
                      "",
                    );
                    if (!nextValue) {
                      setSplitCountInput("");
                      return;
                    }
                    setSplitCountInput(nextValue);
                  }}
                  onBlur={() =>
                    setSplitCountInput(String(normalizedSplitCount))
                  }
                  className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-950 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">
                  Total bill
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-950">
                  {formatCurrency(totalAmount, currency)}
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">
                  Per person
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-950">
                  {formatCurrency(splitPerPersonAmount, currency)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handlePayment}
          disabled={isPaying || !billData?.canCompleteSession}
          className="mb-28 flex w-full cursor-pointer items-center justify-center rounded-xl bg-primary-600 px-6 py-4 text-center font-semibold text-white shadow-lg hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          {isPaying
            ? "Processing..."
            : selectedPayment === "cash"
              ? "Request Cash Payment & Finish Visit"
              : `Pay ${formatCurrency(totalAmount, currency)} with ${PAYMENT_LABELS[selectedPayment] || "Razorpay"}`}
        </button>

       
      </div>
    </div>
  );
}
