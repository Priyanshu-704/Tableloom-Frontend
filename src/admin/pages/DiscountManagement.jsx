import React, { useEffect, useState } from "react";
import { Percent, Plus, RefreshCw } from "lucide-react";
import { menuService } from "../../common/services";
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
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const loadCoupons = async () => {
    setLoading(true);
    try {
      const response = await menuService.getCoupons("all");
      setCoupons(response?.data || []);
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
    if (editingId) {
      await menuService.updateCoupon(editingId, payload);
    } else {
      await menuService.createCoupon(payload);
    }
    resetForm();
    await loadCoupons();
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
  };
  return <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Management</h1>
          <p className="text-gray-600">
            Manage coupon codes and item-level discount campaigns together.
          </p>
        </div>
        <button type="button" onClick={loadCoupons} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Coupon" : "Create Coupon"}
            </h2>
            {editingId ? <button type="button" onClick={resetForm} className="text-sm text-gray-600">
                Cancel
              </button> : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
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
        }))} placeholder="Coupon description" className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2" />

          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white">
            <Plus className="h-4 w-4" />
            {editingId ? "Update Coupon" : "Create Coupon"}
          </button>
        </form>

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
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(coupon)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      Edit
                    </button>
                    <button type="button" onClick={() => menuService.toggleCouponStatus(coupon._id).then(loadCoupons)} className="rounded-lg border border-primary-200 px-3 py-2 text-sm text-primary-700">
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
      </div>
    </div>;
}
