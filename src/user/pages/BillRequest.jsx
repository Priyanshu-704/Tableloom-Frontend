import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, CreditCard, Download, Eye, Mail, QrCode, Receipt, RefreshCw, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import customerSessionService from "../../common/services/CustomerSessionService";
import { useNotification } from "../../common/NotificationContext";
import { useSettings } from "../../common/context/SettingsContext";
import billService from "../../common/services/billService";
import { buildCustomerPath } from "../../common/utils/routes";
const PAYMENT_LABELS = {
  online: "Online Payment",
  card: "Credit or Debit Card",
  upi: "UPI",
  wallet: "Wallet",
  cash: "Cash"
};
const formatCurrency = (value, currency = "INR") => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency,
  maximumFractionDigits: 2
}).format(Number(value || 0));
const normalizeBillItems = (payload = {}) => {
  if (Array.isArray(payload?.orders) && payload.orders.length > 0) {
    return payload.orders.flatMap((order, orderIndex) => (order?.items || []).map((item, itemIndex) => ({
      id: item?._id || `${order?._id || orderIndex}-${item?.menuItem?._id || itemIndex}`,
      name: item?.menuItem?.name || item?.name || "Menu item",
      size: item?.sizeName || item?.sizeId?.name || "",
      quantity: Number(item?.quantity) || 0,
      unitPrice: Number(item?.unitPrice || item?.price) || 0,
      totalPrice: Number(item?.totalPrice) || (Number(item?.unitPrice || item?.price) || 0) * (Number(item?.quantity) || 0)
    })));
  }
  if (Array.isArray(payload?.bill?.items) && payload.bill.items.length > 0) {
    return payload.bill.items.map((item, index) => ({
      id: item?._id || `${item?.menuItem || "bill-item"}-${index}`,
      name: item?.name || "Menu item",
      size: item?.size || "",
      quantity: Number(item?.quantity) || 0,
      unitPrice: Number(item?.unitPrice) || 0,
      totalPrice: Number(item?.totalPrice) || (Number(item?.unitPrice) || 0) * (Number(item?.quantity) || 0)
    }));
  }
  const currentOrderItems = payload?.session?.currentOrder?.items || [];
  return currentOrderItems.map((item, index) => ({
    id: item?._id || `${item?.menuItem || "current-item"}-${index}`,
    name: item?.menuItem?.name || item?.name || "Menu item",
    size: item?.sizeName || item?.sizeId?.name || "",
    quantity: Number(item?.quantity) || 0,
    unitPrice: Number(item?.unitPrice || item?.price) || 0,
    totalPrice: Number(item?.totalPrice) || (Number(item?.unitPrice || item?.price) || 0) * (Number(item?.quantity) || 0)
  }));
};
export function BillRequest() {
  const navigate = useNavigate();
  const {
    sessionId,
    tableNumber,
    customerInfo
  } = useApp();
  const {
    notify
  } = useNotification();
  const {
    settings
  } = useSettings();
  const [billData, setBillData] = useState(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("online");
  const [splitCountInput, setSplitCountInput] = useState("2");
  const [lastPaymentSummary, setLastPaymentSummary] = useState(null);
  const [paymentQrState, setPaymentQrState] = useState({
    isOpen: false,
    loading: false,
    qrCode: "",
    upiId: "",
    amount: 0,
    billId: "",
    billNumber: ""
  });
  const paymentOptions = useMemo(() => {
    const configuredMethods = settings?.paymentMethods || {};
    const options = [configuredMethods.online !== false ? "online" : null, configuredMethods.card ? "card" : null, configuredMethods.upi ? "upi" : null, configuredMethods.digitalWallet ? "wallet" : null, configuredMethods.cash ? "cash" : null].filter(Boolean);
    return options.length > 0 ? options : ["online", "card", "upi", "cash"];
  }, [settings?.paymentMethods]);
  useEffect(() => {
    if (paymentOptions.length > 0 && !paymentOptions.includes(selectedPayment)) {
      setSelectedPayment(paymentOptions[0]);
    }
  }, [paymentOptions, selectedPayment]);
  useEffect(() => {
    const persistedPaymentMethod = billData?.session?.paymentMethod || "";
    if (persistedPaymentMethod && paymentOptions.includes(persistedPaymentMethod) && persistedPaymentMethod !== selectedPayment) {
      setSelectedPayment(persistedPaymentMethod);
    }
  }, [billData?.session?.paymentMethod, paymentOptions, selectedPayment]);
  const loadBillData = useCallback(async (showRefresh = false) => {
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
      const response = await customerSessionService.getSessionWithBill(sessionId);
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
        canRequestBill: Boolean(payload.canRequestBill),
        canCompleteSession: Boolean(payload.canCompleteSession)
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [customerInfo?.email, sessionId]);
  useEffect(() => {
    loadBillData();
  }, [loadBillData]);
  const sessionEmail = String(billData?.session?.email || customerInfo?.email || "").trim();
  const billDeliveryEmail = sessionEmail || String(email || "").trim();
  const requestBillForSelection = async ({
    notifyUser = true
  } = {}) => {
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
      paymentMethod: selectedPayment
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
    await requestBillForSelection();
  };
  const openBillDocument = (mode = "view") => {
    const billId = billData?.bill?._id || lastPaymentSummary?.bill?.id;
    const pdfUrl = billData?.bill?.pdfUrl || lastPaymentSummary?.bill?.pdfUrl || "";
    const targetUrl = pdfUrl || (billId ? billService.getBillViewUrl(billId) : "");
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
  const completeOnlinePayment = async () => {
    if (!sessionId || !billData?.summary?.totalAmount) {
      notify("Unable to process payment right now", "error");
      return;
    }
    setIsPaying(true);
    const response = await customerSessionService.completeSessionOnline(sessionId, {
      paymentMethod: selectedPayment,
      transactionId: `txn_${Date.now()}`,
      amount: Number(billData?.summary?.totalAmount || 0),
      gateway: selectedPayment
    });
    setIsPaying(false);
    if (response?.success) {
      const paidBill = response?.data?.bill || null;
      const paidSession = response?.data?.session || null;
      setLastPaymentSummary(response?.data || null);
      setBillData(current => ({
        ...(current || {}),
        session: {
          ...(current?.session || {}),
          ...(paidSession || {}),
          sessionStatus: paidSession?.status || "completed",
          paymentMethod: paidSession?.paymentMethod || selectedPayment,
          paymentStatus: paidSession?.paymentStatus || "paid"
        },
        bill: paidBill ? {
          ...(current?.bill || {}),
          _id: paidBill.id || paidBill._id || current?.bill?._id,
          billNumber: paidBill.billNumber || current?.bill?.billNumber,
          totalAmount: paidBill.totalAmount || current?.bill?.totalAmount,
          paymentStatus: paidBill.paymentStatus || "paid",
          pdfUrl: paidBill.pdfUrl || current?.bill?.pdfUrl || ""
        } : current?.bill
      }));
      notify("Payment successful! Your bill is ready to view and download.", "success");
      setPaymentQrState({
        isOpen: false,
        loading: false,
        qrCode: "",
        upiId: "",
        amount: 0,
        billId: "",
        billNumber: ""
      });
      await loadBillData(true);
      return;
    }
    notify(response?.message || "Failed to complete payment", "error");
  };
  const openPaymentQr = async () => {
    if (!sessionId || !billData?.summary?.totalAmount) {
      notify("Unable to process payment right now", "error");
      return;
    }
    if (selectedPayment === "cash") {
      notify("Cash payment is handled by the staff from the admin panel.", "info");
      return;
    }
    let activeBillId = billData?.bill?._id || "";
    let activeBillNumber = billData?.bill?.billNumber || "";
    if (!activeBillId) {
      setIsRequestingBill(true);
      const billResponse = await customerSessionService.requestBill(sessionId, {
        email: billDeliveryEmail,
        forceNew: false,
        paymentMethod: selectedPayment
      });
      setIsRequestingBill(false);
      if (!billResponse?.success) {
        notify(billResponse?.message || "Failed to request bill", "error");
        return;
      }
      notify(billResponse?.message || "Bill requested successfully", "success");
      await loadBillData(true);
      activeBillId = billResponse?.data?.bill?._id || billResponse?.data?.bill?.id || billData?.bill?._id || "";
      activeBillNumber = billResponse?.data?.bill?.billNumber || billData?.bill?.billNumber || "";
    }
    if (!activeBillId) {
      notify("Bill is not ready yet. Please try again.", "warning");
      return;
    }
    setPaymentQrState({
      isOpen: true,
      loading: true,
      qrCode: "",
      upiId: "",
      amount: Number(billData?.summary?.totalAmount || 0),
      billId: activeBillId,
      billNumber: activeBillNumber
    });
    const qrResponse = await billService.getPaymentQr(activeBillId);
    if (!qrResponse?.success) {
      setPaymentQrState(current => ({
        ...current,
        loading: false
      }));
      notify(qrResponse?.message || "Failed to generate payment QR", "error");
      return;
    }
    setPaymentQrState({
      isOpen: true,
      loading: false,
      qrCode: qrResponse?.data?.qrCode || "",
      upiId: qrResponse?.data?.upiId || "",
      amount: Number(qrResponse?.data?.amount || billData?.summary?.totalAmount || 0),
      billId: activeBillId,
      billNumber: qrResponse?.data?.billNumber || activeBillNumber
    });
  };
  const handlePayment = async () => {
    if (selectedPayment === "cash") {
      const response = await requestBillForSelection({
        notifyUser: false
      });
      if (!response?.success) {
        notify(response?.message || "Failed to request cash payment", "error");
        return;
      }
      notify("Cash payment selected. Staff has been notified. You can now logout to open the Thank You page.", "success");
      return;
    }
    await openPaymentQr();
  };
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Receipt className="mx-auto mb-4 h-12 w-12 animate-pulse text-primary-600" />
          <p className="text-gray-600">Loading your bill details...</p>
        </div>
      </div>;
  }
  if (!billData) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Bill details are not available
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            We could not load your session billing information right now.
          </p>
          <button type="button" onClick={() => navigate(buildCustomerPath("/home"))} className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
            Back to Home
          </button>
        </div>
      </div>;
  }
  const currency = settings?.taxSettings?.currency || "INR";
  const isTaxInclusive = Boolean(billData?.bill?.taxInclusive ?? settings?.taxSettings?.taxInclusive);
  const taxRate = Number(billData?.bill?.taxRate ?? settings?.taxSettings?.taxRate ?? 0);
  const serviceChargeRate = Number(billData?.bill?.serviceChargeRate ?? settings?.taxSettings?.serviceCharge ?? 0);
  const totalAmount = Number(billData?.summary?.totalAmount || billData?.bill?.totalAmount || 0);
  const hasGeneratedBill = Boolean(billData?.bill?._id);
  const isPaid = (billData?.bill?.paymentStatus || billData?.session?.paymentStatus) === "paid";
  const splitBillEnabled = settings?.paymentMethods?.splitBill !== false;
  const normalizedSplitCount = Math.min(Math.max(Number(splitCountInput || 2) || 2, 2), 12);
  const splitPerPersonAmount = normalizedSplitCount > 0 ? totalAmount / normalizedSplitCount : totalAmount;
  return <div className="min-h-screen bg-gray-50 pb-24">
      {paymentQrState.isOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Scan To Pay</h2>
              <button type="button" onClick={() => setPaymentQrState({
            isOpen: false,
            loading: false,
            qrCode: "",
            upiId: "",
            amount: 0,
            billId: "",
            billNumber: ""
          })} className="cursor-pointer rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              Scan this QR with your payment app to pay{" "}
              <span className="font-semibold text-gray-900">
                {formatCurrency(paymentQrState.amount, settings?.taxSettings?.currency || "INR")}
              </span>
              .
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              {paymentQrState.loading ? <div className="py-10">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-600" />
                  <p className="mt-3 text-sm text-gray-600">Generating payment QR...</p>
                </div> : paymentQrState.qrCode ? <>
                  <img src={paymentQrState.qrCode} alt="Payment QR" className="mx-auto h-64 w-64 rounded-2xl border border-white bg-white p-3 shadow-sm" />
                  <p className="mt-4 text-sm text-gray-500">
                    UPI ID:{" "}
                    <span className="font-medium text-gray-900">{paymentQrState.upiId}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Bill:{" "}
                    <span className="font-medium text-gray-900">
                      {paymentQrState.billNumber || "Current bill"}
                    </span>
                  </p>
                </> : <div className="py-10">
                  <QrCode className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-3 text-sm text-gray-600">Payment QR is not available.</p>
                </div>}
            </div>

            <div className="mt-5 space-y-3">
              <button type="button" onClick={completeOnlinePayment} disabled={isPaying || paymentQrState.loading || !paymentQrState.qrCode} className="w-full cursor-pointer rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isPaying ? "Confirming Payment..." : "I Have Paid, Verify Now"}
              </button>
              <button type="button" onClick={() => setPaymentQrState({
            isOpen: false,
            loading: false,
            qrCode: "",
            upiId: "",
            amount: 0,
            billId: "",
            billNumber: ""
          })} className="w-full cursor-pointer rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div> : null}

      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <button type="button" onClick={() => navigate(buildCustomerPath("/home"))} className="cursor-pointer flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Bill & Payment</h1>
          <button type="button" onClick={() => loadBillData(true)} className="cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-primary-600">
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
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
                Table {billData?.session?.table?.tableNumber || tableNumber || "N/A"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {billData?.session?.name || "Guest"}
                {billData?.session?.phone ? ` • ${billData.session.phone}` : ""}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500">
                {hasGeneratedBill ? `Bill #${billData.bill.billNumber || billData.bill._id}` : "Bill preview"}
              </p>
              <p className="mt-2 text-3xl font-bold text-primary-600">
                {formatCurrency(totalAmount, currency)}
              </p>
              <p className="text-sm capitalize text-gray-500">
                Session status: {String(billData?.session?.sessionStatus || "active").replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {isPaid ? <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => openBillDocument("view")} className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Eye className="h-4 w-4" />
                View Bill
              </button>
              <button type="button" onClick={() => openBillDocument("download")} className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div> : null}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Orders</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {Number(billData?.summary?.orderCount || 0)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Items</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {Number(billData?.summary?.itemsCount || billData?.items?.length || 0)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payment</p>
              <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
                {billData?.bill?.paymentStatus || billData?.session?.paymentStatus || "pending"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Generated</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {hasGeneratedBill ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Bill Details</h3>
            {billData?.canRequestBill ? <button type="button" onClick={handleRequestBill} disabled={isRequestingBill} className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isRequestingBill ? "Requesting..." : hasGeneratedBill ? "Refresh Bill" : "Request Bill"}
              </button> : null}
          </div>

          <div className="mt-4 space-y-3">
            {(billData?.items || []).map(item => <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.quantity}x {item.name}
                  </p>
                  {item.size ? <p className="text-sm text-gray-500">Size: {item.size}</p> : null}
                </div>
                <p className="font-semibold text-gray-900 sm:text-right">
                  {formatCurrency(item.totalPrice, currency)}
                </p>
              </div>)}
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
                Tax {taxRate ? `(${taxRate}%)` : ""}{isTaxInclusive ? " included" : ""}
              </span>
              <span className="text-gray-900">
                {formatCurrency(billData?.summary?.taxAmount || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Service Charge {serviceChargeRate ? `(${serviceChargeRate}%)` : ""}
              </span>
              <span className="text-gray-900">
                {formatCurrency(billData?.summary?.serviceCharge || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="text-gray-900">
                -{formatCurrency(billData?.summary?.discountAmount || 0, currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-3 text-lg font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-primary-600">{formatCurrency(totalAmount, currency)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center text-lg font-semibold text-gray-900">
            <Mail className="mr-2 h-5 w-5 text-primary-600" />
            Bill Delivery
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {sessionEmail ? "Using the email captured when this dining session was created." : "Provide an email address if you want the generated bill sent there as well."}
          </p>
          {isTaxInclusive ? <p className="mt-2 text-xs text-amber-600">
              Listed item prices already include tax for this restaurant.
            </p> : null}
          <input type="email" value={sessionEmail || email} onChange={event => setEmail(event.target.value)} placeholder="Enter your email address" readOnly={Boolean(sessionEmail)} className={`mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none ${sessionEmail ? "cursor-not-allowed bg-slate-100 text-slate-600" : ""}`} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center text-lg font-semibold text-gray-900">
            <CreditCard className="mr-2 h-5 w-5 text-primary-600" />
            Payment Method
          </h3>
          <div className="mt-4 space-y-3">
            {paymentOptions.map(method => {
            const isCash = method === "cash";
            return <label key={method} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${selectedPayment === method ? "border-primary-600 bg-primary-50" : "border-gray-200"} ${isCash ? "opacity-70" : ""}`}>
                  <input type="radio" name="payment-method" value={method} checked={selectedPayment === method} onChange={event => setSelectedPayment(event.target.value)} className="text-primary-600 focus:ring-primary-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {PAYMENT_LABELS[method] || method}
                    </p>
                    {isCash ? <p className="text-xs text-gray-500">
                        Cash payments are marked paid by admin, manager, or waiter.
                      </p> : null}
                  </div>
                </label>;
          })}
          </div>
        </div>

        {splitBillEnabled && totalAmount > 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-emerald-950">Equal Split</h3>
                <p className="mt-2 text-sm text-emerald-800">
                  Divide the current session bill equally before collecting payment.
                </p>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
                  People
                </label>
                <input type="number" min="2" max="12" inputMode="numeric" value={splitCountInput} onChange={event => {
              const nextValue = String(event.target.value || "").replace(/[^\d]/g, "");
              if (!nextValue) {
                setSplitCountInput("");
                return;
              }
              setSplitCountInput(nextValue);
            }} onBlur={() => setSplitCountInput(String(normalizedSplitCount))} className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-950 focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Total bill</p>
                <p className="mt-2 text-2xl font-bold text-emerald-950">
                  {formatCurrency(totalAmount, currency)}
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Per person</p>
                <p className="mt-2 text-2xl font-bold text-emerald-950">
                  {formatCurrency(splitPerPersonAmount, currency)}
                </p>
              </div>
            </div>
          </div> : null}

        <button type="button" onClick={handlePayment} disabled={isPaying || !billData?.canCompleteSession} className="mb-28 flex w-full cursor-pointer items-center justify-center rounded-xl bg-primary-600 px-6 py-4 text-center font-semibold text-white shadow-lg hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
          <CheckCircle className="mr-2 h-5 w-5" />
          {isPaying ? "Processing..." : selectedPayment === "cash" ? "Request Cash Payment & Finish Visit" : `Show QR To Pay ${formatCurrency(totalAmount, currency)}`}
        </button>

        {selectedPayment !== "cash" ? <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Choose an online method to open a payment QR, scan it from your UPI or payment app,
            and then confirm payment here. The final paid bill stays available for view and download.
          </div> : <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
            If cash is selected, the bill remains pending until an admin, manager, or waiter
            marks it paid from the admin billing panel.
          </div>}

        {!billData?.canCompleteSession ? <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
            No billable orders were found for this session yet.
          </div> : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <User className="mt-1 h-5 w-5 text-primary-600" />
            <div>
              <h4 className="font-semibold text-slate-900">Admin and User Flow</h4>
              <p className="mt-1 text-sm text-slate-600">
                Customers can preview the bill, request the final bill, and complete online
                payment here. Staff can still manage pending bills, mark cash payments, send
                bill emails, and download PDFs from the admin bill panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>;
}
