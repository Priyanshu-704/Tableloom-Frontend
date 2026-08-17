import { logger } from "../../common/utils/logger.js";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CreditCard,
  Download,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { billService } from "../../common/services";
import { useAuth } from "../../common/context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import AdminPagination from "../components/common/AdminPagination";
import { AdminModal } from "../components/common/AdminModal";
import { AdminPageSkeleton } from "../components/common/AdminSkeleton";
import ResponsiveFilterSection from "../components/common/ResponsiveFilterSection";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { useSettings } from "../../common/context/SettingsContext";
const PAGE_SIZE = 12;
const PAYMENT_STATUS_OPTIONS = [
  {
    value: "all",
    label: "All Payments",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
  {
    value: "failed",
    label: "Failed",
  },
];
const BILL_STATUS_OPTIONS = [
  {
    value: "all",
    label: "All Bill States",
  },
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "sent",
    label: "Sent",
  },
  {
    value: "viewed",
    label: "Viewed",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "finalized",
    label: "Finalized",
  },
];
const PAYMENT_METHOD_OPTIONS = [
  {
    value: "all",
    label: "All Methods",
  },
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "card",
    label: "Card",
  },
  {
    value: "online",
    label: "Online",
  },
  {
    value: "upi",
    label: "UPI",
  },
  {
    value: "wallet",
    label: "Wallet",
  },
  {
    value: "pending",
    label: "Pending",
  },
];
const MANUAL_PAYMENT_METHOD_OPTIONS = PAYMENT_METHOD_OPTIONS.filter((option) =>
  ["cash", "card", "upi", "wallet"].includes(option.value),
);
const paymentBadgeClasses = {
  pending: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  refunded: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
};
const billBadgeClasses = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-indigo-100 text-indigo-700",
  paid: "bg-emerald-100 text-emerald-700",
  finalized: "bg-violet-100 text-violet-700",
};
const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";
export function BillManagement() {
  const { addNotification } = useAdmin();
  const { settings } = useSettings();
  const { hasAnyPermission, hasPermission } = useAuth();
  const currency = settings?.taxSettings?.currency || "INR";
  const isMonitoringMode = useMonitoringMode();
  const canViewBillStats = hasPermission("view_statistics");
  const canProcessBillPayment =
    !isMonitoringMode &&
    hasAnyPermission("order_process_payment", "session_complete_offline");
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState({
    totalBills: 0,
    pendingBills: 0,
    paidBills: 0,
    todayBills: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    billStatus: "all",
    paymentMethod: "all",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    bill: null,
    paymentMethod: "cash",
    transactionId: "",
    gateway: "offline",
  });
  const [qrModal, setQrModal] = useState({
    isOpen: false,
    bill: null,
    loading: false,
    qrCode: "",
    upiId: "",
    amount: 0,
  });
  const lastLoadKeyRef = useRef("");
  const loadBills = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const billFilters = {
          page: currentPage,
          limit: PAGE_SIZE,
          status: filters.status !== "all" ? filters.status : undefined,
          billStatus:
            filters.billStatus !== "all" ? filters.billStatus : undefined,
          paymentMethod:
            filters.paymentMethod !== "all" ? filters.paymentMethod : undefined,
          search: filters.search.trim() || undefined,
        };
        const [billsResponse, statsResponse] = await Promise.all([
          billService.getBills(billFilters),
          canViewBillStats
            ? billService.getStatistics()
            : Promise.resolve(null),
        ]);
        setBills(billsResponse?.data || []);
        setPagination(
          billsResponse?.pagination || {
            page: 1,
            pages: 1,
            total: 0,
          },
        );
        setStats(
          statsResponse?.data || {
            totalBills: 0,
            pendingBills: 0,
            paidBills: 0,
            todayBills: 0,
            todayRevenue: 0,
            monthlyRevenue: 0,
          },
        );
      } catch (error) {
        logger.error("Failed to load bills:", error);
        addNotification(
          error.response?.data?.message ||
            "Failed to load bill management data",
          "error",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      addNotification,
      canViewBillStats,
      currentPage,
      filters.billStatus,
      filters.paymentMethod,
      filters.search,
      filters.status,
    ],
  );
  useEffect(() => {
    const loadKey = JSON.stringify({
      page: currentPage,
      filters,
    });
    if (lastLoadKeyRef.current === loadKey) {
      return;
    }
    lastLoadKeyRef.current = loadKey;
    loadBills();
  }, [currentPage, filters, loadBills]);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.search,
    filters.status,
    filters.billStatus,
    filters.paymentMethod,
  ]);
  const statCards = useMemo(
    () => [
      {
        label: "Total Bills",
        value: stats.totalBills,
        icon: Receipt,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        label: "Pending Bills",
        value: stats.pendingBills,
        icon: Wallet,
        tone: "bg-sky-50 text-sky-600",
      },
      {
        label: "Paid Bills",
        value: stats.paidBills,
        icon: CreditCard,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Today's Revenue",
        value: formatCurrency(stats.todayRevenue, currency),
        icon: Receipt,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        label: "Monthly Revenue",
        value: formatCurrency(stats.monthlyRevenue, currency),
        icon: CreditCard,
        tone: "bg-rose-50 text-rose-600",
      },
    ],
    [
      currency,
      stats.monthlyRevenue,
      stats.paidBills,
      stats.pendingBills,
      stats.todayRevenue,
      stats.totalBills,
    ],
  );
  const availableManualPaymentOptions = useMemo(() => {
    const enabledMethods = settings?.paymentMethods || {};
    const filteredOptions = MANUAL_PAYMENT_METHOD_OPTIONS.filter((option) => {
      if (option.value === "wallet") {
        return enabledMethods.digitalWallet;
      }
      return enabledMethods[option.value] === true;
    });
    return filteredOptions.length > 0
      ? filteredOptions
      : MANUAL_PAYMENT_METHOD_OPTIONS.filter((option) => option.value === "cash");
  }, [settings?.paymentMethods]);
  const openPdf = (billId, type = "view") => {
    const url =
      type === "download"
        ? billService.getBillDownloadUrl(billId)
        : billService.getBillViewUrl(billId);
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const openPaymentModal = (bill) => {
    if (!canProcessBillPayment) {
      addNotification(
        "You do not have permission to process bill payments",
        "error",
      );
      return;
    }
    setPaymentModal({
      isOpen: true,
      bill,
      paymentMethod: availableManualPaymentOptions.some(
        (option) => option.value === bill.paymentMethod,
      )
        ? bill.paymentMethod
        : availableManualPaymentOptions[0]?.value || "cash",
      transactionId: "",
      gateway: "offline",
    });
  };
  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      bill: null,
      paymentMethod: "cash",
      transactionId: "",
      gateway: "offline",
    });
  };
  const submitPayment = async () => {
    if (!canProcessBillPayment) {
      addNotification(
        "You do not have permission to process bill payments",
        "error",
      );
      return;
    }
    if (!paymentModal.bill?._id) {
      return;
    }
    try {
      setActionLoadingId(paymentModal.bill._id);
      await billService.processPayment(paymentModal.bill._id, {
        paymentMethod: paymentModal.paymentMethod,
        transactionId: paymentModal.transactionId || undefined,
      });
      addNotification("Bill marked as paid successfully", "success");
      closePaymentModal();
      await loadBills(true);
    } catch (error) {
      logger.error("Failed to process bill payment:", error);
      addNotification(
        error.response?.data?.message || "Failed to process bill payment",
        "error",
      );
    } finally {
      setActionLoadingId("");
    }
  };
  const openQrModal = async (bill) => {
    try {
      setQrModal({
        isOpen: true,
        bill,
        loading: true,
        qrCode: "",
        upiId: "",
        amount: 0,
      });
      const response = await billService.getPaymentQr(bill._id);
      setQrModal({
        isOpen: true,
        bill,
        loading: false,
        qrCode: response?.data?.qrCode || "",
        upiId: response?.data?.upiId || "",
        amount: response?.data?.amount || 0,
      });
    } catch (error) {
      logger.error("Failed to load bill QR:", error);
      addNotification(
        error.response?.data?.message || "Failed to load payment QR",
        "error",
      );
      setQrModal({
        isOpen: false,
        bill: null,
        loading: false,
        qrCode: "",
        upiId: "",
        amount: 0,
      });
    }
  };
  const closeQrModal = () => {
    setQrModal({
      isOpen: false,
      bill: null,
      loading: false,
      qrCode: "",
      upiId: "",
      amount: 0,
    });
  };
  if (loading && !bills.length) {
    return (
      <AdminPageSkeleton stats={5} filters={4} cards={6} cardHeight="h-56" />
    );
  }
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Management</h1>
          <p className="text-gray-600">
            Track generated bills, payment state, PDF access, and customer
            billing actions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadBills(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {canViewBillStats ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <ResponsiveFilterSection
        title="Bill Filters"
        className="rounded-2xl shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Search bill no, session, customer"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3"
            />
          </div>

          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.billStatus}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                billStatus: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {BILL_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.paymentMethod}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                paymentMethod: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </ResponsiveFilterSection>

      {bills.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <Receipt className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No bills found
          </h3>
          <p className="mt-1 text-gray-600">
            Try changing the payment or bill-state filters.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            {bills.map((bill) => (
              <div
                key={bill._id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-all text-lg font-semibold text-gray-900">
                        {bill.billNumber}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${paymentBadgeClasses[bill.paymentStatus] || "bg-slate-100 text-slate-700"}`}
                      >
                        {bill.paymentStatus || "pending"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${billBadgeClasses[bill.billStatus] || "bg-slate-100 text-slate-700"}`}
                      >
                        {bill.billStatus || "draft"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {bill.customerName || "Walk-in customer"} • Session
                    </p>
                    <p className="break-all text-sm text-gray-500">
                      {bill.sessionId}
                    </p>
                    <p className="text-sm text-gray-500">
                      Table {bill.tableNumber || "N/A"} • {bill.itemCount || 0}{" "}
                      items
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 text-left sm:min-w-47.5 sm:text-right">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        bill.totalAmount,
                        bill.currency || currency,
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created {formatDateTime(bill.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 md:grid-cols-2">
                  <p className="min-w-0">
                    Email:{" "}
                    <span className="break-all font-medium text-gray-900">
                      {bill.customerEmail ||
                        bill.emailRecipient ||
                        "Not available"}
                    </span>
                  </p>
                  <p className="min-w-0">
                    Phone:{" "}
                    <span className="break-all font-medium text-gray-900">
                      {bill.customerPhone || "Not available"}
                    </span>
                  </p>
                  <p>
                    Payment Method:{" "}
                    <span className="font-medium capitalize text-gray-900">
                      {bill.paymentMethod || "pending"}
                    </span>
                  </p>
                  <p>
                    Paid At:{" "}
                    <span className="font-medium text-gray-900">
                      {formatDateTime(bill.paidAt)}
                    </span>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openPdf(bill._id, "download")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 sm:w-auto sm:min-w-32"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </button>
                  {bill.paymentStatus !== "paid" ? (
                    <button
                      type="button"
                      onClick={() => openQrModal(bill)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 sm:w-auto sm:min-w-32"
                    >
                      <QrCode className="h-4 w-4" />
                      Payment QR
                    </button>
                  ) : null}
                  {bill.paymentStatus !== "paid" ? (
                    <button
                      type="button"
                      onClick={() => openPaymentModal(bill)}
                      disabled={
                        !canProcessBillPayment || actionLoadingId === bill._id
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto sm:min-w-32"
                    >
                      <CreditCard className="h-4 w-4" />
                      Mark Paid
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <AdminPagination
            page={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={PAGE_SIZE}
            itemLabel="bills"
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <AdminModal
        isOpen={paymentModal.isOpen}
        title="Mark Bill As Paid"
        subtitle="Store payment method details and complete the bill."
        onClose={closePaymentModal}
        maxWidth="max-w-lg"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closePaymentModal}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitPayment}
              disabled={actionLoadingId === paymentModal.bill?._id}
              className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
            >
              Save Payment
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 p-4 sm:p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Payment Method
            </label>
            <select
              value={paymentModal.paymentMethod}
              onChange={(event) =>
                setPaymentModal((current) => ({
                  ...current,
                  paymentMethod: event.target.value,
                  gateway: "offline",
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {availableManualPaymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Transaction Id
            </label>
            <input
              type="text"
              value={paymentModal.transactionId}
              onChange={(event) =>
                setPaymentModal((current) => ({
                  ...current,
                  transactionId: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Optional reference id"
            />
          </div>
        </div>
      </AdminModal>

      <AdminModal
        isOpen={qrModal.isOpen}
        title="Bill Payment QR"
        subtitle={
          qrModal.bill ? `UPI payment for ${qrModal.bill.billNumber}` : ""
        }
        onClose={closeQrModal}
        maxWidth="max-w-md"
      >
        <div className="p-4 text-center sm:p-5">
          {qrModal.loading ? (
            <div className="py-8 text-gray-500">Loading payment QR...</div>
          ) : (
            <>
              {qrModal.qrCode ? (
                <img
                  src={qrModal.qrCode}
                  alt="Bill payment QR"
                  className="mx-auto aspect-square w-full max-w-56 rounded-xl border border-gray-200 bg-white p-3"
                />
              ) : null}
              <p className="mt-4 text-sm text-gray-600">
                UPI ID:{" "}
                <span className="break-all font-medium text-gray-900">
                  {qrModal.upiId}
                </span>
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(qrModal.amount, currency)}
              </p>
            </>
          )}
        </div>
      </AdminModal>
    </div>
  );
}
export default BillManagement;
