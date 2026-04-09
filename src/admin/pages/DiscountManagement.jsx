import { logger } from "../../common/utils/logger.js";
import React, { useEffect, useState } from "react";
import { ChevronDown, Percent, Plus, RefreshCw } from "lucide-react";
import { menuService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
const initialForm = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  startDate: "",
  endDate: "",
  isActive: true
};
export function DiscountManagement() {
  const {
    addNotification
  } = useAdmin();
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
      addNotification(error.response?.data?.message || "Failed to load coupons.", "error");
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
    setEditingId("");
    setForm(initialForm);
    setShowCouponModal(true);
  };
  const handleSubmit = async event => {
    event.preventDefault();
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value || 0),
      minOrderAmount: Number(form.minOrderAmount || 0),
      maxDiscountAmount: form.maxDiscountAmount === "" ? null : Number(form.maxDiscountAmount)
    };
    try {
      if (editingId) {
        await menuService.updateCoupon(editingId, payload);
      } else {
        await menuService.createCoupon(payload);
      }
      addNotification(editingId ? "Coupon updated successfully." : "Coupon created successfully.", "success");
      resetForm();
      await loadCoupons();
    } catch (error) {
      logger.error("Failed to save coupon:", error);
      addNotification(error.response?.data?.message || "Failed to save coupon.", "error");
    }
  };
  const handleToggleCouponStatus = async coupon => {
    try {
      await menuService.toggleCouponStatus(coupon._id);
      await loadCoupons();
      addNotification(coupon.isActive ? "Coupon deactivated successfully." : "Coupon activated successfully.", "success");
    } catch (error) {
      logger.error("Failed to update coupon status:", error);
      addNotification(error.response?.data?.message || "Failed to update coupon status.", "error");
    }
  };
  const startEdit = coupon => {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code || "",
      description: coupon.description || "",
      type: coupon.type || "percentage",
      value: coupon.value ?? "",
      minOrderAmount: coupon.minOrderAmount ?? "",
      maxDiscountAmount: coupon.maxDiscountAmount ?? "",
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().slice(0, 10) : "",
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().slice(0, 10) : "",
      isActive: coupon.isActive ?? true
    });
    setShowCouponModal(true);
  };
  const couponModalFooter = <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
      <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
        Cancel
      </button>
      <button type="submit" form="coupon-form" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700">
        <Plus className="h-4 w-4" />
        {editingId ? "Update Coupon" : "Create Coupon"}
      </button>
    </div>;
  return <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Management</h1>
          <p className="text-gray-600">
            Manage coupon codes and item-level discount campaigns together.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadCoupons} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />
            Create Coupon
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-3">
              <Percent className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Coupons</h2>
              <p className="text-sm text-gray-500">Customer app will validate these codes at checkout.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {coupons.map(coupon => <div key={coupon._id} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{coupon.code}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${coupon.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {coupon.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{coupon.description || "No description"}</p>
                    <p className="mt-2 text-sm text-gray-500">
                      {coupon.type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`}
                      {" • "}
                      Min order ₹{coupon.minOrderAmount || 0}
                    </p>
                    <details className="mt-3 group rounded-xl border border-slate-200 bg-slate-50">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-slate-700">
                        Coupon details
                        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                      </summary>
                      <div className="grid gap-2 border-t border-slate-200 px-3 py-3 text-sm text-slate-600 sm:grid-cols-2">
                        <div>Max discount: {coupon.maxDiscountAmount ? `₹${coupon.maxDiscountAmount}` : "No cap"}</div>
                        <div>Usage: {coupon.usageLimit ? `${coupon.usageCount || 0} / ${coupon.usageLimit}` : "Unlimited"}</div>
                        <div>Starts: {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString() : "Immediately"}</div>
                        <div>Ends: {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : "No expiry"}</div>
                        <div className="sm:col-span-2">Created: {coupon.createdAt ? new Date(coupon.createdAt).toLocaleString() : "N/A"}</div>
                      </div>
                    </details>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(coupon)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleToggleCouponStatus(coupon)} className="rounded-lg border border-primary-200 px-3 py-2 text-sm text-primary-700">
                      {coupon.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>)}

            {coupons.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                No coupons created yet.
              </div> : null}
          </div>
      </div>

      <AdminModal isOpen={showCouponModal} title={editingId ? "Edit Coupon" : "Create Coupon"} subtitle="Set coupon code rules, discount type, active period, and checkout limits." onClose={resetForm} maxWidth="max-w-3xl" footer={couponModalFooter}>
        <form id="coupon-form" onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.code} onChange={event => setForm(current => ({
            ...current,
            code: event.target.value.toUpperCase()
          }))} placeholder="Coupon code" className="rounded-lg border border-gray-300 px-3 py-2" required />
            <select value={form.type} onChange={event => setForm(current => ({
            ...current,
            type: event.target.value
          }))} className="rounded-lg border border-gray-300 px-3 py-2">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <input type="number" min="0" step="0.01" value={form.value} onChange={event => setForm(current => ({
            ...current,
            value: event.target.value
          }))} placeholder="Discount value" className="rounded-lg border border-gray-300 px-3 py-2" required />
            <input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={event => setForm(current => ({
            ...current,
            minOrderAmount: event.target.value
          }))} placeholder="Minimum order amount" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={event => setForm(current => ({
            ...current,
            maxDiscountAmount: event.target.value
          }))} placeholder="Maximum discount" className="rounded-lg border border-gray-300 px-3 py-2" />
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({
              ...current,
              isActive: event.target.checked
            }))} />
              Active
            </label>
            <input type="date" value={form.startDate} onChange={event => setForm(current => ({
            ...current,
            startDate: event.target.value
          }))} className="rounded-lg border border-gray-300 px-3 py-2" />
            <input type="date" value={form.endDate} onChange={event => setForm(current => ({
            ...current,
            endDate: event.target.value
          }))} className="rounded-lg border border-gray-300 px-3 py-2" />
          </div>

          <textarea rows={4} value={form.description} onChange={event => setForm(current => ({
          ...current,
          description: event.target.value
        }))} placeholder="Coupon description" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </form>
      </AdminModal>
    </div>;
}
