import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useState } from "react";
import { BellRing, Clock3, RefreshCw, Search, UserCheck, CheckCircle2, LoaderCircle } from "lucide-react";
import { waiterCallService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import AdminPagination from "../components/common/AdminPagination";
import { AdminListSkeleton } from "../components/common/AdminSkeleton";
const STATUS_OPTIONS = [{
  value: "all",
  label: "All Statuses"
}, {
  value: "pending",
  label: "Pending"
}, {
  value: "assigned",
  label: "Assigned"
}, {
  value: "acknowledged",
  label: "Acknowledged"
}, {
  value: "in_progress",
  label: "In Progress"
}, {
  value: "completed",
  label: "Completed"
}, {
  value: "cancelled",
  label: "Cancelled"
}];
const CALL_TYPE_OPTIONS = [{
  value: "all",
  label: "All Call Types"
}, {
  value: "waiter",
  label: "Waiter"
}, {
  value: "bill",
  label: "Bill"
}, {
  value: "billing",
  label: "Billing"
}, {
  value: "assistance",
  label: "Assistance"
}, {
  value: "order_help",
  label: "Order Help"
}, {
  value: "order",
  label: "Order"
}, {
  value: "emergency",
  label: "Emergency"
}];
const PRIORITY_OPTIONS = [{
  value: "all",
  label: "All Priorities"
}, {
  value: "low",
  label: "Low"
}, {
  value: "medium",
  label: "Medium"
}, {
  value: "high",
  label: "High"
}, {
  value: "urgent",
  label: "Urgent"
}, {
  value: "critical",
  label: "Critical"
}];
const priorityTone = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-sky-100 text-sky-700",
  urgent: "bg-red-100 text-red-700",
  critical: "bg-red-100 text-red-700"
};
const statusTone = {
  pending: "bg-sky-100 text-sky-700",
  assigned: "bg-blue-100 text-blue-700",
  acknowledged: "bg-primary-50 text-primary-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700"
};
const formatDateTime = value => {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
};
const formatMinutes = seconds => {
  if (!seconds) {
    return "0 min";
  }
  return `${Math.max(Math.round(Number(seconds) / 60), 1)} min`;
};
export function WaiterCalls() {
  const PAGE_SIZE = 10;
  const {
    addNotification
  } = useAdmin();
  const [calls, setCalls] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    callId: "",
    staffId: ""
  });
  const [completeModal, setCompleteModal] = useState({
    isOpen: false,
    callId: "",
    resolutionNotes: ""
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    callType: "all",
    priority: "all"
  });
  const loadDashboard = useCallback(async () => {
    try {
      const dashboardResponse = await waiterCallService.getDashboard();
      setDashboard(dashboardResponse.data || null);
    } catch (error) {
      logger.error("Failed to load waiter call dashboard:", error);
    }
  }, []);
  const loadCalls = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        search: filters.search.trim() || undefined
      };
      if (filters.status !== "all") {
        params.status = filters.status;
      }
      if (filters.callType !== "all") {
        params.callType = filters.callType;
      }
      if (filters.priority !== "all") {
        params.priority = filters.priority;
      }
      const callsResponse = await waiterCallService.getCalls(params);
      setCalls(callsResponse.data || []);
      setPagination({
        page: callsResponse.pagination?.page || currentPage,
        pages: callsResponse.pagination?.pages || 1,
        total: callsResponse.total || 0
      });
    } catch (error) {
      logger.error("Failed to load waiter calls:", error);
      addNotification(error.response?.data?.message || "Failed to load waiter calls", "error");
    } finally {
      setLoading(false);
    }
  }, [addNotification, currentPage, filters.callType, filters.priority, filters.search, filters.status]);
  useEffect(() => {
    loadCalls();
  }, [loadCalls]);
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadCalls();
        loadDashboard();
      }
    }, 10000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadCalls, loadDashboard]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.callType, filters.priority, filters.search, filters.status]);
  useEffect(() => {
    if (!assignModal.isOpen || availableStaff.length > 0) {
      return;
    }
    const loadAvailableStaff = async () => {
      try {
        const staffResponse = await waiterCallService.getAvailableStaff();
        setAvailableStaff(staffResponse.data || []);
      } catch (error) {
        logger.error("Failed to load available staff:", error);
        addNotification(error.response?.data?.message || "Failed to load available staff", "error");
      }
    };
    loadAvailableStaff();
  }, [addNotification, assignModal.isOpen, availableStaff.length]);
  const runCallAction = async (callId, task, successMessage) => {
    try {
      setActiveId(callId);
      await task();
      addNotification(successMessage, "success");
      await Promise.all([loadCalls(), loadDashboard()]);
    } catch (error) {
      logger.error("Waiter call action failed:", error);
      addNotification(error.response?.data?.message || "Failed to update waiter call", "error");
    } finally {
      setActiveId("");
    }
  };
  const submitAssignCall = async () => {
    if (!assignModal.callId || !assignModal.staffId) {
      addNotification("Please select a staff member", "error");
      return;
    }
    await runCallAction(assignModal.callId, () => waiterCallService.assignCall(assignModal.callId, assignModal.staffId), "Call assigned successfully");
    setAssignModal({
      isOpen: false,
      callId: "",
      staffId: ""
    });
  };
  const submitCompleteCall = async () => {
    if (!completeModal.callId) {
      return;
    }
    await runCallAction(completeModal.callId, () => waiterCallService.completeCall(completeModal.callId, completeModal.resolutionNotes.trim()), "Call completed successfully");
    setCompleteModal({
      isOpen: false,
      callId: "",
      resolutionNotes: ""
    });
  };
  const dashboardStats = dashboard?.statistics || {};
  return <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waiter Calls</h1>
          <p className="text-gray-600">
            Track live guest assistance requests, assign staff, and close calls
            quickly.
          </p>
        </div>
        <button type="button" onClick={loadCalls} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Today's Calls</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {dashboardStats.totalCalls ?? calls.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {dashboardStats.pendingCalls ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {dashboardStats.activeCalls ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Avg Response Time</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatMinutes(dashboardStats.avgResponseTime)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={filters.search} onChange={event => setFilters(current => ({
          ...current,
          search: event.target.value
        }))} placeholder="Search call, table, guest, message, or location" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4" />
        </div>
        <select value={filters.status} onChange={event => setFilters(current => ({
        ...current,
        status: event.target.value
      }))} className="rounded-lg border border-gray-300 px-3 py-2">
          {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>
              {option.label}
            </option>)}
        </select>
        <select value={filters.callType} onChange={event => setFilters(current => ({
        ...current,
        callType: event.target.value
      }))} className="rounded-lg border border-gray-300 px-3 py-2">
          {CALL_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>
              {option.label}
            </option>)}
        </select>
        <select value={filters.priority} onChange={event => setFilters(current => ({
        ...current,
        priority: event.target.value
      }))} className="rounded-lg border border-gray-300 px-3 py-2">
          {PRIORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>
              {option.label}
            </option>)}
        </select>
      </div>

      {loading ? <AdminListSkeleton rows={6} /> : calls.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <BellRing className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">
            No waiter calls found
          </h3>
          <p className="mt-1 text-gray-600">
            Try widening the filters to review more requests.
          </p>
        </div> : <>
          <div className="space-y-4">
            {calls.map(call => {
          const canAssign = ["pending", "assigned"].includes(call.status);
          const canAcknowledge = ["pending", "assigned"].includes(call.status);
          const canStart = call.status === "acknowledged";
          const canComplete = ["acknowledged", "in_progress", "assigned"].includes(call.status);
          return <div key={call._id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {call.callId}
                      </h2>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${priorityTone[call.priority] || priorityTone.medium}`}>
                        {call.priority || "medium"}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusTone[call.status] || statusTone.pending}`}>
                        {String(call.status || "pending").replace(/_/g, " ")}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {String(call.callType || "waiter").replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      Table {call.table?.tableNumber || call.tableNumber || "N/A"} •{" "}
                      {call.location || call.table?.location || "Dining Area"}
                    </p>

                    <p className="text-sm leading-6 text-gray-700">
                      {call.message || "Guest requested staff assistance."}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>Guest: {call.customer?.name || "Customer"}</span>
                      <span>Created: {formatDateTime(call.createdAt)}</span>
                      <span>
                        Assigned: {call.assignedTo?.name || "Unassigned"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        Response: {formatMinutes(call.responseTime)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4" />
                        Resolution: {formatMinutes(call.resolutionTime)}
                      </span>
                    </div>

                    {call.resolutionNotes ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Resolution: {call.resolutionNotes}
                      </div> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canAssign && <button type="button" disabled={activeId === call.callId} onClick={() => setAssignModal({
                  isOpen: true,
                  callId: call.callId,
                  staffId: call.assignedTo?._id || ""
                })} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-60">
                        <UserCheck className="h-4 w-4" />
                        Assign
                      </button>}

                    {canAcknowledge && <button type="button" disabled={activeId === call.callId} onClick={() => runCallAction(call.callId, () => waiterCallService.acknowledgeCall(call.callId, 5), "Call acknowledged successfully")} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
                        Acknowledge
                      </button>}

                    {canStart && <button type="button" disabled={activeId === call.callId} onClick={() => runCallAction(call.callId, () => waiterCallService.updateCallStatus(call.callId, "in_progress", "Started from admin waiter call dashboard"), "Call moved to in progress")} className="rounded-lg border border-violet-200 px-4 py-2 text-sm text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-60">
                        Start
                      </button>}

                    {canComplete && <button type="button" disabled={activeId === call.callId} onClick={() => setCompleteModal({
                  isOpen: true,
                  callId: call.callId,
                  resolutionNotes: ""
                })} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
                        <CheckCircle2 className="h-4 w-4" />
                        Complete
                      </button>}
                  </div>
                </div>
              </div>;
        })}
          </div>
          <AdminPagination page={pagination.page} totalPages={pagination.pages} totalItems={pagination.total} pageSize={PAGE_SIZE} itemLabel="waiter calls" onPageChange={setCurrentPage} />
        </>}

      <AdminModal isOpen={assignModal.isOpen} title="Assign Waiter Call" subtitle="Choose a staff member to handle this request." onClose={() => setAssignModal({
      isOpen: false,
      callId: "",
      staffId: ""
    })} maxWidth="max-w-xl" footer={<div className="flex justify-end gap-3">
            <button type="button" onClick={() => setAssignModal({
        isOpen: false,
        callId: "",
        staffId: ""
      })} className="rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={submitAssignCall} disabled={activeId === assignModal.callId} className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
              Assign Call
            </button>
          </div>}>
        <div className="p-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Staff Member
          </label>
          <select value={assignModal.staffId} onChange={event => setAssignModal(current => ({
          ...current,
          staffId: event.target.value
        }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select staff member</option>
            {availableStaff.map(staff => <option key={staff._id} value={staff._id}>
                {staff.name} ({staff.role})
              </option>)}
          </select>
        </div>
      </AdminModal>

      <AdminModal isOpen={completeModal.isOpen} title="Complete Waiter Call" subtitle="Add optional notes before closing the request." onClose={() => setCompleteModal({
      isOpen: false,
      callId: "",
      resolutionNotes: ""
    })} maxWidth="max-w-xl" footer={<div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCompleteModal({
        isOpen: false,
        callId: "",
        resolutionNotes: ""
      })} className="rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={submitCompleteCall} disabled={activeId === completeModal.callId} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
              Complete Call
            </button>
          </div>}>
        <div className="p-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Resolution Notes
          </label>
          <textarea rows={5} value={completeModal.resolutionNotes} onChange={event => setCompleteModal(current => ({
          ...current,
          resolutionNotes: event.target.value
        }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Optional notes about how this guest request was resolved." />
        </div>
      </AdminModal>
    </div>;
}
