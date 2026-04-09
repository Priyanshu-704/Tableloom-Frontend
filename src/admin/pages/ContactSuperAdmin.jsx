import React, { useEffect, useMemo, useState } from "react";
import { LifeBuoy, Loader2, MessageSquareText, Send, ShieldAlert } from "lucide-react";
import { supportService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../../common/context/AuthContext";
import { buildAdminPath } from "../../common/utils/routes";
import { Navigate } from "react-router-dom";

const STATUS_TONE = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-100 text-sky-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

const CATEGORY_LABEL = {
  access: "Access",
  tenant: "Tenant",
  billing: "Billing",
  technical: "Technical",
  account: "Account",
  other: "Other",
};

const initialForm = {
  category: "access",
  subject: "",
  message: "",
};

export function ContactSuperAdmin() {
  const { user } = useAuth();
  const { addNotification } = useAdmin();
  const [form, setForm] = useState(initialForm);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isTenantAdmin = user?.role === "admin";

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await supportService.getSupportRequests();
      setRequests(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      addNotification(error?.message || "Failed to load support requests", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isTenantAdmin) {
      return;
    }
    loadRequests();
  }, [isTenantAdmin]);

  const openRequests = useMemo(
    () => requests.filter(request => request.status !== "resolved").length,
    [requests]
  );

  const handleSubmit = async event => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await supportService.createSupportRequest(form);
      setForm(initialForm);
      addNotification(response?.message || "Support request sent successfully", "success");
      await loadRequests();
    } catch (error) {
      addNotification(error?.message || "Failed to send support request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isTenantAdmin) {
    return <Navigate to={buildAdminPath("/unauthorized")} replace />;
  }

  return <div className="space-y-6 p-4 sm:p-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Admin Support</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Contact Super Admin</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Send tenant, access, billing, technical, or account issues directly to the platform team. Only tenant admins can use this page.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-sky-600" />
            <h2 className="text-xl font-semibold text-slate-900">New Request</h2>
          </div>
          <select value={form.category} onChange={event => setForm(current => ({
          ...current,
          category: event.target.value
        }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>
                {label}
              </option>)}
          </select>
          <input value={form.subject} onChange={event => setForm(current => ({
          ...current,
          subject: event.target.value
        }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3" maxLength={160} placeholder="Short subject" required />
          <textarea value={form.message} onChange={event => setForm(current => ({
          ...current,
          message: event.target.value
        }))} className="min-h-[180px] w-full rounded-2xl border border-slate-200 px-4 py-3" maxLength={2500} placeholder="Describe the issue, impact, and any steps already tried." required />
          <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Sending..." : "Send to Super Admin"}
          </button>
        </form>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Request History</h2>
              <p className="mt-1 text-sm text-slate-500">Track replies and progress for your tenant workspace.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {openRequests} Open
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">Loading requests...</div> : null}
            {!loading && requests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No support requests sent yet.
              </div> : null}
            {!loading ? requests.map(request => <article key={request._id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{request.subject}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${STATUS_TONE[request.status] || STATUS_TONE.open}`}>
                          {String(request.status || "open").replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{request.message}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                      {CATEGORY_LABEL[request.category] || "Other"}
                    </span>
                    {request.responseMessage ? <span>Response received</span> : null}
                    {request.updatedBy?.name ? <span>Last updated by {request.updatedBy.name}</span> : null}
                    {request.resolvedAt ? <span>Resolved {new Date(request.resolvedAt).toLocaleString()}</span> : null}
                  </div>
                  {request.responseMessage ? <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Super Admin Response</p>
                      <p className="mt-2 whitespace-pre-wrap leading-6">{request.responseMessage}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {request.respondedBy?.name ? `By ${request.respondedBy.name}` : "By super admin"}
                        {request.respondedAt ? ` on ${new Date(request.respondedAt).toLocaleString()}` : ""}
                      </p>
                    </div> : null}
                </article>) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>Include tenant access issues, billing problems, workspace activation questions, or technical blockers so the platform team can help faster.</p>
            </div>
          </div>
        </section>
      </div>
    </div>;
}
