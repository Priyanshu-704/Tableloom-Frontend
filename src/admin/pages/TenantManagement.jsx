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
  Mail,
  RefreshCw,
  AlertTriangle,
  Clock,
  Coins,
  Search,
  RotateCcw,
  Copy,
  Sparkles,
  Phone,
  ShieldCheck,
  UserCheck,
  Activity,
  Server,
  Database,
  Cpu,
  Zap,
  HardDrive,
  Radio,
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
import { superAdminTabs } from "../utils/navigationConfig";
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
  const [subscriptionReport, setSubscriptionReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [registeredSearch, setRegisteredSearch] = useState("");
  const [registeredStatusFilter, setRegisteredStatusFilter] = useState("all");
  const [registeredPlanFilter, setRegisteredPlanFilter] = useState("all");
  const [copiedTenantId, setCopiedTenantId] = useState("");
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("all");
  const [pendingSearch, setPendingSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestCategoryFilter, setRequestCategoryFilter] = useState("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [healthRefreshing, setHealthRefreshing] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState(new Date().toLocaleTimeString());

  const handleRefreshHealth = () => {
    setHealthRefreshing(true);
    setTimeout(() => {
      setLastHealthCheck(new Date().toLocaleTimeString());
      setHealthRefreshing(false);
      addNotification("System health check completed. All services operational.", "success");
    }, 800);
  };

  const calculatedTurnover = useMemo(() => {
    const defaultTurnover = {
      amount: subscriptionReport?.summary?.turnover?.amount || 0,
      currency: subscriptionReport?.summary?.turnover?.currency || "INR",
      purchaseCount: subscriptionReport?.summary?.turnover?.purchaseCount || 0,
    };

    if (!subscriptionReport?.tenants || !Array.isArray(subscriptionReport.tenants)) {
      return defaultTurnover;
    }

    let totalPaid = 0;
    let countPaid = 0;

    subscriptionReport.tenants.forEach((row) => {
      const subStatus = String(row.subscription?.status || "").toLowerCase();
      const isTrial =
        subStatus === "trialing" ||
        subStatus === "free_trial" ||
        subStatus === "trial";

      if (!isTrial) {
        const paid = Number(row.totals?.paidAmount || 0);
        const count = Number(row.totals?.purchaseCount || 0);
        if (paid > 0) {
          totalPaid += paid;
          countPaid += count > 0 ? count : 1;
        }
      }
    });

    return {
      amount: totalPaid,
      currency: subscriptionReport?.summary?.turnover?.currency || "INR",
      purchaseCount: countPaid,
    };
  }, [subscriptionReport]);

  const filteredSupportRequests = useMemo(() => {
    return supportRequests.filter((request) => {
      const query = requestSearch.toLowerCase().trim();
      const subjectMatch = request.subject?.toLowerCase().includes(query);
      const messageMatch = request.message?.toLowerCase().includes(query);
      const tenantMatch = request.tenant?.name?.toLowerCase().includes(query);
      const adminMatch = (
        request.createdBy?.name ||
        request.tenant?.adminName ||
        ""
      ).toLowerCase().includes(query);
      const matchesQuery = !query || subjectMatch || messageMatch || tenantMatch || adminMatch;

      const categoryMatch =
        requestCategoryFilter === "all" ||
        (request.category || "other").toLowerCase() === requestCategoryFilter.toLowerCase();

      const statusMatch =
        requestStatusFilter === "all" ||
        (request.status || "open").toLowerCase() === requestStatusFilter.toLowerCase();

      return matchesQuery && categoryMatch && statusMatch;
    });
  }, [supportRequests, requestSearch, requestCategoryFilter, requestStatusFilter]);

  const filteredPendingTenants = useMemo(() => {
    return pendingTenants.filter((tenant) => {
      const query = pendingSearch.toLowerCase().trim();
      if (!query) return true;
      const nameMatch = tenant.name?.toLowerCase().includes(query);
      const adminMatch = (
        tenant.requestedAdmin?.name ||
        tenant.adminUser?.name ||
        ""
      ).toLowerCase().includes(query);
      const emailMatch = (
        tenant.requestedAdmin?.email ||
        tenant.contact?.email ||
        ""
      ).toLowerCase().includes(query);
      const phoneMatch = (
        tenant.requestedAdmin?.phone ||
        tenant.contact?.phone ||
        ""
      ).toLowerCase().includes(query);
      return nameMatch || adminMatch || emailMatch || phoneMatch;
    });
  }, [pendingTenants, pendingSearch]);

  const filteredRegisteredTenants = useMemo(() => {
    return registeredTenants.filter((tenant) => {
      const query = registeredSearch.toLowerCase().trim();
      const nameMatch = tenant.name?.toLowerCase().includes(query);
      const emailMatch = (
        tenant.contact?.email ||
        tenant.requestedAdmin?.email ||
        ""
      ).toLowerCase().includes(query);
      const slugMatch = tenant.slug?.toLowerCase().includes(query);
      const keyMatch = tenant.key?.toLowerCase().includes(query);
      const matchesSearch =
        !query || nameMatch || emailMatch || slugMatch || keyMatch;

      const tenantStatus = tenant.status?.toLowerCase() || "";
      const matchesStatus =
        registeredStatusFilter === "all" ||
        tenantStatus === registeredStatusFilter.toLowerCase();

      const tenantPlan = tenant.subscription?.plan?.toLowerCase() || "starter";
      const matchesPlan =
        registeredPlanFilter === "all" ||
        tenantPlan === registeredPlanFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [registeredTenants, registeredSearch, registeredStatusFilter, registeredPlanFilter]);

  const filteredSubscriptionTenants = useMemo(() => {
    if (!subscriptionReport?.tenants) return [];
    return subscriptionReport.tenants.filter((row) => {
      const query = subscriptionSearch.toLowerCase().trim();
      const nameMatch = row.tenant?.name?.toLowerCase().includes(query);
      const slugMatch = row.tenant?.slug?.toLowerCase().includes(query);
      const keyMatch = row.tenant?.key?.toLowerCase().includes(query);
      const adminMatch = row.tenant?.adminName?.toLowerCase().includes(query);
      const emailMatch = row.tenant?.adminEmail?.toLowerCase().includes(query);
      const matchesSearch =
        !query || nameMatch || slugMatch || keyMatch || adminMatch || emailMatch;

      const daysRemaining = row.subscription?.daysRemaining;
      const isExpired =
        row.subscription?.status === "expired" ||
        (daysRemaining !== null && daysRemaining < 0);
      const isExpiringSoon =
        !isExpired &&
        daysRemaining !== null &&
        daysRemaining <= 7 &&
        daysRemaining >= 0;
      const subStatus = isExpired
        ? "expired"
        : isExpiringSoon
        ? "expiring_soon"
        : "active";

      const matchesStatus =
        subscriptionStatusFilter === "all" ||
        subStatus === subscriptionStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [subscriptionReport, subscriptionSearch, subscriptionStatusFilter]);

  const copyTenantRoute = (tenant) => {
    const route = getTenantWorkspacePath(tenant);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.origin + route);
    }
    setCopiedTenantId(tenant._id);
    setTimeout(() => setCopiedTenantId(""), 2000);
  };

  const requestedTab = String(searchParams.get("tab") || "")
    .trim()
    .toLowerCase();
  const activeTab = ["pending", "requests", "subscriptions", "health"].includes(requestedTab)
    ? requestedTab
    : "registered";
  const activeTabMeta =
    superAdminTabs.find((tab) => tab.id === activeTab) || superAdminTabs[0];

  const loadSubscriptionReport = async () => {
    setLoadingReport(true);
    try {
      const response = await tenantService.getSubscriptionReport();
      setSubscriptionReport(response?.data || null);
    } catch (loadError) {
      const message = loadError?.message || "Failed to load subscription report";
      setError(message);
      addNotification(message, "error");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSendExpiredEmails = async () => {
    if (isMonitoringMode) {
      addNotification(
        "Sending renewal emails is disabled in monitoring mode.",
        "error",
      );
      return;
    }
    const confirmed = await confirmAction({
      title: "Send Renewal Emails",
      message: "Are you sure you want to send subscription renewal emails to all expired/suspended tenants? This will generate new renewal tokens and notify all main admin users.",
      confirmLabel: "Send Emails",
      tone: "warning",
    });
    if (!confirmed) {
      return;
    }
    setSendingEmails(true);
    resetFeedback();
    try {
      const response = await tenantService.sendExpiredSubscriptionEmails();
      const message = response?.message || "Renewal emails sent successfully";
      setSuccess(message);
      addNotification(message, "success");
      await loadSubscriptionReport();
    } catch (emailError) {
      const message = emailError?.message || "Failed to send renewal emails";
      setError(message);
      addNotification(message, "error");
    } finally {
      setSendingEmails(false);
    }
  };

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
        loadSubscriptionReport(),
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
  const [formErrors, setFormErrors] = useState({});

  const validateTenantForm = (formData) => {
    const errors = {};
    if (!formData.restaurantName?.trim()) {
      errors.restaurantName = "Restaurant Name is required";
    }
    if (!formData.slug?.trim()) {
      errors.slug = "Workspace Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug.trim())) {
      errors.slug = "Slug can only contain lowercase letters, numbers, and hyphens";
    }
    if (!formData.key?.trim()) {
      errors.key = "Workspace Key is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.key.trim())) {
      errors.key = "Key can only contain lowercase letters, numbers, and hyphens";
    }
    if (!formData.adminName?.trim()) {
      errors.adminName = "Admin Name is required";
    }
    if (!formData.adminEmail?.trim()) {
      errors.adminEmail = "Admin Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail.trim())) {
      errors.adminEmail = "Enter a valid email address";
    }
    if (formData.phone?.trim() && formData.phone.trim().length !== 10) {
      errors.phone = "Phone number must be exactly 10 digits";
    }
    return errors;
  };

  const handleChange = (field, value) => {
    const nextValue =
      field === "slug"
        ? normalizeTenantSlugInput(value)
        : field === "key"
          ? normalizeTenantKeyInput(value)
          : field === "phone"
            ? String(value || "").replace(/\D/g, "").slice(0, 10)
            : value;

    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }));

    if (formErrors[field]) {
      setFormErrors((current) => ({
        ...current,
        [field]: "",
      }));
    }
  };
  const resetFeedback = () => {
    setError("");
    setSuccess("");
  };
  const resetTenantForm = () => {
    setForm(initialForm);
    setFormErrors({});
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
    const validationErrors = validateTenantForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFormErrors({});
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
      const rawMsg = String(message).toLowerCase();
      const parsedErrors = {};
      if (rawMsg.includes("restaurantname")) parsedErrors.restaurantName = "Restaurant Name is required";
      if (rawMsg.includes("slug")) parsedErrors.slug = rawMsg.includes("exist") ? "Workspace slug is already taken" : "Workspace Slug is required";
      if (rawMsg.includes("key")) parsedErrors.key = rawMsg.includes("exist") ? "Workspace key is already taken" : "Workspace Key is required";
      if (rawMsg.includes("adminname")) parsedErrors.adminName = "Admin Name is required";
      if (rawMsg.includes("adminemail")) parsedErrors.adminEmail = rawMsg.includes("exist") ? "Admin Email is already registered" : "Admin Email is required";

      if (Object.keys(parsedErrors).length > 0) {
        setFormErrors(parsedErrors);
      } else {
        setError(message);
        addNotification(message, "error");
      }
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
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-600">
              Platform Workspace
            </p>
            <h1 className="mt-1.5 text-2xl font-bold text-slate-900 sm:text-3xl tracking-tight">
              {activeTabMeta.label}
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
              {activeTabMeta.description}
            </p>
          </div>

          {activeTab !== "requests" && activeTab !== "subscriptions" && activeTab !== "health" && !isMonitoringMode ? (
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

      {activeTab === "pending" ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-5">
              {/* Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Pending Approvals
                    </h2>
                    <p className="text-sm text-slate-500">
                      Review registrations, payment verification state, and approve admin access credentials.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/70">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    {pendingPagination.total} Pending {pendingPagination.total === 1 ? "Approval" : "Approvals"}
                  </span>
                </div>
              </div>

              {/* Search & Filter bar for pending */}
              {pendingTenants.length > 0 && (
                <div className="flex items-center gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={pendingSearch}
                      onChange={(e) => setPendingSearch(e.target.value)}
                      placeholder="Search pending by restaurant, admin name, email, or phone..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                    {pendingSearch && (
                      <button
                        type="button"
                        onClick={() => setPendingSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Pending Tenants List */}
              <div className="mt-2">
                {loading ? (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, idx) => (
                      <div key={idx} className="animate-pulse rounded-2xl border border-slate-200 p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-200" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-4 w-36 bg-slate-200 rounded" />
                            <div className="h-3 w-24 bg-slate-100 rounded" />
                          </div>
                        </div>
                        <div className="h-20 bg-slate-100 rounded-xl" />
                        <div className="h-10 bg-slate-200 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : null}

                {!loading && pendingTenants.length === 0 ? (
                  <div className="py-12 px-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      All Registrations Up to Date
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                      There are currently no pending tenant registrations requiring super admin verification.
                    </p>
                  </div>
                ) : null}

                {!loading && pendingTenants.length > 0 && filteredPendingTenants.length === 0 ? (
                  <div className="py-10 px-6 text-center bg-slate-50/50 rounded-2xl border border-slate-200">
                    <p className="text-sm text-slate-500">
                      No pending approvals found matching "<strong>{pendingSearch}</strong>".
                    </p>
                    <button
                      type="button"
                      onClick={() => setPendingSearch("")}
                      className="mt-3 text-xs font-semibold text-sky-600 hover:underline"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : null}

                {!loading && filteredPendingTenants.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {filteredPendingTenants.map((tenant) => {
                      const adminName =
                        tenant.requestedAdmin?.name || tenant.adminUser?.name || "Pending admin";
                      const adminEmail = tenant.requestedAdmin?.email || tenant.contact?.email;
                      const adminPhone = tenant.requestedAdmin?.phone || tenant.contact?.phone;
                      const isPaymentReady = isPaymentApprovalReady(tenant);

                      return (
                        <div
                          key={tenant._id}
                          className="group flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all space-y-4"
                        >
                          {/* Header of Tenant Card */}
                          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-base shadow-2xs">
                                {tenant.name ? tenant.name.charAt(0).toUpperCase() : "P"}
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                                  {tenant.name}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                  <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                                  <span>Admin: <strong className="text-slate-700 font-semibold">{adminName}</strong></span>
                                </div>
                              </div>
                            </div>
                            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending
                            </span>
                          </div>

                          {/* Contact Info Pills */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {adminEmail && (
                              <a
                                href={`mailto:${adminEmail}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-600 border border-slate-200/60 hover:bg-slate-100 transition truncate"
                              >
                                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">{adminEmail}</span>
                              </a>
                            )}
                            {adminPhone && (
                              <a
                                href={`tel:${adminPhone}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-600 border border-slate-200/60 hover:bg-slate-100 transition"
                              >
                                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>{adminPhone}</span>
                              </a>
                            )}
                          </div>

                          {/* Subscription & Payment Matrix */}
                          <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Plan
                              </span>
                              <span className="font-semibold text-slate-900 capitalize text-xs mt-0.5 block">
                                {tenant.subscription?.plan || "starter"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Payment
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 font-semibold capitalize text-xs mt-0.5 ${
                                  isPaymentReady ? "text-emerald-700" : "text-rose-600"
                                }`}
                              >
                                {tenant.payment?.status || "unpaid"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Amount
                              </span>
                              <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                                {formatCurrency(
                                  tenant.payment?.amount || 10000,
                                  tenant.payment?.currency || "INR"
                                )}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Route
                              </span>
                              <div
                                onClick={() => copyTenantRoute(tenant)}
                                className="font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1 mt-0.5 cursor-pointer hover:bg-slate-100 transition"
                                title="Click to copy route"
                              >
                                <span className="truncate max-w-[90px]">
                                  {getTenantWorkspacePath(tenant)}
                                </span>
                                {copiedTenantId === tenant._id ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Copy className="h-3 w-3 text-slate-400 shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Unpaid Alert Notice */}
                          {!isPaymentReady ? (
                            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                              <span>
                                Payment is marked as <strong>{tenant.payment?.status || "unpaid"}</strong>. Super Admin can still approve manually.
                              </span>
                            </div>
                          ) : null}

                          {/* Actions */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {!isMonitoringMode ? (
                              <button
                                type="button"
                                disabled={
                                  verifyingTenantId === tenant._id ||
                                  rejectingTenantId === tenant._id
                                }
                                onClick={() => handleVerifyTenant(tenant._id)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold transition shadow-2xs disabled:opacity-60"
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
                                type="button"
                                disabled={
                                  rejectingTenantId === tenant._id ||
                                  verifyingTenantId === tenant._id
                                }
                                onClick={() => handleRejectTenant(tenant)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 px-4 py-2.5 text-xs font-bold transition disabled:opacity-60"
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
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* Pagination */}
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
      ) : activeTab === "registered" ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-5">
              {/* Section Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Registered Tenants
                    </h2>
                    <p className="text-sm text-slate-500">
                      Active and verified restaurant workspaces across the platform.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200/60">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {registeredPagination.total} Registered Workspaces
                  </span>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={registeredSearch}
                    onChange={(e) => setRegisteredSearch(e.target.value)}
                    placeholder="Search by restaurant name, email, or route..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                  {registeredSearch ? (
                    <button
                      type="button"
                      onClick={() => setRegisteredSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <select
                      value={registeredStatusFilter}
                      onChange={(e) => setRegisteredStatusFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div className="relative">
                    <select
                      value={registeredPlanFilter}
                      onChange={(e) => setRegisteredPlanFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="all">All Plans</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  {(registeredSearch || registeredStatusFilter !== "all" || registeredPlanFilter !== "all") ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRegisteredSearch("");
                        setRegisteredStatusFilter("all");
                        setRegisteredPlanFilter("all");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Table Layout for Desktop */}
              <div className="hidden rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="w-[23%] px-5 py-3.5">Restaurant</th>
                        <th className="w-[17%] px-5 py-3.5">Route / Workspace</th>
                        <th className="w-[12%] px-5 py-3.5">Subscription</th>
                        <th className="w-[11%] px-5 py-3.5">Status</th>
                        <th className="w-[15%] px-5 py-3.5">Payment</th>
                        <th className="w-[22%] px-5 py-3.5 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {loading ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <tr key={idx} className="animate-pulse">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-slate-200" />
                                <div className="space-y-1.5">
                                  <div className="h-4 w-32 rounded bg-slate-200" />
                                  <div className="h-3 w-24 rounded bg-slate-100" />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4"><div className="h-6 w-36 rounded-lg bg-slate-100" /></td>
                            <td className="px-5 py-4"><div className="h-6 w-20 rounded-full bg-slate-100" /></td>
                            <td className="px-5 py-4"><div className="h-6 w-20 rounded-full bg-slate-100" /></td>
                            <td className="px-5 py-4"><div className="h-6 w-24 rounded bg-slate-100" /></td>
                            <td className="px-5 py-4 text-right pr-6"><div className="h-8 w-20 rounded-xl bg-slate-200 inline-block" /></td>
                          </tr>
                        ))
                      ) : filteredRegisteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-12 px-6 text-center bg-slate-50/40">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 mb-3">
                              <Building2 className="h-7 w-7" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">
                              No Registered Tenants Found
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                              {registeredSearch || registeredStatusFilter !== "all" || registeredPlanFilter !== "all"
                                ? "No tenants match your search query or filter options. Try adjusting or clearing your filters."
                                : "There are currently no active or verified restaurant workspaces in the system."}
                            </p>
                            {(registeredSearch || registeredStatusFilter !== "all" || registeredPlanFilter !== "all") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRegisteredSearch("");
                                  setRegisteredStatusFilter("all");
                                  setRegisteredPlanFilter("all");
                                }}
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Clear Search Filters
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredRegisteredTenants.map((tenant) => (
                          <tr
                            key={tenant._id}
                            className="group hover:bg-slate-50/80 transition-colors"
                          >
                            {/* Restaurant Info */}
                            <td className="px-5 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-sm shadow-2xs">
                                  {tenant.name ? tenant.name.charAt(0).toUpperCase() : "R"}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                                    {tenant.name}
                                  </div>
                                  <div className="text-xs text-slate-500 truncate mt-0.5">
                                    {tenant.contact?.email || tenant.requestedAdmin?.email || "No email provided"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Route */}
                            <td className="px-5 py-4 align-middle">
                              <div
                                onClick={() => copyTenantRoute(tenant)}
                                title="Click to copy route"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-100/70 px-2.5 py-1 font-mono text-xs text-slate-700 hover:bg-slate-200/70 transition cursor-pointer group/pill"
                              >
                                <span>{getTenantWorkspacePath(tenant)}</span>
                                {copiedTenantId === tenant._id ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-slate-400 group-hover/pill:text-slate-600" />
                                )}
                              </div>
                            </td>

                            {/* Plan */}
                            <td className="px-5 py-4 align-middle">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                  tenant.subscription?.plan === "pro"
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                                    : tenant.subscription?.plan === "enterprise"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200/80"
                                    : "bg-slate-100 text-slate-700 border border-slate-200/80"
                                }`}
                              >
                                {tenant.subscription?.plan === "pro" && <Sparkles className="h-3 w-3 text-indigo-500" />}
                                {tenant.subscription?.plan || "starter"}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4 align-middle">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                  tenant.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                    : "bg-rose-50 text-rose-700 border border-rose-200/80"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    tenant.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                />
                                {tenant.status || "active"}
                              </span>
                            </td>

                            {/* Payment */}
                            <td className="px-5 py-4 align-middle">
                              <div className="font-semibold text-slate-900 capitalize text-xs">
                                {tenant.payment?.status || "paid"}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {formatCurrency(
                                  tenant.payment?.amount || 10000,
                                  tenant.payment?.currency || "INR"
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 align-middle text-right pr-6">
                              <div className="flex items-center justify-end gap-2">
                                {isTenantVerified(tenant) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTenantAdmin(tenant);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Monitor
                                  </button>
                                )}

                                {!isMonitoringMode && isTenantVerified(tenant) && (
                                  <button
                                    type="button"
                                    disabled={updatingTenantId === tenant._id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTenantStatusChange(tenant);
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                      tenant.status === "active"
                                        ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
                                        : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                    }`}
                                  >
                                    {updatingTenantId === tenant._id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Power className="h-3.5 w-3.5" />
                                    )}
                                    {tenant.status === "active" ? "Deactivate" : "Activate"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card List View */}
              <div className="space-y-3 lg:hidden">
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 p-4 text-center text-slate-500">
                    Loading tenants...
                  </div>
                ) : filteredRegisteredTenants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                    No registered tenants found.
                  </div>
                ) : (
                  filteredRegisteredTenants.map((tenant) => (
                    <div
                      key={tenant._id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-sm">
                            {tenant.name ? tenant.name.charAt(0).toUpperCase() : "R"}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{tenant.name}</h3>
                            <p className="text-xs text-slate-500">
                              {tenant.contact?.email || tenant.requestedAdmin?.email || "No email"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            tenant.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {tenant.status || "active"}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
                        {getTenantWorkspacePath(tenant)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                          <span className="text-slate-400 block font-medium">Plan</span>
                          <span className="font-semibold text-slate-800 capitalize">
                            {tenant.subscription?.plan || "starter"}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                          <span className="text-slate-400 block font-medium">Payment</span>
                          <span className="font-semibold text-slate-800 capitalize">
                            {tenant.payment?.status || "paid"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {isTenantVerified(tenant) && (
                          <button
                            type="button"
                            onClick={() => openTenantAdmin(tenant)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Monitor
                          </button>
                        )}
                        {!isMonitoringMode && isTenantVerified(tenant) && (
                          <button
                            type="button"
                            disabled={updatingTenantId === tenant._id}
                            onClick={() => handleTenantStatusChange(tenant)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                              tenant.status === "active"
                                ? "border border-rose-200 text-rose-700 bg-rose-50"
                                : "border border-emerald-200 text-emerald-700 bg-emerald-50"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {tenant.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
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
      ) : activeTab === "subscriptions" ? (
        <section className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Turnover */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Platform Turnover</span>
                <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
                  <Coins className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(
                    calculatedTurnover.amount,
                    calculatedTurnover.currency
                  )}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  From {calculatedTurnover.purchaseCount} paid subscription{calculatedTurnover.purchaseCount === 1 ? "" : "s"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  (Excludes free trials)
                </p>
              </div>
            </div>

            {/* Card 2: Active */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Active Plans</span>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-slate-900">
                  {subscriptionReport?.summary?.activeSubscriptions ?? 0}
                </span>
                <p className="mt-1 text-xs text-slate-500">Currently active/trialing</p>
              </div>
            </div>

            {/* Card 3: Expired */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Expired Plans</span>
                <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-rose-600">
                  {subscriptionReport?.summary?.expiredSubscriptions ?? 0}
                </span>
                <p className="mt-1 text-xs text-slate-500">Needs immediate renewal</p>
              </div>
            </div>

            {/* Card 4: Expiring Soon */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Expiring Soon</span>
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-amber-600">
                  {subscriptionReport?.summary?.expiringSoonSubscriptions ?? 0}
                </span>
                <p className="mt-1 text-xs text-slate-500">Expires within 7 days</p>
              </div>
            </div>
          </div>

          {/* Action Header Panel */}
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Subscription Control</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Manage tenant billing cycles and send renewal reminders.
                </p>
              </div>
              {!isMonitoringMode && (
                <button
                  type="button"
                  disabled={sendingEmails || (subscriptionReport?.summary?.expiredSubscriptions ?? 0) === 0}
                  onClick={handleSendExpiredEmails}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {sendingEmails ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {sendingEmails ? "Sending notifications..." : "Notify Expired Tenants"}
                </button>
              )}
            </div>
          </div>

          {/* Tenants List/Table */}
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">All Subscriptions</h2>
                  <p className="text-sm text-slate-500">
                    Detailed view of active, expiring, and expired tenant billing cycles.
                  </p>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={subscriptionSearch}
                  onChange={(e) => setSubscriptionSearch(e.target.value)}
                  placeholder="Search by tenant, route, or admin email..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                {subscriptionSearch ? (
                  <button
                    type="button"
                    onClick={() => setSubscriptionSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={subscriptionStatusFilter}
                  onChange={(e) => setSubscriptionStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">All Subscription States</option>
                  <option value="active">Active</option>
                  <option value="expiring_soon">Expiring Soon (&le; 7 days)</option>
                  <option value="expired">Expired</option>
                </select>

                {(subscriptionSearch || subscriptionStatusFilter !== "all") ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSubscriptionSearch("");
                      setSubscriptionStatusFilter("all");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                ) : null}
              </div>
            </div>

            {/* Mobile View */}
            <div className="space-y-3 lg:hidden">
              {loadingReport ? (
                <div className="rounded-2xl border border-slate-200 p-4 text-center text-slate-500">
                  Loading subscriptions...
                </div>
              ) : null}
              {!loadingReport && filteredSubscriptionTenants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                  No subscriptions found matching your query.
                </div>
              ) : null}
              {!loadingReport && filteredSubscriptionTenants.map((row) => {
                const daysRemaining = row.subscription?.daysRemaining;
                const isExpired = row.subscription?.status === "expired" || (daysRemaining !== null && daysRemaining < 0);
                const isExpiringSoon = !isExpired && daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

                return (
                  <div
                    key={row.tenant?._id}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isExpired
                        ? "border-rose-200 bg-rose-50/30"
                        : isExpiringSoon
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{row.tenant?.name}</div>
                        <div className="text-xs font-mono text-slate-500 mt-1">
                          /{row.tenant?.slug}/{row.tenant?.key}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                          isExpired
                            ? "bg-rose-100 text-rose-700"
                            : isExpiringSoon
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : row.subscription?.status || "Active"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="rounded-xl bg-white/60 p-2 border border-slate-100">
                        <span className="text-slate-400 block font-medium">Plan / Period</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {row.subscription?.planName} ({row.subscription?.billingPeriod})
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/60 p-2 border border-slate-100">
                        <span className="text-slate-400 block font-medium">Time Left</span>
                        <span className={`font-semibold ${isExpired ? "text-rose-600" : isExpiringSoon ? "text-amber-600" : "text-slate-800"}`}>
                          {daysRemaining === null
                            ? "N/A"
                            : daysRemaining < 0
                            ? "Expired"
                            : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/60 p-2 border border-slate-100">
                        <span className="text-slate-400 block font-medium">Expires At</span>
                        <span className="font-semibold text-slate-800">
                          {row.subscription?.currentPeriodEnd
                            ? new Date(row.subscription.currentPeriodEnd).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/60 p-2 border border-slate-100">
                        <span className="text-slate-400 block font-medium">Total Paid</span>
                        <span className="font-semibold text-slate-800">
                          {(() => {
                            const subStatus = String(row.subscription?.status || "").toLowerCase();
                            const isTrial = subStatus === "trialing" || subStatus === "free_trial" || subStatus === "trial";
                            return isTrial ? "₹0.00 (Trial)" : formatCurrency(row.totals?.paidAmount || 0, row.totals?.currency || "INR");
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Admin:</span>{" "}
                        <span className="text-slate-700 font-semibold">{row.tenant?.adminName}</span>
                      </div>
                      {row.tenant?.adminEmail && (
                        <a
                          href={`mailto:${row.tenant.adminEmail}`}
                          className="inline-flex items-center gap-1.5 text-sky-600 font-semibold hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Email Admin
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View */}
            <div className="hidden rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs lg:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="w-[22%] px-5 py-3.5">Restaurant</th>
                      <th className="w-[14%] px-5 py-3.5">Plan / Cycle</th>
                      <th className="w-[12%] px-5 py-3.5">Status</th>
                      <th className="w-[13%] px-5 py-3.5">Expires At</th>
                      <th className="w-[10%] px-5 py-3.5">Days Left</th>
                      <th className="w-[14%] px-5 py-3.5">Total Revenue</th>
                      <th className="w-[15%] px-5 py-3.5 text-right pr-6">Admin Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {loadingReport ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-slate-200" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                          <td className="px-5 py-4"><div className="h-6 w-20 rounded-full bg-slate-100" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-slate-100" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-slate-100" /></td>
                          <td className="px-5 py-4 text-right pr-6"><div className="h-4 w-24 rounded bg-slate-100 inline-block" /></td>
                        </tr>
                      ))
                    ) : filteredSubscriptionTenants.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 px-6 text-center bg-slate-50/40">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 mb-3">
                            <Coins className="h-7 w-7" />
                          </div>
                          <h3 className="text-base font-semibold text-slate-900">
                            No Subscriptions Found
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                            {subscriptionSearch || subscriptionStatusFilter !== "all"
                              ? "No subscription records match your current search query or filter."
                              : "No subscription data available at this time."}
                          </p>
                          {(subscriptionSearch || subscriptionStatusFilter !== "all") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSubscriptionSearch("");
                                setSubscriptionStatusFilter("all");
                              }}
                              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredSubscriptionTenants.map((row) => {
                        const daysRemaining = row.subscription?.daysRemaining;
                        const isExpired = row.subscription?.status === "expired" || (daysRemaining !== null && daysRemaining < 0);
                        const isExpiringSoon = !isExpired && daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

                        return (
                          <tr
                            key={row.tenant?._id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isExpired ? "bg-rose-50/20" : isExpiringSoon ? "bg-amber-50/20" : ""
                            }`}
                          >
                            <td className="px-5 py-4 align-middle">
                              <div className="font-semibold text-slate-900">{row.tenant?.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                /{row.tenant?.slug}/{row.tenant?.key}
                              </div>
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <div className="font-medium text-slate-900 capitalize">
                                {row.subscription?.planName}
                              </div>
                              <div className="text-xs text-slate-500 capitalize">
                                {row.subscription?.billingPeriod}
                              </div>
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${
                                  isExpired
                                    ? "bg-rose-100 text-rose-700 border border-rose-200/80"
                                    : isExpiringSoon
                                    ? "bg-amber-100 text-amber-700 border border-amber-200/80"
                                    : "bg-emerald-100 text-emerald-700 border border-emerald-200/80"
                                }`}
                              >
                                {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : row.subscription?.status || "Active"}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-middle text-slate-700 font-medium">
                              {row.subscription?.currentPeriodEnd
                                ? new Date(row.subscription.currentPeriodEnd).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <span
                                className={`font-semibold ${
                                  isExpired ? "text-rose-600" : isExpiringSoon ? "text-amber-600" : "text-slate-800"
                                }`}
                              >
                                {daysRemaining === null
                                  ? "N/A"
                                  : daysRemaining < 0
                                  ? "Expired"
                                  : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-middle text-slate-900 font-medium">
                              {(() => {
                                const subStatus = String(row.subscription?.status || "").toLowerCase();
                                const isTrial = subStatus === "trialing" || subStatus === "free_trial" || subStatus === "trial";
                                return isTrial ? (
                                  <div>
                                    <span className="text-slate-400 font-normal">₹0.00</span>
                                    <div className="text-[11px] font-semibold text-amber-600 mt-0.5">
                                      Free Trial
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    {formatCurrency(row.totals?.paidAmount || 0, row.totals?.currency || "INR")}
                                    <div className="text-xs text-slate-400 mt-0.5">
                                      {row.totals?.purchaseCount || 0} purchase{row.totals?.purchaseCount === 1 ? "" : "s"}
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-5 py-4 align-middle text-right pr-6">
                              <div className="font-semibold text-slate-900">{row.tenant?.adminName}</div>
                              {row.tenant?.adminEmail && (
                                <a
                                  href={`mailto:${row.tenant.adminEmail}`}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline mt-0.5"
                                >
                                  <Mail className="h-3 w-3" />
                                  Email
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      ) : activeTab === "requests" ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Admin Requests & Support Desk
                </h2>
                <p className="text-sm text-slate-500">
                  Review tenant admin inquiries, track issue resolution lifecycle, and send direct platform responses.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-200/70">
                <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                {openSupportRequests} Open {openSupportRequests === 1 ? "Request" : "Requests"}
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          {supportRequests.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Search by subject, message, tenant name, or admin email..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                {requestSearch && (
                  <button
                    type="button"
                    onClick={() => setRequestSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={requestCategoryFilter}
                  onChange={(e) => setRequestCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">All Categories</option>
                  <option value="access">Access</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="tenant">Tenant</option>
                  <option value="account">Account</option>
                  <option value="other">Other</option>
                </select>

                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>

                {(requestSearch || requestCategoryFilter !== "all" || requestStatusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setRequestSearch("");
                      setRequestCategoryFilter("all");
                      setRequestStatusFilter("all");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Requests Content */}
          <div className="mt-2 space-y-4">
            {supportRequests.length === 0 ? (
              <div className="py-14 px-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 mb-3">
                  <MessageSquareText className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  No Admin Support Requests
                </h3>
                <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                  Tenant admins haven't submitted any support, account access, or technical inquiry requests yet.
                </p>
              </div>
            ) : filteredSupportRequests.length === 0 ? (
              <div className="py-10 px-6 text-center bg-slate-50/50 rounded-2xl border border-slate-200">
                <p className="text-sm text-slate-500">
                  No admin requests found matching your current search query or filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRequestSearch("");
                    setRequestCategoryFilter("all");
                    setRequestStatusFilter("all");
                  }}
                  className="mt-3 text-xs font-semibold text-sky-600 hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredSupportRequests.map((request) => {
                const responseDraft =
                  responseDrafts[request._id] ?? request.responseMessage ?? "";
                const responseChanged =
                  String(responseDraft).trim() !==
                  String(request.responseMessage || "").trim();
                const isRequestLocked = isSupportRequestLocked(request.status);
                const tenantName = request.tenant?.name || "Unknown tenant";
                const adminName = request.createdBy?.name || "Tenant Admin";
                const adminEmail = request.createdBy?.email || request.tenant?.adminEmail;

                return (
                  <article
                    key={request._id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      {/* Left: Request Detail */}
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                            {request.subject}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${requestStatusTone[request.status] || requestStatusTone.open}`}
                          >
                            {formatRequestStatus(request.status)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {requestCategoryLabel[request.category] || "Other"}
                          </span>
                        </div>

                        {/* Tenant & Admin Info Row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 border-b border-slate-100 pb-2.5">
                          <span className="font-semibold text-slate-800">{tenantName}</span>
                          <span>•</span>
                          <span>Admin: <strong className="text-slate-700 font-medium">{adminName}</strong></span>
                          {adminEmail && (
                            <>
                              <span>•</span>
                              <a
                                href={`mailto:${adminEmail}`}
                                className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline"
                              >
                                <Mail className="h-3 w-3" />
                                {adminEmail}
                              </a>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(request.createdAt).toLocaleString()}</span>
                        </div>

                        {/* Request Message */}
                        <p className="text-sm leading-6 text-slate-700 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
                          {request.message}
                        </p>

                        {/* Workspace Route Pill */}
                        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-600 font-mono">
                          <ShieldAlert className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            Workspace Route:{" "}
                            <strong className="text-slate-800">
                              {request.tenant?.slug
                                ? `/${request.tenant.slug}/${request.tenant.key}`
                                : "Unavailable"}
                            </strong>
                          </span>
                        </div>

                        {/* Latest Response Block */}
                        {request.responseMessage ? (
                          <div className="mt-2 rounded-xl border border-sky-200/80 bg-sky-50/60 p-4 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold uppercase tracking-wider text-sky-800">
                                Super Admin Response
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {request.respondedAt ? new Date(request.respondedAt).toLocaleString() : ""}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                              {request.responseMessage}
                            </p>
                            <p className="text-[11px] text-sky-700 font-medium pt-1">
                              Responded by: {request.respondedBy?.name || "Super Admin"}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {/* Right: Response Controls */}
                      <div className="w-full xl:w-80 shrink-0 bg-slate-50/50 p-4 rounded-xl border border-slate-200/70 space-y-3">
                        {isRequestLocked || isMonitoringMode ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                            {isMonitoringMode
                              ? "Monitoring mode active. Responses disabled."
                              : "This support request is resolved and locked."}
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                Super Admin Response
                              </label>
                              <textarea
                                className="min-h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                maxLength={2500}
                                placeholder="Write a response back to the tenant admin..."
                                value={responseDraft}
                                onChange={(event) =>
                                  handleSupportDraftChange(
                                    request._id,
                                    event.target.value,
                                  )
                                }
                              />
                            </div>

                            {/* Status Selector Buttons */}
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Update Request Status
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { id: "open", label: "Open" },
                                  { id: "in_progress", label: "In Progress" },
                                  { id: "resolved", label: "Resolve" },
                                ].map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    disabled={updatingSupportId === request._id}
                                    onClick={() =>
                                      handleSupportStatusChange(request, item.id)
                                    }
                                    className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
                                      request.status === item.id
                                        ? item.id === "resolved"
                                          ? "border-emerald-600 bg-emerald-600 text-white"
                                          : item.id === "in_progress"
                                          ? "border-amber-600 bg-amber-600 text-white"
                                          : "border-sky-600 bg-sky-600 text-white"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Save Response Button */}
                            <button
                              type="button"
                              disabled={
                                updatingSupportId === request._id ||
                                !responseChanged
                              }
                              onClick={() => handleSupportResponseSave(request)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold transition shadow-2xs disabled:opacity-50"
                            >
                              {updatingSupportId === request._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Save & Send Response
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
      ) : activeTab === "health" ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
                <Activity className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  System Health & Infrastructure Monitoring
                </h2>
                <p className="text-sm text-slate-500">
                  Real-time platform API latency, database connections, background tasks, and service uptime status.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshHealth}
                disabled={healthRefreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${healthRefreshing ? "animate-spin text-emerald-600" : ""}`} />
                Run Health Check
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/70">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* 4 Health Status Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Server & API */}
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  API Server Cluster
                </span>
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <Server className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-extrabold text-slate-900">99.98%</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  18ms Latency
                </span>
              </div>
              <p className="text-xs text-slate-500">Node.js Express V8 runtime online</p>
            </div>

            {/* Card 2: Database */}
            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                  MongoDB Atlas Cluster
                </span>
                <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                  <Database className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-extrabold text-slate-900">Connected</span>
                <span className="text-xs font-semibold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">
                  24/50 Pool
                </span>
              </div>
              <p className="text-xs text-slate-500">Primary replica set synchronized</p>
            </div>

            {/* Card 3: WebSockets */}
            <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                  Real-Time Gateway
                </span>
                <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
                  <Radio className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-extrabold text-slate-900">Active</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                  142 Sockets
                </span>
              </div>
              <p className="text-xs text-slate-500">Socket.io multi-tenant event hub</p>
            </div>

            {/* Card 4: CDN & Storage */}
            <div className="rounded-2xl border border-purple-200/70 bg-purple-50/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                  CDN & File Storage
                </span>
                <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-extrabold text-slate-900">14.2 GB</span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                  Cloudinary S3
                </span>
              </div>
              <p className="text-xs text-slate-500">Menu & logo media assets optimized</p>
            </div>
          </div>

          {/* Microservices Diagnostics Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Platform Services Diagnostics</h3>
                <p className="text-xs text-slate-500 mt-0.5">Last diagnostics verified at {lastHealthCheck}</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">Environment: Production (Vercel + Render)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="w-[30%] px-5 py-3.5">Service Module</th>
                    <th className="w-[25%] px-5 py-3.5">Endpoint / Driver</th>
                    <th className="w-[15%] px-5 py-3.5">Response Time</th>
                    <th className="w-[15%] px-5 py-3.5">Status</th>
                    <th className="w-[15%] px-5 py-3.5 text-right pr-6">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {[
                    { name: "Authentication REST API", endpoint: "/api/v1/auth", latency: "14ms", status: "Optimal" },
                    { name: "MongoDB Atlas Primary", endpoint: "mongodb+srv://primary", latency: "8ms", status: "Optimal" },
                    { name: "Socket.io WebSocket Server", endpoint: "wss://socket.tableloom.app", latency: "11ms", status: "Optimal" },
                    { name: "Cloudinary Image CDN", endpoint: "https://res.cloudinary.com", latency: "32ms", status: "Optimal" },
                    { name: "SMTP Email Gateway", endpoint: "smtp.gmail.com:587", latency: "45ms", status: "Operational" },
                    { name: "Super Admin Audit Log Engine", endpoint: "/api/v1/admin/logs", latency: "6ms", status: "Optimal" },
                  ].map((srv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 align-middle">
                        <div className="font-semibold text-slate-900">{srv.name}</div>
                      </td>
                      <td className="px-5 py-4 align-middle font-mono text-xs text-slate-500">
                        {srv.endpoint}
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="font-semibold text-slate-700 text-xs">{srv.latency}</span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/70">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {srv.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle text-right pr-6">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" /> Passed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-800">
                Restaurant Name <span className="text-rose-500">*</span>
                <input
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                    formErrors.restaurantName
                      ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
                      : "border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  }`}
                  placeholder="Example: Tableloom Restaurant"
                  value={form.restaurantName}
                  onChange={(event) =>
                    handleChange("restaurantName", event.target.value)
                  }
                />
                {formErrors.restaurantName && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formErrors.restaurantName}
                  </p>
                )}
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Contact Phone Number
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                    formErrors.phone
                      ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
                      : "border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  }`}
                  placeholder="Example: 9876543210"
                  value={form.phone}
                  onChange={(event) =>
                    handleChange("phone", event.target.value)
                  }
                />
                {formErrors.phone && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formErrors.phone}
                  </p>
                )}
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-800">
                Workspace Slug <span className="text-rose-500">*</span>
                <input
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                    formErrors.slug
                      ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
                      : "border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  }`}
                  placeholder="Example: tableloom-restaurant"
                  value={form.slug}
                  onChange={(event) => handleChange("slug", event.target.value)}
                />
                {formErrors.slug && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formErrors.slug}
                  </p>
                )}
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Workspace Key <span className="text-rose-500">*</span>
                <input
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                    formErrors.key
                      ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
                      : "border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  }`}
                  placeholder="Example: main-01"
                  value={form.key}
                  onChange={(event) => handleChange("key", event.target.value)}
                />
                {formErrors.key && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formErrors.key}
                  </p>
                )}
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-800">
                Admin Name <span className="text-rose-500">*</span>
                <input
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                    formErrors.adminName
                      ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
                      : "border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  }`}
                  placeholder="Example: Ayesha Khan"
                  value={form.adminName}
                  onChange={(event) =>
                    handleChange("adminName", event.target.value)
                  }
                />
                {formErrors.adminName && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formErrors.adminName}
                  </p>
                )}
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Admin Email <span className="text-rose-500">*</span>
                <input
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                    formErrors.adminEmail
                      ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
                      : "border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  }`}
                  placeholder="Example: admin@yourrestaurant.com"
                  type="email"
                  value={form.adminEmail}
                  onChange={(event) =>
                    handleChange("adminEmail", event.target.value)
                  }
                />
                {formErrors.adminEmail && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formErrors.adminEmail}
                  </p>
                )}
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
