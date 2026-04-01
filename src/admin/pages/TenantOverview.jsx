import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { tenantService } from "../../common/services";
import { buildPlatformAdminPath } from "../../common/utils/routes";

const renderRows = (items = [], columns = []) => {
  if (!items.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">No data available.</div>;
  }

  return <>
      <div className="space-y-3 md:hidden">
        {items.map(item => <div key={item._id || item.id || JSON.stringify(item)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-2">
              {columns.map(column => <div key={column.key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {column.label}
                  </span>
                  <span className="text-sm text-slate-700 break-words">
                    {column.render ? column.render(item) : item?.[column.key] ?? "-"}
                  </span>
                </div>)}
            </div>
          </div>)}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              {columns.map(column => <th key={column.key} className="pb-3 pr-4">{column.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => <tr key={item._id || item.id || JSON.stringify(item)}>
                {columns.map(column => <td key={column.key} className="py-3 pr-4 text-slate-700">
                    {column.render ? column.render(item) : item?.[column.key] ?? "-"}
                  </td>)}
              </tr>)}
          </tbody>
        </table>
      </div>
    </>;
};

export function TenantOverview() {
  const navigate = useNavigate();
  const { tenantId } = useParams();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await tenantService.getTenantOverview(tenantId);
      setOverview(response?.data || null);
    } catch (loadError) {
      setError(loadError?.message || "Failed to load tenant overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [tenantId]);

  const handleVerify = async () => {
    setVerifying(true);
    setError("");
    try {
      await tenantService.verifyTenant(tenantId);
      await loadOverview();
    } catch (verifyError) {
      setError(verifyError?.message || "Failed to verify tenant");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>;
  }

  if (!overview?.tenant) {
    return <div className="p-4 text-sm text-slate-600 sm:p-6">Tenant not found.</div>;
  }

  const { tenant, summary, settings, workspace } = overview;
  const canVerify = tenant?.onboarding?.verificationStatus === "pending" || tenant?.status === "pending";

  return <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between sm:p-6">
        <div>
          <button className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800" onClick={() => navigate(buildPlatformAdminPath("/tenant-management"))} type="button">
            <ArrowLeft className="h-4 w-4" />
            Back to Tenant Management
          </button>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">{tenant.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Route: /{tenant.slug}/{tenant.key} · Plan: {tenant.subscription?.plan || "starter"} · Status: {tenant.onboarding?.verificationStatus || tenant.status}
          </p>
        </div>
        {canVerify ? <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 lg:w-auto" disabled={verifying} onClick={handleVerify} type="button">
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Verify Tenant
          </button> : null}
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Staff", summary?.staffCount],
          ["Customers", summary?.customerCount],
          ["Tables", summary?.tableCount],
          ["Orders", summary?.orderCount],
          ["Menu Items", summary?.menuItemCount],
          ["Categories", summary?.categoryCount],
          ["Inventory", summary?.inventoryCount],
          ["Kitchen Stations", summary?.kitchenStationCount],
        ].map(([label, value]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">{label}</div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">{value || 0}</div>
            </div>)}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Restaurant Settings Snapshot</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Restaurant</div>
            <div className="mt-2 font-semibold text-slate-900">{settings?.restaurant?.name || tenant.name}</div>
            <div className="mt-1 text-sm text-slate-600">{settings?.restaurant?.email || tenant.contact?.email || "-"}</div>
            <div className="mt-1 text-sm text-slate-600">{settings?.restaurant?.phone || tenant.contact?.phone || "-"}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Verification</div>
            <div className="mt-2 font-semibold text-slate-900 capitalize">{tenant.onboarding?.verificationStatus || "not_required"}</div>
            <div className="mt-1 text-sm text-slate-600">Source: {tenant.onboarding?.source || "platform_admin"}</div>
            <div className="mt-1 text-sm text-slate-600">Submitted: {tenant.onboarding?.submittedAt ? new Date(tenant.onboarding.submittedAt).toLocaleString() : "-"}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Staff</h2>
          <div className="mt-4">
            {renderRows(workspace?.staff, [{
            key: "name",
            label: "Name"
          }, {
            key: "email",
            label: "Email"
          }, {
            key: "role",
            label: "Role"
          }, {
            key: "isActive",
            label: "Active",
            render: item => item?.isActive ? "Yes" : "No"
          }])}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Tables</h2>
          <div className="mt-4">
            {renderRows(workspace?.tables, [{
            key: "tableNumber",
            label: "Table"
          }, {
            key: "tableName",
            label: "Name"
          }, {
            key: "status",
            label: "Status"
          }, {
            key: "capacity",
            label: "Capacity"
          }])}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Kitchen Stations</h2>
          <div className="mt-4">
            {renderRows(workspace?.kitchenStations, [{
            key: "name",
            label: "Station"
          }, {
            key: "stationType",
            label: "Type"
          }, {
            key: "status",
            label: "Status"
          }, {
            key: "capacity",
            label: "Capacity"
          }])}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
          <div className="mt-4">
            {renderRows(workspace?.categories, [{
            key: "name",
            label: "Category"
          }, {
            key: "description",
            label: "Description"
          }, {
            key: "isActive",
            label: "Active",
            render: item => item?.isActive ? "Yes" : "No"
          }])}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Menu Items</h2>
          <div className="mt-4">
            {renderRows(workspace?.menuItems, [{
            key: "name",
            label: "Item"
          }, {
            key: "category",
            label: "Category",
            render: item => item?.category?.name || "-"
          }, {
            key: "station",
            label: "Station",
            render: item => item?.station?.name || "-"
          }, {
            key: "isAvailable",
            label: "Available",
            render: item => item?.isAvailable ? "Yes" : "No"
          }])}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Inventory</h2>
          <div className="mt-4">
            {renderRows(workspace?.inventoryItems, [{
            key: "ingredientName",
            label: "Ingredient"
          }, {
            key: "currentStock",
            label: "Stock"
          }, {
            key: "unit",
            label: "Unit"
          }, {
            key: "status",
            label: "Status"
          }])}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
          <div className="mt-4">
            {renderRows(workspace?.recentOrders, [{
            key: "orderNumber",
            label: "Order"
          }, {
            key: "status",
            label: "Status"
          }, {
            key: "paymentStatus",
            label: "Payment"
          }, {
            key: "totalAmount",
            label: "Total"
          }])}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Feedback</h2>
          <div className="mt-4">
            {renderRows(workspace?.recentFeedback, [{
            key: "ratings",
            label: "Rating",
            render: item => item?.ratings?.overall || "-"
          }, {
            key: "sentiment",
            label: "Sentiment"
          }, {
            key: "status",
            label: "Status"
          }, {
            key: "comments",
            label: "Comment"
          }])}
          </div>
        </div>
      </section>
    </div>;
}
