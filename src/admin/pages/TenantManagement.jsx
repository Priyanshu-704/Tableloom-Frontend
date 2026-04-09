import React, { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ExternalLink, Loader2, PlusCircle, Power, ShieldAlert } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supportService, tenantService } from "../../common/services";
import { buildTenantPath } from "../../common/utils/routes";
import { useAdmin } from "../context/AdminContext";

const initialForm = {
  restaurantName: "",
  slug: "",
  key: "",
  adminName: "",
  adminEmail: "",
  subscriptionPlan: "starter"
};

const superAdminTabs = [{
  id: "tenants",
  label: "Tenant Workspace"
}, {
  id: "requests",
  label: "Admin Requests"
}];

export function TenantManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addNotification, confirmAction } = useAdmin();
  const [tenants, setTenants] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingTenantId, setVerifyingTenantId] = useState("");
  const [updatingTenantId, setUpdatingTenantId] = useState("");
  const [updatingSupportId, setUpdatingSupportId] = useState("");
  const activeTab = searchParams.get("tab") === "requests" ? "requests" : "tenants";

  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await tenantService.getTenants();
      setTenants(Array.isArray(response?.data) ? response.data : []);
    } catch (loadError) {
      const message = loadError?.message || "Failed to load tenants";
      setError(message);
      addNotification(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadSupportRequests = async () => {
    try {
      const response = await supportService.getSupportRequests();
      setSupportRequests(Array.isArray(response?.data) ? response.data : []);
    } catch (loadError) {
      const message = loadError?.message || "Failed to load support requests";
      setError(message);
      addNotification(message, "error");
    }
  };

  useEffect(() => {
    Promise.all([loadTenants(), loadSupportRequests()]);
  }, []);

  const pendingTenants = useMemo(
    () => tenants.filter(tenant => tenant?.onboarding?.verificationStatus === "pending" || tenant?.status === "pending"),
    [tenants]
  );

  const handleChange = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: value
    }));
  };

  const handleCreateTenant = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await tenantService.createTenant(form);
      setCredentials(response?.data?.credentials || null);
      const message = response?.message || "Tenant created successfully";
      setSuccess(message);
      addNotification(message, "success");
      setForm(initialForm);
      await loadTenants();
    } catch (createError) {
      const message = createError?.message || "Failed to create tenant";
      setError(message);
      addNotification(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyTenant = async tenantId => {
    setVerifyingTenantId(tenantId);
    setError("");
    setSuccess("");

    try {
      const response = await tenantService.verifyTenant(tenantId);
      setCredentials(response?.data?.credentials || null);
      const message = response?.message || "Tenant verified successfully";
      setSuccess(message);
      addNotification(message, "success");
      await loadTenants();
    } catch (verifyError) {
      const message = verifyError?.message || "Failed to verify tenant";
      setError(message);
      addNotification(message, "error");
    } finally {
      setVerifyingTenantId("");
    }
  };

  const getTenantAdminPath = tenant => buildTenantPath("/admin/dashboard", {
    tenantSlug: tenant?.slug,
    tenantKey: tenant?.key
  });
  const getTenantWorkspacePath = tenant => `/${tenant?.slug || "tenant"}/${tenant?.key || "workspace"}`;
  const isTenantVerified = tenant => tenant?.onboarding?.verificationStatus === "verified" || Boolean(tenant?.adminUser);

  const handleTenantStatusChange = async tenant => {
    const nextStatus = tenant?.status === "active" ? "suspended" : "active";
    const actionLabel = nextStatus === "active" ? "Activate" : "Deactivate";
    const confirmed = await confirmAction({
      title: `${actionLabel} Tenant`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} ${tenant?.name}?`,
      confirmLabel: actionLabel,
      tone: nextStatus === "active" ? "warning" : "danger"
    });
    if (!confirmed) {
      return;
    }
    setUpdatingTenantId(tenant._id);
    setError("");
    setSuccess("");
    try {
      const response = await tenantService.updateTenantStatus(tenant._id, nextStatus);
      const message = response?.message || `Tenant ${nextStatus === "active" ? "activated" : "deactivated"} successfully`;
      setSuccess(message);
      addNotification(message, "success");
      await loadTenants();
    } catch (statusError) {
      const message = statusError?.message || "Failed to update tenant status";
      setError(message);
      addNotification(message, "error");
    } finally {
      setUpdatingTenantId("");
    }
  };

  const handleSupportStatusChange = async (requestId, status) => {
    setUpdatingSupportId(requestId);
    try {
      const response = await supportService.updateSupportRequestStatus(requestId, status);
      addNotification(response?.message || "Support request updated", "success");
      await loadSupportRequests();
    } catch (requestError) {
      addNotification(requestError?.message || "Failed to update support request", "error");
    } finally {
      setUpdatingSupportId("");
    }
  };

  const openTenantAdmin = tenant => {
    const tenantAdminPath = getTenantAdminPath(tenant);
    const openedWindow = window.open(tenantAdminPath, "_blank");

    if (!openedWindow) {
      navigate(tenantAdminPath);
    }
  };

  const switchTab = tabId => {
    const nextParams = new URLSearchParams(searchParams);
    if (tabId === "requests") {
      nextParams.set("tab", "requests");
    } else {
      nextParams.delete("tab");
    }
    setSearchParams(nextParams, {
      replace: true
    });
  };

  return <div className="space-y-5 p-4 sm:p-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Platform</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Tenant Management</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Create restaurant workspaces, review self-registration requests, verify pending tenants, and open any tenant in read-only mode.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {superAdminTabs.map(tab => <button key={tab.id} type="button" onClick={() => switchTab(tab.id)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === tab.id ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
              {tab.label}
            </button>)}
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
      {credentials ? <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Admin email: <strong>{credentials.email}</strong><br />
          Temporary password: <strong>{credentials.temporaryPassword}</strong>
        </div> : null}

      {activeTab === "tenants" ? <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <form className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={handleCreateTenant}>
            <div className="flex items-center gap-3">
              <PlusCircle className="h-5 w-5 text-sky-600" />
              <h2 className="text-xl font-semibold text-slate-900">Register Tenant</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Workspace route preview</p>
              <p className="mt-2 break-all font-mono text-[13px] text-slate-800">
                {getTenantWorkspacePath(form)}
              </p>
            </div>
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Restaurant name" value={form.restaurantName} onChange={event => handleChange("restaurantName", event.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Slug" value={form.slug} onChange={event => handleChange("slug", event.target.value)} />
              <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Key" value={form.key} onChange={event => handleChange("key", event.target.value)} />
            </div>
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Admin name" value={form.adminName} onChange={event => handleChange("adminName", event.target.value)} />
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Admin email" type="email" value={form.adminEmail} onChange={event => handleChange("adminEmail", event.target.value)} />
            <select className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={form.subscriptionPlan} onChange={event => handleChange("subscriptionPlan", event.target.value)}>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {submitting ? "Creating..." : "Create Tenant"}
            </button>
          </form>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Pending Verification</h2>
                  <p className="mt-1 text-sm text-slate-500">Self-registered workspaces waiting for platform approval.</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {pendingTenants.length} Pending
                </span>
              </div>

              <div className="mt-4 max-h-[24rem] space-y-3 overflow-y-auto overscroll-contain pr-1">
                {pendingTenants.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No pending tenant registrations.
                  </div> : pendingTenants.map(tenant => <div key={tenant._id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{tenant.name}</div>
                        <div className="text-sm text-slate-500">{tenant.requestedAdmin?.name || tenant.adminUser?.name || "Pending admin"}</div>
                        <div className="text-sm text-slate-500">{tenant.requestedAdmin?.email || tenant.contact?.email}</div>
                        <div className="mt-2 inline-flex rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700">
                          {getTenantWorkspacePath(tenant)}
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => openTenantAdmin(tenant)} type="button">
                          Open Admin Panel
                        </button>
                        <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60" disabled={verifyingTenantId === tenant._id} onClick={() => handleVerifyTenant(tenant._id)} type="button">
                          {verifyingTenantId === tenant._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Verify
                        </button>
                      </div>
                    </div>)}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-sky-600" />
                <h2 className="text-xl font-semibold text-slate-900">All Tenants</h2>
              </div>

              <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto overscroll-contain pr-1 lg:hidden">
                {loading ? <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">Loading tenants...</div> : tenants.map(tenant => <div key={tenant._id} className="rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{tenant.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{tenant.contact?.email || tenant.requestedAdmin?.email || "No email"}</div>
                        </div>
                        <ExternalLink className="mt-1 h-4 w-4 text-slate-400" />
                      </div>
                      <div className="mt-3 inline-flex rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700">
                        {getTenantWorkspacePath(tenant)}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          Plan: <span className="font-medium capitalize text-slate-900">{tenant.subscription?.plan || "starter"}</span>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          Status: <span className="font-medium capitalize text-slate-900">{tenant.onboarding?.verificationStatus || tenant.status}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => openTenantAdmin(tenant)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          <ExternalLink className="h-4 w-4" />
                          Monitor
                        </button>
                        {isTenantVerified(tenant) ? <button type="button" onClick={() => handleTenantStatusChange(tenant)} disabled={updatingTenantId === tenant._id} className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${tenant.status === "active" ? "border border-rose-200 text-rose-700 hover:bg-rose-50" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                          {updatingTenantId === tenant._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                          {tenant.status === "active" ? "Deactivate Tenant" : "Activate Tenant"}
                        </button> : null}
                      </div>
                    </div>)}
                {!loading && tenants.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">No tenants found.</div> : null}
              </div>

              <div className="mt-4 hidden max-h-[32rem] overflow-auto lg:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-slate-500">
                      <th className="pb-3 pr-4">Restaurant</th>
                      <th className="pb-3 pr-4">Route</th>
                      <th className="pb-3 pr-4">Plan</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? <tr><td className="py-6 text-slate-500" colSpan="5">Loading tenants...</td></tr> : tenants.map(tenant => <tr key={tenant._id} className="cursor-pointer hover:bg-slate-50" onClick={() => openTenantAdmin(tenant)}>
                        <td className="py-4 pr-4">
                          <div className="font-medium text-slate-900">{tenant.name}</div>
                          <div className="text-slate-500">{tenant.contact?.email || tenant.requestedAdmin?.email || "No email"}</div>
                        </td>
                        <td className="py-4 pr-4">{getTenantWorkspacePath(tenant)}</td>
                        <td className="py-4 pr-4 capitalize">{tenant.subscription?.plan || "starter"}</td>
                        <td className="py-4 pr-4 capitalize">{tenant.onboarding?.verificationStatus || tenant.status}</td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={event => {
                          event.stopPropagation();
                          openTenantAdmin(tenant);
                        }} type="button">
                              <ExternalLink className="h-4 w-4" />
                              Monitor
                            </button>
                            {isTenantVerified(tenant) ? <button className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${tenant.status === "active" ? "border border-rose-200 text-rose-700 hover:bg-rose-50" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`} onClick={event => {
                          event.stopPropagation();
                          handleTenantStatusChange(tenant);
                        }} disabled={updatingTenantId === tenant._id} type="button">
                                {updatingTenantId === tenant._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                                {tenant.status === "active" ? "Deactivate" : "Activate"}
                              </button> : null}
                          </div>
                        </td>
                      </tr>)}
                    {!loading && tenants.length === 0 ? <tr><td className="py-6 text-slate-500" colSpan="5">No tenants found.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div> : <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Admin Support Requests</h2>
              <p className="mt-1 text-sm text-slate-500">Messages sent by tenant admins to the platform team.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {supportRequests.filter(request => request.status !== "resolved").length} Open
            </span>
          </div>

          <div className="mt-4 max-h-[40rem] space-y-3 overflow-y-auto overscroll-contain pr-1">
            {supportRequests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                No support requests yet.
              </div> : supportRequests.map(request => <article key={request._id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{request.subject}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${request.status === "resolved" ? "bg-emerald-100 text-emerald-700" : request.status === "in_progress" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                          {String(request.status || "open").replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {request.tenant?.name || "Unknown tenant"} • {request.createdBy?.name || "Admin"} • {new Date(request.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{request.message}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {request.status !== "in_progress" ? <button type="button" disabled={updatingSupportId === request._id} onClick={() => handleSupportStatusChange(request._id, "in_progress")} className="rounded-2xl border border-sky-200 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50">
                          In Progress
                        </button> : null}
                      {request.status !== "resolved" ? <button type="button" disabled={updatingSupportId === request._id} onClick={() => handleSupportStatusChange(request._id, "resolved")} className="rounded-2xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                          {updatingSupportId === request._id ? "Saving..." : "Resolve"}
                        </button> : null}
                      {request.status !== "open" ? <button type="button" disabled={updatingSupportId === request._id} onClick={() => handleSupportStatusChange(request._id, "open")} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          Reopen
                        </button> : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>Category: {request.category}. Workspace route: {request.tenant?.slug ? `/${request.tenant.slug}/${request.tenant.key}` : "Unavailable"}.</span>
                  </div>
                </article>)}
          </div>
        </section>}
    </div>;
}
