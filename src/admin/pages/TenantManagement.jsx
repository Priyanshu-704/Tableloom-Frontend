import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquareText,
  PlusCircle,
  Power,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supportService, tenantService } from "../../common/services";
import { buildTenantPath } from "../../common/utils/routes";
import {
  buildTenantWorkspacePath,
  normalizeTenantKeyInput,
  normalizeTenantSlugInput,
} from "../../common/utils/tenantWorkspace";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import { AdminPagination } from "../components/common/AdminPagination";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
const initialForm = {
  restaurantName: "",
  slug: "",
  key: "",
  adminName: "",
  adminEmail: "",
  phone: "",
  subscriptionPlan: "starter",
};
const TENANT_PAGE_SIZE = 10;
const defaultTenantPagination = {
  page: 1,
  pages: 1,
  total: 0,
  limit: TENANT_PAGE_SIZE,
};
const superAdminTabs = [
  {
    id: "registered",
    label: "Registered Tenants",
    description: "Active and verified restaurant workspaces",
  },
  {
    id: "pending",
    label: "Pending Approvals",
    description: "Registrations waiting for review or approval",
  },
  {
    id: "requests",
    label: "Admin Requests",
    description: "Review and respond to tenant admin requests",
  },
];
const requestStatusTone = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-100 text-sky-700",
  resolved: "bg-emerald-100 text-emerald-700",
};
const requestCategoryLabel = {
  access: "Access",
  tenant: "Tenant",
  billing: "Billing",
  technical: "Technical",
  account: "Account",
  other: "Other",
};
const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
const formatRequestStatus = (status = "open") =>
  String(status || "open").replace(/_/g, " ");
const isSupportRequestLocked = (status = "open") =>
  ["resolved", "closed"].includes(String(status || "open").toLowerCase());
const isPaymentApprovalReady = (tenant = {}) =>
  ["paid", "approval_requested", "approved"].includes(
    String(tenant?.payment?.status || "").toLowerCase(),
  );
export function TenantManagement() {
  const isMonitoringMode = useMonitoringMode();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addNotification, confirmAction } = useAdmin();
  const [registeredTenants, setRegisteredTenants] = useState([]);
  const [pendingTenants, setPendingTenants] = useState([]);
  const [registeredPagination, setRegisteredPagination] = useState(
    defaultTenantPagination,
  );
  const [pendingPagination, setPendingPagination] = useState(
    defaultTenantPagination,
  );
  const [registeredPage, setRegisteredPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [supportRequests, setSupportRequests] = useState([]);
  const [responseDrafts, setResponseDrafts] = useState({});
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreateTenantModalOpen, setIsCreateTenantModalOpen] = useState(false);
  const [verifyingTenantId, setVerifyingTenantId] = useState("");
  const [rejectingTenantId, setRejectingTenantId] = useState("");
  const [updatingTenantId, setUpdatingTenantId] = useState("");
  const [updatingSupportId, setUpdatingSupportId] = useState("");
  const requestedTab = String(searchParams.get("tab") || "")
    .trim()
    .toLowerCase();
  const activeTab = ["pending", "requests"].includes(requestedTab)
    ? requestedTab
    : "registered";
  const loadTenantSection = async (section, page) => {
    try {
      const response = await tenantService.getTenants({
        section,
        page,
        limit: TENANT_PAGE_SIZE,
      });
      const items = Array.isArray(response?.data) ? response.data : [];
      const pagination = {
        page: response?.pagination?.page || page,
        pages: response?.pagination?.pages || 1,
        total: response?.pagination?.total || 0,
        limit: response?.pagination?.limit || TENANT_PAGE_SIZE,
      };
      if (section === "pending") {
        setPendingTenants(items);
        setPendingPagination(pagination);
        return;
      }
      setRegisteredTenants(items);
      setRegisteredPagination(pagination);
    } catch (loadError) {
      const message = loadError?.message || "Failed to load tenants";
      setError(message);
      addNotification(message, "error");
    }
  };
  const loadTenants = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTenantSection("registered", registeredPage),
        loadTenantSection("pending", pendingPage),
      ]);
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
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registeredPage, pendingPage]);
  useEffect(() => {
    loadSupportRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setResponseDrafts((current) =>
      supportRequests.reduce((next, request) => {
        next[request._id] =
          current[request._id] ?? request.responseMessage ?? "";
        return next;
      }, {}),
    );
  }, [supportRequests]);
  const openSupportRequests = useMemo(
    () =>
      supportRequests.filter(
        (request) => !isSupportRequestLocked(request.status),
      ).length,
    [supportRequests],
  );
  const getPreviousPage = (items, currentPage) =>
    items.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]:
        field === "slug"
          ? normalizeTenantSlugInput(value)
          : field === "key"
            ? normalizeTenantKeyInput(value)
            : value,
    }));
  };
  const resetFeedback = () => {
    setError("");
    setSuccess("");
  };
  const resetTenantForm = () => {
    setForm(initialForm);
  };
  const openCreateTenantModal = () => {
    resetFeedback();
    setCredentials(null);
    resetTenantForm();
    setIsCreateTenantModalOpen(true);
  };
  const closeTenantModal = ({ force = false } = {}) => {
    if (submitting && !force) {
      return;
    }
    setIsCreateTenantModalOpen(false);
    resetTenantForm();
  };
  const handleSubmitTenant = async (event) => {
    event.preventDefault();
    if (isMonitoringMode) {
      addNotification(
        "Tenant management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    setSubmitting(true);
    resetFeedback();
    try {
      const response = await tenantService.createTenant(form);
      setCredentials(response?.data?.credentials || null);
      const message = response?.message || "Tenant created successfully";
      setSuccess(message);
      addNotification(message, "success");
      closeTenantModal({
        force: true,
      });
      const shouldReloadRegisteredImmediately = registeredPage === 1;
      setRegisteredPage(1);
      if (shouldReloadRegisteredImmediately) {
        await loadTenantSection("registered", 1);
      }
    } catch (createError) {
      const message = createError?.message || "Failed to create tenant";
      setError(message);
      addNotification(message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const handleVerifyTenant = async (tenantId) => {
    if (isMonitoringMode) {
      addNotification(
        "Tenant management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    setVerifyingTenantId(tenantId);
    resetFeedback();
    try {
      const response = await tenantService.verifyTenant(tenantId);
      setCredentials(response?.data?.credentials || null);
      const message =
        response?.message ||
        "Tenant approved successfully and setup email sent";
      setSuccess(message);
      addNotification(message, "success");
      const nextPendingPage = getPreviousPage(pendingTenants, pendingPage);
      setPendingPage(nextPendingPage);
      if (nextPendingPage === pendingPage) {
        await Promise.all([
          loadTenantSection("registered", registeredPage),
          loadTenantSection("pending", pendingPage),
        ]);
      }
    } catch (verifyError) {
      const message = verifyError?.message || "Failed to verify tenant";
      setError(message);
      addNotification(message, "error");
    } finally {
      setVerifyingTenantId("");
    }
  };
  const handleRejectTenant = async (tenant) => {
    if (isMonitoringMode) {
      addNotification(
        "Tenant management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    const confirmed = await confirmAction({
      title: "Reject Tenant",
      message: `Are you sure you want to reject ${tenant?.name}? A rejection email will be sent to the requested admin.`,
      confirmLabel: "Reject Tenant",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }
    setRejectingTenantId(tenant._id);
    resetFeedback();
    try {
      const response = await tenantService.rejectTenant(tenant._id);
      const message = response?.message || "Tenant rejected successfully";
      setSuccess(message);
      addNotification(message, "success");
      const nextPendingPage = getPreviousPage(pendingTenants, pendingPage);
      setPendingPage(nextPendingPage);
      if (nextPendingPage === pendingPage) {
        await loadTenantSection("pending", pendingPage);
      }
    } catch (rejectError) {
      const message = rejectError?.message || "Failed to reject tenant";
      setError(message);
      addNotification(message, "error");
    } finally {
      setRejectingTenantId("");
    }
  };
  const getTenantAdminPath = (tenant) =>
    buildTenantPath("/admin/dashboard", {
      tenantSlug: tenant?.slug,
      tenantKey: tenant?.key,
    });
  const getTenantWorkspacePath = (tenant) => buildTenantWorkspacePath(tenant);
  const isTenantVerified = (tenant) =>
    tenant?.onboarding?.verificationStatus === "verified" ||
    Boolean(tenant?.adminUser);
  const handleTenantStatusChange = async (tenant) => {
    if (isMonitoringMode) {
      addNotification(
        "Tenant management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    const nextStatus = tenant?.status === "active" ? "suspended" : "active";
    const actionLabel = nextStatus === "active" ? "Activate" : "Deactivate";
    const confirmed = await confirmAction({
      title: `${actionLabel} Tenant`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} ${tenant?.name}?`,
      confirmLabel: actionLabel,
      tone: nextStatus === "active" ? "warning" : "danger",
    });
    if (!confirmed) {
      return;
    }
    setUpdatingTenantId(tenant._id);
    resetFeedback();
    try {
      const response = await tenantService.updateTenantStatus(
        tenant._id,
        nextStatus,
      );
      const message =
        response?.message ||
        `Tenant ${nextStatus === "active" ? "activated" : "deactivated"} successfully`;
      setSuccess(message);
      addNotification(message, "success");
      await loadTenantSection("registered", registeredPage);
    } catch (statusError) {
      const message = statusError?.message || "Failed to update tenant status";
      setError(message);
      addNotification(message, "error");
    } finally {
      setUpdatingTenantId("");
    }
  };
  const handleSupportDraftChange = (requestId, value) => {
    setResponseDrafts((current) => ({
      ...current,
      [requestId]: value,
    }));
  };
  const handleSupportStatusChange = async (request, nextStatus) => {
    if (isMonitoringMode) {
      addNotification(
        "Support request actions are disabled in monitoring mode.",
        "error",
      );
      return;
    }
    if (isSupportRequestLocked(request.status)) {
      addNotification(
        "Resolved support requests can no longer be updated",
        "error",
      );
      return;
    }
    setUpdatingSupportId(request._id);
    try {
      const response = await supportService.updateSupportRequestStatus(
        request._id,
        {
          status: nextStatus,
          responseMessage: String(
            responseDrafts[request._id] ?? request.responseMessage ?? "",
          ).trim(),
        },
      );
      addNotification(
        response?.message ||
          `Support request marked as ${formatRequestStatus(nextStatus)}`,
        "success",
      );
      await loadSupportRequests();
    } catch (requestError) {
      addNotification(
        requestError?.message || "Failed to update support request",
        "error",
      );
    } finally {
      setUpdatingSupportId("");
    }
  };
  const handleSupportResponseSave = async (request) => {
    if (isMonitoringMode) {
      addNotification(
        "Support request actions are disabled in monitoring mode.",
        "error",
      );
      return;
    }
    if (isSupportRequestLocked(request.status)) {
      addNotification(
        "Resolved support requests can no longer be updated",
        "error",
      );
      return;
    }
    setUpdatingSupportId(request._id);
    try {
      const response = await supportService.updateSupportRequestStatus(
        request._id,
        {
          status: request.status,
          responseMessage: String(
            responseDrafts[request._id] ?? request.responseMessage ?? "",
          ).trim(),
        },
      );
      addNotification(
        response?.message || "Super admin response saved successfully",
        "success",
      );
      await loadSupportRequests();
    } catch (requestError) {
      addNotification(
        requestError?.message || "Failed to save support response",
        "error",
      );
    } finally {
      setUpdatingSupportId("");
    }
  };
  const openTenantAdmin = (tenant) => {
    const tenantAdminPath = getTenantAdminPath(tenant);
    const openedWindow = window.open(tenantAdminPath, "_blank");
    if (!openedWindow) {
      navigate(tenantAdminPath);
    }
  };
  const switchTab = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    if (tabId === "registered") {
      nextParams.delete("tab");
    } else if (tabId === "requests") {
      nextParams.set("tab", "requests");
    } else {
      nextParams.set("tab", tabId);
    }
    setSearchParams(nextParams, {
      replace: true,
    });
  };
  const createRoutePreview =
    form.slug && form.key ? getTenantWorkspacePath(form) : "/your-slug/yourkey";
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
              Platform
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Super Admin Panel
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Register new restaurant workspaces, review pending verification,
              and respond to tenant admin access requests from one place.
            </p>
          </div>

          {activeTab !== "requests" && !isMonitoringMode ? (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={openCreateTenantModal}
              type="button"
            >
              <PlusCircle className="h-4 w-4" />
              Register Tenant
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {superAdminTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${activeTab === tab.id ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
            >
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span>{tab.label}</span>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-current">
                  {tab.id === "registered"
                    ? registeredPagination.total
                    : tab.id === "pending"
                      ? pendingPagination.total
                      : openSupportRequests}
                </span>
              </div>
              <div className="mt-1 text-xs leading-5 opacity-80">
                {tab.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}
      {credentials ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Admin email: <strong>{credentials.email}</strong>
          <br />
          {credentials.emailSent
            ? "Credentials were sent by email. Temporary passwords are no longer displayed in the admin panel."
            : "Credential email could not be delivered. Use the password reset flow for this admin email instead of sharing a temporary password."}
        </div>
      ) : null}

      {activeTab !== "requests" ? (
        <div className="space-y-6">
          {activeTab === "pending" ? (
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Pending Approvals
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review registrations, payment state, and approve admin
                    access from one place.
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {pendingPagination.total} Pending
                </span>
              </div>

              <div className="mt-4 max-h-128 overflow-y-auto overscroll-contain pr-1">
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
                    Loading pending approvals...
                  </div>
                ) : null}
                {!loading && pendingTenants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No pending tenant registrations.
                  </div>
                ) : null}
                {!loading && pendingTenants.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {pendingTenants.map((tenant) => (
                      <div
                        key={tenant._id}
                        className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {tenant.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {tenant.requestedAdmin?.name ||
                                tenant.adminUser?.name ||
                                "Pending admin"}
                            </div>
                          </div>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                            Pending
                          </span>
                        </div>
                        <div className="grid gap-2 text-sm text-slate-500">
                          <div>
                            {tenant.requestedAdmin?.email ||
                              tenant.contact?.email}
                          </div>
                          {tenant.requestedAdmin?.phone ||
                          tenant.contact?.phone ? (
                            <div>
                              {tenant.requestedAdmin?.phone ||
                                tenant.contact?.phone}
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                          <div>
                            Plan:{" "}
                            <span className="font-medium capitalize text-slate-900">
                              {tenant.subscription?.plan || "starter"}
                            </span>
                          </div>
                          <div className="mt-1">
                            Payment:{" "}
                            <span className="font-medium capitalize text-slate-900">
                              {tenant.payment?.status || "not_required"}
                            </span>
                            {tenant.payment?.method ? (
                              <span className="text-slate-500">
                                {" "}
                                via {tenant.payment.method}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1">
                            Amount:{" "}
                            <span className="font-medium text-slate-900">
                              {formatCurrency(
                                tenant.payment?.amount || 10000,
                                tenant.payment?.currency || "INR",
                              )}
                            </span>
                          </div>
                          {tenant.payment?.reference ? (
                            <div className="mt-1">
                              Reference:{" "}
                              <span className="font-medium text-slate-900">
                                {tenant.payment.reference}
                              </span>
                            </div>
                          ) : null}
                          <div className="mt-1">
                            Route:{" "}
                            <span className="font-mono text-xs text-slate-700">
                              {getTenantWorkspacePath(tenant)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-auto grid gap-2 sm:grid-cols-2">
                          {!isMonitoringMode ? (
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                              disabled={
                                verifyingTenantId === tenant._id ||
                                rejectingTenantId === tenant._id
                              }
                              onClick={() => handleVerifyTenant(tenant._id)}
                              type="button"
                            >
                              {verifyingTenantId === tenant._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Approve & Send Credentials
                            </button>
                          ) : null}
                          {!isMonitoringMode ? (
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                              disabled={
                                rejectingTenantId === tenant._id ||
                                verifyingTenantId === tenant._id
                              }
                              onClick={() => handleRejectTenant(tenant)}
                              type="button"
                            >
                              {rejectingTenantId === tenant._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              Reject
                            </button>
                          ) : null}
                        </div>
                        {!isPaymentApprovalReady(tenant) ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                            Payment is still marked as{" "}
                            <strong>
                              {tenant.payment?.status || "unpaid"}
                            </strong>
                            . Super admin can still approve this tenant
                            manually.
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <AdminPagination
                  page={pendingPagination.page}
                  totalPages={pendingPagination.pages}
                  totalItems={pendingPagination.total}
                  pageSize={pendingPagination.limit || TENANT_PAGE_SIZE}
                  itemLabel="pending approvals"
                  onPageChange={setPendingPage}
                />
              </div>
            </section>
          ) : null}

          {activeTab === "registered" ? (
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-sky-600" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Registered Tenants
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Active and verified restaurant workspaces.
                  </p>
                </div>
              </div>

              <div className="mt-4 max-h-128 space-y-3 overflow-y-auto overscroll-contain pr-1 lg:hidden">
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
                    Loading tenants...
                  </div>
                ) : null}
                {!loading
                  ? registeredTenants.map((tenant) => (
                      <div
                        key={tenant._id}
                        className="rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {tenant.name}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {tenant.contact?.email ||
                                tenant.requestedAdmin?.email ||
                                "No email"}
                            </div>
                          </div>
                          <ExternalLink className="mt-1 h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 inline-flex rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-700">
                          {getTenantWorkspacePath(tenant)}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            Plan:{" "}
                            <span className="font-medium capitalize text-slate-900">
                              {tenant.subscription?.plan || "starter"}
                            </span>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            Status:{" "}
                            <span className="font-medium capitalize text-slate-900">
                              {tenant.onboarding?.verificationStatus ||
                                tenant.status}
                            </span>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            Payment:{" "}
                            <span className="font-medium capitalize text-slate-900">
                              {tenant.payment?.status || "not_required"}
                            </span>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            Amount:{" "}
                            <span className="font-medium text-slate-900">
                              {formatCurrency(
                                tenant.payment?.amount || 10000,
                                tenant.payment?.currency || "INR",
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {isTenantVerified(tenant) ? (
                            <button
                              type="button"
                              onClick={() => openTenantAdmin(tenant)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Monitor
                            </button>
                          ) : null}
                          {!isMonitoringMode && isTenantVerified(tenant) ? (
                            <button
                              type="button"
                              onClick={() => handleTenantStatusChange(tenant)}
                              disabled={updatingTenantId === tenant._id}
                              className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${tenant.status === "active" ? "border border-rose-200 text-rose-700 hover:bg-rose-50" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                            >
                              {updatingTenantId === tenant._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                              {tenant.status === "active"
                                ? "Deactivate Tenant"
                                : "Activate Tenant"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  : null}
                {!loading && registeredTenants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No registered tenants found.
                  </div>
                ) : null}
              </div>

              <div className="mt-4 hidden max-h-128 overflow-auto lg:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-slate-500">
                      <th className="pb-3 pr-4">Restaurant</th>
                      <th className="pb-3 pr-4">Route</th>
                      <th className="pb-3 pr-4">Plan</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Payment</th>
                      <th className="pb-3 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td className="py-6 text-slate-500" colSpan="6">
                          Loading tenants...
                        </td>
                      </tr>
                    ) : null}
                    {!loading
                      ? registeredTenants.map((tenant) => (
                          <tr
                            key={tenant._id}
                            className={
                              isTenantVerified(tenant)
                                ? "cursor-pointer hover:bg-slate-50"
                                : ""
                            }
                            onClick={() => {
                              if (isTenantVerified(tenant)) {
                                openTenantAdmin(tenant);
                              }
                            }}
                          >
                            <td className="py-4 pr-4">
                              <div className="font-medium text-slate-900">
                                {tenant.name}
                              </div>
                              <div className="text-slate-500">
                                {tenant.contact?.email ||
                                  tenant.requestedAdmin?.email ||
                                  "No email"}
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              {getTenantWorkspacePath(tenant)}
                            </td>
                            <td className="py-4 pr-4 capitalize">
                              {tenant.subscription?.plan || "starter"}
                            </td>
                            <td className="py-4 pr-4 capitalize">
                              {tenant.onboarding?.verificationStatus ||
                                tenant.status}
                            </td>
                            <td className="py-4 pr-4">
                              <div className="capitalize text-slate-700">
                                {tenant.payment?.status || "not_required"}
                              </div>
                              {tenant.payment?.method ? (
                                <div className="text-xs text-slate-500">
                                  {tenant.payment.method} ·{" "}
                                  {formatCurrency(
                                    tenant.payment?.amount || 10000,
                                    tenant.payment?.currency || "INR",
                                  )}
                                </div>
                              ) : null}
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex flex-wrap gap-2">
                                {isTenantVerified(tenant) ? (
                                  <button
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openTenantAdmin(tenant);
                                    }}
                                    type="button"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Monitor
                                  </button>
                                ) : null}
                                {!isMonitoringMode &&
                                isTenantVerified(tenant) ? (
                                  <button
                                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${tenant.status === "active" ? "border border-rose-200 text-rose-700 hover:bg-rose-50" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleTenantStatusChange(tenant);
                                    }}
                                    disabled={updatingTenantId === tenant._id}
                                    type="button"
                                  >
                                    {updatingTenantId === tenant._id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Power className="h-4 w-4" />
                                    )}
                                    {tenant.status === "active"
                                      ? "Deactivate"
                                      : "Activate"}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      : null}
                    {!loading && registeredTenants.length === 0 ? (
                      <tr>
                        <td className="py-6 text-slate-500" colSpan="6">
                          No registered tenants found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <AdminPagination
                  page={registeredPagination.page}
                  totalPages={registeredPagination.pages}
                  totalItems={registeredPagination.total}
                  pageSize={registeredPagination.limit || TENANT_PAGE_SIZE}
                  itemLabel="registered tenants"
                  onPageChange={setRegisteredPage}
                />
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Admin Requests
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tenant admin messages, status tracking, and platform responses.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {openSupportRequests} Open
            </span>
          </div>

          <div className="mt-4 max-h-176 space-y-4 overflow-y-auto overscroll-contain pr-1">
            {supportRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                No support requests yet.
              </div>
            ) : (
              supportRequests.map((request) => {
                const responseDraft =
                  responseDrafts[request._id] ?? request.responseMessage ?? "";
                const responseChanged =
                  String(responseDraft).trim() !==
                  String(request.responseMessage || "").trim();
                const isRequestLocked = isSupportRequestLocked(request.status);
                return (
                  <article
                    key={request._id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {request.subject}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${requestStatusTone[request.status] || requestStatusTone.open}`}
                          >
                            {formatRequestStatus(request.status)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {requestCategoryLabel[request.category] || "Other"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {request.tenant?.name || "Unknown tenant"} •{" "}
                          {request.createdBy?.name || "Admin"} •{" "}
                          {new Date(request.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {request.message}
                        </p>

                        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            Workspace route:{" "}
                            {request.tenant?.slug
                              ? `/${request.tenant.slug}/${request.tenant.key}`
                              : "Unavailable"}
                            .
                          </span>
                        </div>

                        {request.responseMessage ? (
                          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                              Latest Response
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {request.responseMessage}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              {request.respondedBy?.name
                                ? `By ${request.respondedBy.name}`
                                : "By super admin"}
                              {request.respondedAt
                                ? ` on ${new Date(request.respondedAt).toLocaleString()}`
                                : ""}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="w-full xl:w-88">
                        {isRequestLocked || isMonitoringMode ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {isMonitoringMode
                              ? "Monitoring mode is active. Response and status changes are disabled for Super Admin."
                              : "This request is resolved and locked. Response and status changes are no longer available."}
                          </div>
                        ) : (
                          <>
                            <label className="block text-sm font-semibold text-slate-800">
                              Super Admin Response
                              <textarea
                                className="mt-2 min-h-37 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                maxLength={2500}
                                placeholder="Write a response back to the tenant admin."
                                value={responseDraft}
                                onChange={(event) =>
                                  handleSupportDraftChange(
                                    request._id,
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {["open", "in_progress", "resolved"].map(
                                (status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={updatingSupportId === request._id}
                                    onClick={() =>
                                      handleSupportStatusChange(request, status)
                                    }
                                    className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${request.status === status ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                                  >
                                    {status === "in_progress"
                                      ? "In Progress"
                                      : status === "resolved"
                                        ? "Resolve"
                                        : "Open"}
                                  </button>
                                ),
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={
                                updatingSupportId === request._id ||
                                !responseChanged
                              }
                              onClick={() => handleSupportResponseSave(request)}
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                            >
                              {updatingSupportId === request._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Save Response
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      {!isMonitoringMode ? (
        <AdminModal
          isOpen={isCreateTenantModalOpen}
          onClose={closeTenantModal}
          title="Register Tenant Workspace"
          subtitle="Create a new restaurant workspace from the Super Admin panel."
          maxWidth="max-w-3xl"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  closeTenantModal({
                    force: true,
                  })
                }
                disabled={submitting}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-tenant-form"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                {submitting ? "Creating..." : "Create Tenant"}
              </button>
            </div>
          }
        >
          <form
            id="create-tenant-form"
            className="space-y-5 p-4 sm:p-5"
            onSubmit={handleSubmitTenant}
          >
            <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Workspace Route Preview
              </p>
              <p className="mt-2 break-all rounded-2xl bg-slate-900 px-3 py-3 font-mono text-[13px] text-white">
                {createRoutePreview}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Slugs now support lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-800">
                Restaurant Name
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Example: Tableloom Restaurant"
                  value={form.restaurantName}
                  onChange={(event) =>
                    handleChange("restaurantName", event.target.value)
                  }
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Contact Phone Number
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Example: +91 98765 43210"
                  value={form.phone}
                  onChange={(event) =>
                    handleChange("phone", event.target.value)
                  }
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-800">
                Workspace Slug
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Example: tableloom-restaurant"
                  value={form.slug}
                  onChange={(event) => handleChange("slug", event.target.value)}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Workspace Key
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Example: main-01"
                  value={form.key}
                  onChange={(event) => handleChange("key", event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-800">
                Admin Name
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Example: Ayesha Khan"
                  value={form.adminName}
                  onChange={(event) =>
                    handleChange("adminName", event.target.value)
                  }
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Admin Email
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  placeholder="Example: admin@yourrestaurant.com"
                  type="email"
                  value={form.adminEmail}
                  onChange={(event) =>
                    handleChange("adminEmail", event.target.value)
                  }
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-slate-800">
              Subscription Plan
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={form.subscriptionPlan}
                onChange={(event) =>
                  handleChange("subscriptionPlan", event.target.value)
                }
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
          </form>
        </AdminModal>
      ) : null}
    </div>
  );
}
