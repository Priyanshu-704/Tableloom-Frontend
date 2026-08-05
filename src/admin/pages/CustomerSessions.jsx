import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  RefreshCw,
  Search,
  Clock3,
  Wallet,
  XCircle,
  CheckCircle2,
  Phone,
  Utensils,
  DollarSign,
  Calendar,
  X,
  Sparkles,
} from "lucide-react";
import { customerAdminService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import AdminPagination from "../components/common/AdminPagination";
import { AdminListSkeleton } from "../components/common/AdminSkeleton";
import { useSettings } from "../../common/context/SettingsContext";
import { useAuth } from "../../common/context/AuthContext";
import Select from "../components/common/Select";

const MODE_OPTIONS = [
  { value: "active", label: "Active Sessions" },
  { value: "inactive", label: "Inactive Sessions" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "timeout", label: "Timeout" },
];

const getStatusBadgeMeta = (status = "") => {
  switch (String(status).toLowerCase()) {
    case "active":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        dot: "bg-emerald-500",
        label: "Active",
      };
    case "payment_pending":
      return {
        badge: "bg-amber-50 text-amber-800 border-amber-200/80",
        dot: "bg-amber-500",
        label: "Payment Pending",
      };
    case "completed":
      return {
        badge: "bg-sky-50 text-sky-700 border-sky-200/80",
        dot: "bg-sky-500",
        label: "Completed",
      };
    case "cancelled":
      return {
        badge: "bg-rose-50 text-rose-700 border-rose-200/80",
        dot: "bg-rose-500",
        label: "Cancelled",
      };
    case "timeout":
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200/80",
        dot: "bg-slate-400",
        label: "Timeout",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200/80",
        dot: "bg-slate-400",
        label: status || "Unknown",
      };
  }
};

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export function CustomerSessions() {
  const PAGE_SIZE = 10;
  const { settings } = useSettings();
  const { hasPermission } = useAuth();
  const currency = settings?.taxSettings?.currency || "INR";
  const { addNotification } = useAdmin();

  const canViewAnalytics = hasPermission("session_statistics");
  const canExtendSession = hasPermission("session_update");
  const canCompleteSession = hasPermission("session_complete_offline");
  const canCancelSession = hasPermission("session_cancel");

  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    mode: "active",
    status: "all",
  });

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        mode: filters.mode,
        search: filters.search.trim() || undefined,
      };
      if (filters.status !== "all") {
        params.status = filters.status;
      }
      const [sessionsResponse, analyticsResponse] = await Promise.all([
        customerAdminService.getSessions(params),
        canViewAnalytics
          ? customerAdminService.getAnalytics(
              filters.mode === "active" ? "today" : "week",
            )
          : Promise.resolve({ data: null }),
      ]);
      setSessions(sessionsResponse.data || []);
      setPagination({
        page: sessionsResponse.pagination?.page || currentPage,
        pages: sessionsResponse.pagination?.pages || 1,
        total: sessionsResponse.pagination?.total || 0,
      });
      setAnalytics(analyticsResponse?.data || null);
    } catch (error) {
      logger.error("Failed to load sessions:", error);
      addNotification(
        error.response?.data?.message || "Failed to load customer sessions.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [canViewAnalytics, currentPage, filters.mode, filters.search, filters.status]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.mode, filters.search, filters.status]);

  const runAction = async (action) => {
    try {
      setActiveId(action.sessionId);
      await action.task();
      await loadSessions();
      addNotification("Session updated successfully.", "success");
    } catch (error) {
      logger.error("Session action failed:", error);
      addNotification(
        error.response?.data?.message || "Failed to update session.",
        "error",
      );
    } finally {
      setActiveId("");
    }
  };

  const clearSearch = () => {
    setFilters((current) => ({ ...current, search: "" }));
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Customer Sessions
            </h1>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {pagination.total} Sessions
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Monitor active dining tables, payment state, and session lifecycle controls.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSessions}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sessions */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Sessions</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">
              {analytics?.totalSessions || sessions.length}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
            <Users className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Active Right Now */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div>
            <p className="text-xs font-medium text-slate-500">Active Right Now</p>
            <p className="mt-1.5 text-2xl font-bold text-emerald-600">
              {analytics?.activeSessions ||
                sessions.filter((item) => item.isActive).length}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Clock3 className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Completed */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div>
            <p className="text-xs font-medium text-slate-500">Completed Sessions</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">
              {analytics?.completedSessions || 0}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <CheckCircle2 className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Revenue */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Revenue</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">
              {formatCurrency(analytics?.revenue, currency)}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
            <Wallet className="h-5.5 w-5.5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Search by phone, guest, or table..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden"
            />
            {filters.search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Mode Select */}
          <Select
            value={filters.mode}
            onChange={(val) =>
              setFilters((current) => ({ ...current, mode: val }))
            }
            options={MODE_OPTIONS}
            placeholder="Select View Mode"
          />

          {/* Status Select */}
          <Select
            value={filters.status}
            onChange={(val) =>
              setFilters((current) => ({ ...current, status: val }))
            }
            options={STATUS_OPTIONS}
            placeholder="Select Status"
          />
        </div>
      </div>

      {/* Main Content: Table View */}
      {loading ? (
        <AdminListSkeleton rows={6} />
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white py-16 text-center shadow-2xs">
          <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-slate-900">
            No customer sessions found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Try switching between active and inactive session views or adjusting search filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">Guest / Customer</th>
                    <th className="px-4 py-4">Table</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Started At</th>
                    <th className="px-4 py-4">Total Spent</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((session) => {
                    const statusMeta = getStatusBadgeMeta(session.sessionStatus);
                    const isLoadingThis = activeId === session.sessionId;

                    return (
                      <tr
                        key={session._id}
                        className="transition hover:bg-slate-50/60"
                      >
                        {/* Guest / Customer */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold">
                              {(session.name || "G")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {session.name || "Guest session"}
                              </p>
                              {session.phone ? (
                                <p className="mt-0.5 text-slate-500 flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  <span>{session.phone}</span>
                                </p>
                              ) : (
                                <p className="mt-0.5 text-slate-400 italic">No phone provided</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Table */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200/70">
                            <Utensils className="h-3 w-3 text-sky-600" />
                            Table {session.table?.tableNumber || "N/A"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${statusMeta.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Started At */}
                        <td className="px-4 py-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {session.sessionStart
                                ? new Date(session.sessionStart).toLocaleString([], {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "—"}
                            </span>
                          </div>
                        </td>

                        {/* Total Spent */}
                        <td className="px-4 py-4">
                          <span className="font-bold text-slate-900 text-sm">
                            {formatCurrency(session.totalSpent, currency)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          {session.isActive ? (
                            <div className="inline-flex items-center justify-end gap-2">
                              {canExtendSession ? (
                                <button
                                  type="button"
                                  disabled={isLoadingThis}
                                  onClick={() =>
                                    runAction({
                                      sessionId: session.sessionId,
                                      task: () =>
                                        customerAdminService.extendSession(
                                          session.sessionId,
                                          30,
                                        ),
                                    })
                                  }
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  Extend 30m
                                </button>
                              ) : null}

                              {canCompleteSession ? (
                                <button
                                  type="button"
                                  disabled={isLoadingThis}
                                  onClick={() =>
                                    runAction({
                                      sessionId: session.sessionId,
                                      task: () =>
                                        customerAdminService.completeSessionOffline(
                                          session.sessionId,
                                          "Completed from admin session control",
                                        ),
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {isLoadingThis ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  Complete
                                </button>
                              ) : null}

                              {canCancelSession ? (
                                <button
                                  type="button"
                                  disabled={isLoadingThis}
                                  onClick={() =>
                                    runAction({
                                      sessionId: session.sessionId,
                                      task: () =>
                                        customerAdminService.cancelSession(
                                          session.sessionId,
                                          "Cancelled from admin session control",
                                        ),
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-rose-700 disabled:opacity-50"
                                >
                                  {isLoadingThis ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                  Cancel
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              Closed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={PAGE_SIZE}
            itemLabel="sessions"
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
