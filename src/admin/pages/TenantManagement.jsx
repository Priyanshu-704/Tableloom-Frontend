import React, { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ExternalLink, Loader2, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tenantService } from "../../common/services";
import { buildTenantPath } from "../../common/utils/routes";

const initialForm = {
  restaurantName: "",
  slug: "",
  key: "",
  adminName: "",
  adminEmail: "",
  subscriptionPlan: "starter"
};

export function TenantManagement() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingTenantId, setVerifyingTenantId] = useState("");

  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await tenantService.getTenants();
      setTenants(Array.isArray(response?.data) ? response.data : []);
    } catch (loadError) {
      setError(loadError?.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
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
      setSuccess(response?.message || "Tenant created successfully");
      setForm(initialForm);
      await loadTenants();
    } catch (createError) {
      setError(createError?.message || "Failed to create tenant");
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
      setSuccess(response?.message || "Tenant verified successfully");
      await loadTenants();
    } catch (verifyError) {
      setError(verifyError?.message || "Failed to verify tenant");
    } finally {
      setVerifyingTenantId("");
    }
  };

  const getTenantAdminPath = tenant => buildTenantPath("/admin/dashboard", {
    tenantSlug: tenant?.slug,
    tenantKey: tenant?.key
  });
  const getTenantWorkspacePath = tenant => `/${tenant?.slug || "tenant"}/${tenant?.key || "workspace"}`;

  const openTenantAdmin = tenant => {
    const tenantAdminPath = getTenantAdminPath(tenant);
    const openedWindow = window.open(tenantAdminPath, "_blank");

    if (!openedWindow) {
      navigate(tenantAdminPath);
    }
  };

  return <div className="space-y-5 p-4 sm:p-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Platform</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Tenant Management</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Create restaurant workspaces, review self-registration requests, verify pending tenants, and open any tenant in read-only mode.
        </p>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
      {credentials ? <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Admin email: <strong>{credentials.email}</strong><br />
          Temporary password: <strong>{credentials.temporaryPassword}</strong>
        </div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
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

            <div className="mt-4 space-y-3">
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

            <div className="mt-4 space-y-3 lg:hidden">
              {loading ? <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">Loading tenants...</div> : tenants.map(tenant => <button key={tenant._id} className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50" onClick={() => openTenantAdmin(tenant)} type="button">
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
                  </button>)}
              {!loading && tenants.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">No tenants found.</div> : null}
            </div>

            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
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
                        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={event => {
                      event.stopPropagation();
                      openTenantAdmin(tenant);
                    }} type="button">
                          <ExternalLink className="h-4 w-4" />
                          Monitor
                        </button>
                      </td>
                    </tr>)}
                  {!loading && tenants.length === 0 ? <tr><td className="py-6 text-slate-500" colSpan="5">No tenants found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>;
}
