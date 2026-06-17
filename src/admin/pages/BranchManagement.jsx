import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Edit3,
  GitBranch,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";
import { useBranch } from "../context/BranchContext";
import { useAdmin } from "../context/AdminContext";
import branchService from "../../common/services/branchService";
import { logger } from "../../common/utils/logger";

/* ─────────────── helpers ─────────────── */

const statusBadge = (status = "") => {
  const map = {
    active: {
      label: "Active",
      cls: "bg-green-100 text-green-700",
      Icon: CheckCircle,
    },
    inactive: {
      label: "Inactive",
      cls: "bg-gray-100 text-gray-600",
      Icon: XCircle,
    },
    suspended: {
      label: "Suspended",
      cls: "bg-red-100 text-red-700",
      Icon: AlertTriangle,
    },
    archived: {
      label: "Archived",
      cls: "bg-yellow-100 text-yellow-700",
      Icon: AlertTriangle,
    },
  };
  return map[status] || map.inactive;
};

const EMPTY_FORM = {
  name: "",
  slug: "",
  timezone: "",
  currency: "INR",
  phone: "",
  email: "",
  address: { line1: "", city: "", state: "", postalCode: "", country: "" },
  status: "active",
};

const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/* ─────────────── Branch Form Modal ─────────────── */

function BranchFormModal({ branch, onClose, onSaved }) {
  const isEdit = Boolean(branch?._id);
  const [form, setForm] = useState(
    isEdit
      ? {
          name: branch.name || "",
          slug: branch.slug || "",
          timezone: branch.timezone || "",
          currency: branch.currency || "INR",
          phone: branch.phone || "",
          email: branch.email || "",
          address: branch.address || EMPTY_FORM.address,
          status: branch.status || "active",
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setAddr = (field, value) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Branch name is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      setSaving(true);
      if (isEdit) {
        await branchService.updateBranch(branch._id, form);
      } else {
        await branchService.createBranch(form);
      }
      onSaved();
    } catch (err) {
      logger.error("[BranchManagement] save error:", err);
      setErrors({
        _global:
          err?.response?.data?.message ||
          (isEdit ? "Failed to update branch" : "Failed to create branch"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <GitBranch className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit Branch" : "Create New Branch"}
            </h2>
            <p className="text-sm text-gray-500">
              {isEdit
                ? "Update branch details"
                : "Add a new sub-branch to your restaurant"}
            </p>
          </div>
        </div>

        {/* Body */}
        <form id="branch-form" onSubmit={handleSubmit}>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
            {errors._global && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {errors._global}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!isEdit)
                    set("slug", slugify(e.target.value));
                }}
                placeholder="e.g. Koramangala"
                className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 ${
                  errors.name ? "border-red-400" : "border-gray-200"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder="e.g. koramangala"
                className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 ${
                  errors.slug ? "border-red-400" : "border-gray-200"
                }`}
              />
              {errors.slug && (
                <p className="mt-1 text-xs text-red-500">{errors.slug}</p>
              )}
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 99999 00000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="branch@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </div>

            {/* Currency + Timezone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <input
                  type="text"
                  value={form.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                  placeholder="Asia/Kolkata"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Address
              </p>
              <input
                type="text"
                value={form.address.line1}
                onChange={(e) => setAddr("line1", e.target.value)}
                placeholder="Street address"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.address.city}
                  onChange={(e) => setAddr("city", e.target.value)}
                  placeholder="City"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none"
                />
                <input
                  type="text"
                  value={form.address.state}
                  onChange={(e) => setAddr("state", e.target.value)}
                  placeholder="State"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.address.postalCode}
                  onChange={(e) => setAddr("postalCode", e.target.value)}
                  placeholder="Postal code"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none"
                />
                <input
                  type="text"
                  value={form.address.country}
                  onChange={(e) => setAddr("country", e.target.value)}
                  placeholder="Country"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Status — only for edit */}
            {isEdit && branch.type !== "main" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-100 p-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="branch-form"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── Branch Card ─────────────── */

function BranchCard({ branch, onEdit, onStatusChange }) {
  const { label, cls, Icon } = statusBadge(branch.status);
  const isMain = branch.type === "main";
  const addr = branch.address || {};
  const addrLine = [addr.city, addr.state].filter(Boolean).join(", ");

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Top row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
              isMain ? "bg-primary-50" : "bg-amber-50"
            }`}
          >
            {isMain ? (
              <Building2 className="h-5 w-5 text-primary-600" />
            ) : (
              <GitBranch className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{branch.name}</h3>
              {isMain && (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                  Main
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">/{branch.slug}</p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
      </div>

      {/* Details */}
      <div className="mb-4 space-y-1.5">
        {addrLine && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
            {addrLine}
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
            {branch.phone}
          </div>
        )}
        {branch.currency && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Globe className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
            {branch.currency}
            {branch.timezone ? ` · ${branch.timezone}` : ""}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(branch)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        {!isMain && (
          <button
            onClick={() => onStatusChange(branch)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition ${
              branch.status === "active"
                ? "border-red-100 text-red-600 hover:bg-red-50"
                : "border-green-100 text-green-700 hover:bg-green-50"
            }`}
          >
            {branch.status === "active" ? (
              <>
                <XCircle className="h-3.5 w-3.5" /> Deactivate
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5" /> Activate
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */

export function BranchManagement() {
  const { addNotification } = useAdmin();
  const {
    branches,
    branchSummary,
    canCreateBranch,
    branchLimit,
    isLoading,
    reload,
  } = useBranch();

  const [modalBranch, setModalBranch] = useState(null); // null = closed, {} = new, branch obj = edit
  const [modalOpen, setModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const openCreate = () => {
    setModalBranch(null);
    setModalOpen(true);
  };

  const openEdit = (branch) => {
    setModalBranch(branch);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalBranch(null);
  };

  const handleSaved = useCallback(async () => {
    closeModal();
    await reload({ silent: true });
    addNotification("Branch saved successfully.", "success");
  }, [reload, addNotification]);

  const handleStatusChange = async (branch) => {
    const nextStatus = branch.status === "active" ? "inactive" : "active";
    try {
      setStatusSaving(true);
      await branchService.updateBranchStatus(branch._id, nextStatus);
      await reload({ silent: true });
      addNotification(`Branch ${nextStatus === "active" ? "activated" : "deactivated"}.`, "success");
    } catch (err) {
      logger.error("[BranchManagement] status change error:", err);
      addNotification(
        err?.response?.data?.message || "Failed to update branch status.",
        "error",
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const current = branchSummary?.currentBranchCount ?? branches.length;
  const limit = branchLimit ?? "∞";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-gray-500">
            Manage your restaurant locations.{" "}
            <span className="font-medium">
              {current} / {limit}
            </span>{" "}
            branches used.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => reload()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {canCreateBranch && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Branch
            </button>
          )}
        </div>
      </div>

      {/* Subscription info banner */}
      {branchSummary && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          <Shield className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-medium">
              {branchSummary.plan?.name || "Current"} plan
            </span>{" "}
            · {branchSummary.subscriptionState} ·{" "}
            {branchLimit === null
              ? "Unlimited branches"
              : `Up to ${branchLimit} branch${branchLimit === 1 ? "" : "es"}`}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
        </div>
      )}

      {/* Branch grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch._id}
              branch={branch}
              onEdit={openEdit}
              onStatusChange={handleStatusChange}
            />
          ))}

          {/* Empty state */}
          {branches.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <GitBranch className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-medium text-gray-700">No branches yet</p>
                <p className="text-sm text-gray-400">
                  Your main branch will be created automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <BranchFormModal
          branch={modalBranch}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

export default BranchManagement;
