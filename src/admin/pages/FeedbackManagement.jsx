import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useState } from "react";
import { MessageSquareText, RefreshCw, Search, SmilePlus, AlertCircle } from "lucide-react";
import { feedbackService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import AdminPagination from "../components/common/AdminPagination";
import { AdminListSkeleton } from "../components/common/AdminSkeleton";
import ResponsiveFilterSection from "../components/common/ResponsiveFilterSection";
import { MonitoringBanner } from "../components/common/MonitoringBanner";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
const STATUS_OPTIONS = [{
  value: "all",
  label: "All Statuses"
}, {
  value: "new",
  label: "New"
}, {
  value: "in_review",
  label: "In Review"
}, {
  value: "resolved",
  label: "Resolved"
}, {
  value: "closed",
  label: "Closed"
}];
const SENTIMENT_OPTIONS = [{
  value: "all",
  label: "All Sentiments"
}, {
  value: "positive",
  label: "Positive"
}, {
  value: "neutral",
  label: "Neutral"
}, {
  value: "negative",
  label: "Negative"
}];
const sentimentTone = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-sky-100 text-sky-700",
  negative: "bg-red-100 text-red-700"
};
export function FeedbackManagement() {
  const PAGE_SIZE = 10;
  const isMonitoringMode = useMonitoringMode();
  const {
    addNotification
  } = useAdmin();
  const [dashboard, setDashboard] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    sentiment: "all"
  });
  const loadFeedback = useCallback(async () => {
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
      if (filters.sentiment !== "all") {
        params.sentiment = filters.sentiment;
      }
      const [dashboardResponse, feedbackResponse] = await Promise.all([feedbackService.getDashboard(), feedbackService.getFeedback(params)]);
      setDashboard(dashboardResponse.data || null);
      setFeedback(feedbackResponse.data || []);
      setPagination({
        page: feedbackResponse.pagination?.page || currentPage,
        pages: feedbackResponse.pagination?.pages || 1,
        total: feedbackResponse.total || 0
      });
    } catch (error) {
      logger.error("Failed to load feedback:", error);
      addNotification(error.response?.data?.message || "Failed to load feedback.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters.search, filters.sentiment, filters.status]);
  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.sentiment, filters.status]);
  const updateEntryStatus = async (entry, status) => {
    if (isMonitoringMode) {
      addNotification("Feedback actions are disabled in monitoring mode.", "error");
      return;
    }
    try {
      setActiveId(entry._id);
      await feedbackService.updateStatus(entry._id, {
        status,
        priority: entry.priority,
        followUpRequired: entry.followUpRequired
      });
      await loadFeedback();
      addNotification("Feedback status updated successfully.", "success");
    } catch (error) {
      logger.error("Failed to update feedback status:", error);
      addNotification(error.response?.data?.message || "Failed to update status.", "error");
    } finally {
      setActiveId("");
    }
  };
  const sendReply = async entry => {
    if (isMonitoringMode) {
      addNotification("Feedback actions are disabled in monitoring mode.", "error");
      return;
    }
    const message = replyDrafts[entry._id]?.trim();
    if (!message) {
      return;
    }
    try {
      setActiveId(entry._id);
      await feedbackService.respond(entry._id, message);
      setReplyDrafts(current => ({
        ...current,
        [entry._id]: ""
      }));
      await loadFeedback();
      addNotification("Response sent successfully.", "success");
    } catch (error) {
      logger.error("Failed to respond to feedback:", error);
      addNotification(error.response?.data?.message || "Failed to send response.", "error");
    } finally {
      setActiveId("");
    }
  };
  return <div className="space-y-6 p-4 sm:p-6">
      {isMonitoringMode ? <MonitoringBanner message="Feedback remains visible for monitoring, but status updates and customer replies are disabled for Super Admin." /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-600">
            Review customer sentiment, track open issues, and close the loop.
          </p>
        </div>
        <button type="button" onClick={loadFeedback} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Recent Feedback</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {dashboard?.recentFeedback?.length || feedback.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">NPS Score</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {Math.round(dashboard?.nps?.score || 0)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Trending Topics</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {dashboard?.trendingTopics?.length || 0}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pending Follow-up</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {feedback.filter(item => item.followUpRequired).length}
          </p>
        </div>
      </div>

      <ResponsiveFilterSection title="Feedback Filters">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={filters.search} onChange={event => setFilters(current => ({
          ...current,
          search: event.target.value
        }))} placeholder="Search comments, customer, or order" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={filters.status} onChange={event => setFilters(current => ({
        ...current,
        status: event.target.value
      }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>
              {option.label}
            </option>)}
          </select>
          <select value={filters.sentiment} onChange={event => setFilters(current => ({
        ...current,
        sentiment: event.target.value
      }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            {SENTIMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>
              {option.label}
            </option>)}
          </select>
        </div>
      </ResponsiveFilterSection>

      {loading ? <AdminListSkeleton rows={5} /> : feedback.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <MessageSquareText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">No feedback found</h3>
          <p className="mt-1 text-gray-600">
            Try widening the status or sentiment filters.
          </p>
        </div> : <>
          <div className="space-y-4">
            {feedback.map(entry => <div key={entry._id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {entry.customer?.name || "Anonymous customer"}
                    </h2>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${sentimentTone[entry.sentiment] || "bg-slate-100 text-slate-700"}`}>
                      {entry.sentiment || "unknown"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {entry.status || "new"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Order #{entry.order?.orderNumber || "N/A"} • Table{" "}
                    {entry.table?.tableNumber || "N/A"}
                  </p>
                  <p className="text-sm leading-6 text-gray-700">
                    {entry.comments || entry.review || "No written comment provided."}
                  </p>
                  {(entry.tags || []).length ? <div className="flex flex-wrap gap-2 pt-1">
                      {entry.tags.map(tag => <span key={tag} className="rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                          {tag}
                        </span>)}
                    </div> : null}
                </div>

                <div className="grid w-full gap-3 lg:min-w-[260px] lg:max-w-sm">
                  <select value={entry.status || "new"} onChange={event => updateEntryStatus(entry, event.target.value)} disabled={isMonitoringMode || activeId === entry._id} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {STATUS_OPTIONS.filter(option => option.value !== "all").map(option => <option key={option.value} value={option.value}>
                        {option.label}
                      </option>)}
                  </select>

                  <textarea rows={3} value={replyDrafts[entry._id] || ""} onChange={event => setReplyDrafts(current => ({
                ...current,
                [entry._id]: event.target.value
              }))} disabled={isMonitoringMode} placeholder="Write a response for this customer" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => sendReply(entry)} disabled={isMonitoringMode || activeId === entry._id} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
                    <SmilePlus className="h-4 w-4" />
                    {activeId === entry._id ? "Saving..." : "Send Response"}
                  </button>
                  {entry.followUpRequired ? <p className="inline-flex items-center gap-2 text-sm text-orange-700">
                      <AlertCircle className="h-4 w-4" />
                      Follow-up required
                    </p> : null}
                </div>
              </div>
              </div>)}
          </div>
          <AdminPagination page={pagination.page} totalPages={pagination.pages} totalItems={pagination.total} pageSize={PAGE_SIZE} itemLabel="feedback entries" onPageChange={setCurrentPage} />
        </>}
    </div>;
}
