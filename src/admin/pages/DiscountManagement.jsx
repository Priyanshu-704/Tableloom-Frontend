import { logger } from "../../common/utils/logger.js";
import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  Percent,
  Plus,
  RefreshCw,
  Tag,
  Calendar,
  DollarSign,
  Power,
  Edit3,
  Trash2,
  Ticket,
  Sparkles,
} from "lucide-react";
import { menuService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import PermissionGuard from "../components/common/PermissionGuard";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { useAuth } from "../../common/context/AuthContext";

const initialForm = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

export function DiscountManagement() {
  const isMonitoringMode = useMonitoringMode();
  const { addNotification, confirmAction } = useAdmin();
  const { hasPermission } = useAuth();

  const canCreateDiscount =
    !isMonitoringMode && hasPermission("menu.discount_create");
  const canEditDiscount =
    !isMonitoringMode && hasPermission("menu.discount_edit");
  const canToggleDiscountStatus =
    !isMonitoringMode && hasPermission("menu.discount_toggle_status");

  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const response = await menuService.getCoupons("all");
      setCoupons(response?.data || []);
    } catch (error) {
      logger.error("Failed to load coupons:", error);
      addNotification(
        error.response?.data?.message || "Failed to load coupons.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => {
    setEditingId("");
    setForm(initialForm);
    setShowCouponModal(false);
  };

  const openCreateModal = () => {
    if (!canCreateDiscount) {
      addNotification(
        "Discount management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    setEditingId("");
    setForm(initialForm);
    setShowCouponModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!(canCreateDiscount || canEditDiscount)) {
      addNotification(
        "Discount management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value || 0),
      minOrderAmount: Number(form.minOrderAmount || 0),
      maxDiscountAmount:
        form.maxDiscountAmount === "" ? null : Number(form.maxDiscountAmount),
    };
    try {
      if (editingId) {
        await menuService.updateCoupon(editingId, payload);
      } else {
        await menuService.createCoupon(payload);
      }
      addNotification(
        editingId
          ? "Coupon updated successfully."
          : "Coupon created successfully.",
        "success",
      );
      resetForm();
      await loadCoupons();
    } catch (error) {
      logger.error("Failed to save coupon:", error);
      addNotification(
        error.response?.data?.message || "Failed to save coupon.",
        "error",
      );
    }
  };

  const handleToggleCouponStatus = async (coupon) => {
    if (!canToggleDiscountStatus) {
      addNotification(
        "Discount management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    const isActivating = !coupon.isActive;
    const confirmed = await confirmAction({
      title: `${isActivating ? "Activate" : "Deactivate"} Coupon Code`,
      message: `Are you sure you want to ${isActivating ? "activate" : "deactivate"} coupon code "${coupon.code}"?`,
      confirmLabel: isActivating ? "Activate" : "Deactivate",
      tone: isActivating ? "warning" : "warning",
    });
    if (!confirmed) {
      return;
    }

    try {
      await menuService.toggleCouponStatus(coupon._id);
      await loadCoupons();
      addNotification(
        isActivating
          ? `Coupon ${coupon.code} activated successfully.`
          : `Coupon ${coupon.code} deactivated successfully.`,
        "success",
      );
    } catch (error) {
      logger.error("Failed to update coupon status:", error);
      addNotification(
        error.response?.data?.message || "Failed to update coupon status.",
        "error",
      );
    }
  };

  const handleDeleteCoupon = async (coupon) => {
    if (!canEditDiscount) {
      addNotification(
        "Discount management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete Coupon Code",
      message: `Are you sure you want to delete coupon code "${coupon.code}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      await menuService.deleteCoupon(coupon._id);
      await loadCoupons();
      addNotification(`Coupon ${coupon.code} deleted successfully.`, "success");
    } catch (error) {
      logger.error("Failed to delete coupon:", error);
      addNotification(
        error.response?.data?.message || "Failed to delete coupon.",
        "error",
      );
    }
  };

  const startEdit = (coupon) => {
    if (!canEditDiscount) {
      addNotification(
        "Discount management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    setEditingId(coupon._id);
    setForm({
      code: coupon.code || "",
      description: coupon.description || "",
      type: coupon.type || "percentage",
      value: coupon.value ?? "",
      minOrderAmount: coupon.minOrderAmount ?? "",
      maxDiscountAmount: coupon.maxDiscountAmount ?? "",
      startDate: coupon.startDate
        ? new Date(coupon.startDate).toISOString().slice(0, 10)
        : "",
      endDate: coupon.endDate
        ? new Date(coupon.endDate).toISOString().slice(0, 10)
        : "",
      isActive: coupon.isActive ?? true,
    });
    setShowCouponModal(true);
  };

  const couponModalFooter = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={resetForm}
        className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="coupon-form"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
      >
        <Plus className="h-4 w-4" />
        {editingId ? "Update Coupon" : "Create Coupon"}
      </button>
    </div>
  );

  const activeCount = coupons.filter((c) => c.isActive).length;
  const percentageCount = coupons.filter((c) => c.type === "percentage").length;
  const fixedCount = coupons.filter((c) => c.type === "fixed").length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Discount Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage coupon codes and item-level promotional discount campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCoupons}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <PermissionGuard permission="menu.discount_create" disableInMonitoring>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              Create Coupon
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Coupons</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{coupons.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{activeCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Percentage (%)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-indigo-600">{percentageCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fixed Amount</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple-600">{fixedCount}</p>
        </div>
      </div>

      {/* Main Coupons List Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Coupons & Promo Codes</h2>
              <p className="text-xs text-slate-500">
                Customer apps and checkout systems will automatically validate these codes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((coupon) => (
            <div
              key={coupon._id}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 hover:border-slate-300 hover:shadow-xs transition-all duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 font-mono text-sm font-extrabold tracking-wider text-sky-800 shadow-2xs">
                      <Tag className="h-3.5 w-3.5 text-sky-600" />
                      {coupon.code}
                    </span>

                    <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                      {coupon.type === "percentage" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center justify-center w-20 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider text-center shrink-0 ${
                      coupon.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                        : "bg-slate-100 text-slate-600 border border-slate-200/80"
                    }`}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-700">
                  {coupon.description || "No description provided."}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <span className="text-slate-400 font-medium">Min Order:</span> ₹{coupon.minOrderAmount || 0}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <span className="text-slate-400 font-medium">Max Cap:</span>{" "}
                    {coupon.maxDiscountAmount ? `₹${coupon.maxDiscountAmount}` : "No Limit"}
                  </span>
                </div>

                <details className="group/details rounded-xl border border-slate-200/80 bg-slate-50/70">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition">
                    <span>View Extended Rules & Metrics</span>
                    <ChevronDown className="h-4 w-4 text-slate-400 transition group-open/details:rotate-180" />
                  </summary>
                  <div className="grid gap-2 border-t border-slate-200/70 px-3 py-3 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <span className="text-slate-400 font-medium">Usage Limit:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {coupon.usageLimit ? `${coupon.usageCount || 0} / ${coupon.usageLimit}` : "Unlimited"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Start Date:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString() : "Immediately"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Expiry Date:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : "No expiry date"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Created At:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {coupon.createdAt ? new Date(coupon.createdAt).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>
                </details>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                {(canEditDiscount || canToggleDiscountStatus) ? (
                  <>
                    <PermissionGuard permission="menu.discount_edit" disableInMonitoring>
                      <button
                        type="button"
                        onClick={() => startEdit(coupon)}
                        title="Edit Coupon"
                        aria-label="Edit Coupon"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </PermissionGuard>

                    <PermissionGuard permission="menu.discount_toggle_status" disableInMonitoring>
                      <button
                        type="button"
                        onClick={() => handleToggleCouponStatus(coupon)}
                        title={coupon.isActive ? "Deactivate Coupon" : "Activate Coupon"}
                        aria-label={coupon.isActive ? "Deactivate Coupon" : "Activate Coupon"}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition shadow-2xs ${
                          coupon.isActive
                            ? "border border-amber-200 bg-white text-amber-600 hover:bg-amber-50"
                            : "border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </PermissionGuard>

                    <PermissionGuard permission="menu.discount_edit" disableInMonitoring>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coupon)}
                        title="Delete Coupon"
                        aria-label="Delete Coupon"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition shadow-2xs"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </PermissionGuard>
                  </>
                ) : null}
              </div>
            </div>
          ))}

          {!loading && coupons.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
              No promotional coupons created yet. Click "Create Coupon" to add a new discount campaign.
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(canCreateDiscount || canEditDiscount) ? (
        <AdminModal
          isOpen={showCouponModal}
          title={editingId ? "Edit Coupon" : "Create Coupon"}
          subtitle="Configure coupon code rules, discount type, value, minimum order, and active period."
          onClose={resetForm}
          maxWidth="max-w-2xl"
          footer={couponModalFooter}
        >
          <form
            id="coupon-form"
            onSubmit={handleSubmit}
            className="space-y-4 p-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Coupon Code <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. SUMMER20"
                  className="w-full font-mono text-sm uppercase rounded-xl border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discount Type <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-hidden"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discount Value <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  placeholder={form.type === "percentage" ? "e.g. 20 (for 20%)" : "e.g. 100 (for ₹100)"}
                  className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Order Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrderAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minOrderAmount: event.target.value,
                    }))
                  }
                  placeholder="e.g. 500"
                  className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Discount Cap (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maxDiscountAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxDiscountAmount: event.target.value,
                    }))
                  }
                  placeholder="Leave empty for no limit"
                  className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <span>Active Campaign</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coupon Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe terms, eligibility, or campaign notes..."
                className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </form>
        </AdminModal>
      ) : null}
    </div>
  );
}
