import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useState } from "react";
import { Users, RefreshCw, Search, Clock3, Wallet, XCircle, CheckCircle2 } from "lucide-react";
import { customerAdminService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import AdminPagination from "../components/common/AdminPagination";
import { AdminListSkeleton } from "../components/common/AdminSkeleton";
import ResponsiveFilterSection from "../components/common/ResponsiveFilterSection";
import { useSettings } from "../../common/context/SettingsContext";
const MODE_OPTIONS = [{
  value: "active",
  label: "Active Sessions"
}, {
  value: "inactive",
  label: "Inactive Sessions"
}];
const STATUS_OPTIONS = [{
  value: "all",
  label: "All Statuses"
}, {
  value: "active",
  label: "Active"
}, {
  value: "payment_pending",
  label: "Payment Pending"
}, {
  value: "completed",
  label: "Completed"
}, {
  value: "cancelled",
  label: "Cancelled"
}, {
  value: "timeout",
  label: "Timeout"
}];
const formatCurrency = (value, currency = "INR") => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency,
  maximumFractionDigits: 2
}).format(Number(value || 0));
export function CustomerSessions() {
  const PAGE_SIZE = 10;
  const {
    settings
  } = useSettings();
  const currency = settings?.taxSettings?.currency || "INR";
  const {
    addNotification
  } = useAdmin();
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: "",
    mode: "active",
    status: "all"
  });
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        mode: filters.mode,
        search: filters.search.trim() || undefined
      };
      if (filters.status !== "all") {
        params.status = filters.status;
      }
      const [sessionsResponse, analyticsResponse] = await Promise.all([customerAdminService.getSessions(params), customerAdminService.getAnalytics(filters.mode === "active" ? "today" : "week")]);
      setSessions(sessionsResponse.data || []);
      setPagination({
        page: sessionsResponse.pagination?.page || currentPage,
        pages: sessionsResponse.pagination?.pages || 1,
        total: sessionsResponse.pagination?.total || 0
      });
      setAnalytics(analyticsResponse.data || null);
    } catch (error) {
      logger.error("Failed to load sessions:", error);
      addNotification(error.response?.data?.message || "Failed to load customer sessions.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters.mode, filters.search, filters.status]);
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.mode, filters.search, filters.status]);
  const runAction = async action => {
    try {
      setActiveId(action.sessionId);
      await action.task();
      await loadSessions();
      addNotification("Session updated successfully.", "success");
    } catch (error) {
      logger.error("Session action failed:", error);
      addNotification(error.response?.data?.message || "Failed to update session.", "error");
    } finally {
      setActiveId("");
    }
  };
  return <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Sessions</h1>
          <p className="text-gray-600">
            Monitor active tables, payment state, and session lifecycle controls.
          </p>
        </div>
        <button type="button" onClick={loadSessions} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Sessions</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {analytics?.totalSessions || sessions.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Active Right Now</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {analytics?.activeSessions || sessions.filter(item => item.isActive).length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {analytics?.completedSessions || 0}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(analytics?.revenue, currency)}
          </p>
        </div>
      </div>

      <ResponsiveFilterSection title="Session Filters">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={filters.search} onChange={event => setFilters(current => ({
            ...current,
            search: event.target.value
          }))} placeholder="Search session, phone, guest, or table" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4" />
          </div>
          <select value={filters.mode} onChange={event => setFilters(current => ({
          ...current,
          mode: event.target.value
        }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            {MODE_OPTIONS.map(option => <option key={option.value} value={option.value}>
              {option.label}
            </option>)}
          </select>
          <select value={filters.status} onChange={event => setFilters(current => ({
          ...current,
          status: event.target.value
        }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>
              {option.label}
            </option>)}
          </select>
        </div>
      </ResponsiveFilterSection>

      {loading ? <AdminListSkeleton rows={5} /> : sessions.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">No sessions found</h3>
          <p className="mt-1 text-gray-600">
            Try switching between active and inactive session views.
          </p>
        </div> : <>
          <div className="space-y-4">
            {sessions.map(session => <div key={session._id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {session.name || "Guest session"}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                      {session.sessionStatus}
                    </span>
                    <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                      Table {session.table?.tableNumber || "N/A"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Session ID: {session.sessionId} • {session.phone || "No phone"}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      Started {new Date(session.sessionStart).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Spent {formatCurrency(session.totalSpent, currency)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {session.isActive ? <>
                      <button type="button" disabled={activeId === session.sessionId} onClick={() => runAction({
                  sessionId: session.sessionId,
                  task: () => customerAdminService.extendSession(session.sessionId, 30)
                })} className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-60">
                        Extend 30m
                      </button>
                      <button type="button" disabled={activeId === session.sessionId} onClick={() => runAction({
                  sessionId: session.sessionId,
                  task: () => customerAdminService.completeSessionOffline(session.sessionId, "Completed from admin session control")
                })} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
                        <CheckCircle2 className="h-4 w-4" />
                        Complete
                      </button>
                      <button type="button" disabled={activeId === session.sessionId} onClick={() => runAction({
                  sessionId: session.sessionId,
                  task: () => customerAdminService.cancelSession(session.sessionId, "Cancelled from admin session control")
                })} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60">
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </button>
                    </> : <span className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm text-gray-500 sm:col-span-3">
                      Session closed
                    </span>}
                </div>
              </div>
              </div>)}
          </div>
          <AdminPagination page={pagination.page} totalPages={pagination.pages} totalItems={pagination.total} pageSize={PAGE_SIZE} itemLabel="sessions" onPageChange={setCurrentPage} />
        </>}
    </div>;
}
