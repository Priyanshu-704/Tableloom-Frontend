import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Eye, EyeOff, Loader, Ruler, Search } from "lucide-react";
import { menuService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import { AdminPageSkeleton } from "../components/common/AdminSkeleton";
import PermissionGuard from "../components/common/PermissionGuard";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { useAuth } from "../../common/context/AuthContext";
const initialFormData = {
  name: "",
  code: "",
  isActive: true,
};
export function SizeManagement() {
  const isMonitoringMode = useMonitoringMode();
  const { confirmAction, addNotification } = useAdmin();
  const { hasPermission } = useAuth();
  const canCreateSize = !isMonitoringMode && hasPermission("menu.size_create");
  const canEditSize = !isMonitoringMode && hasPermission("menu.size_edit");
  const canToggleSizeStatus =
    !isMonitoringMode && hasPermission("menu.size_toggle_status");
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSize, setEditingSize] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const loadSizes = useCallback(async () => {
    try {
      setLoading(true);
      const activeParam =
        statusFilter === "all" ? "all" : statusFilter === "active";
      const response = await menuService.getSizes(activeParam);
      setSizes(response.data || []);
    } catch (error) {
      logger.error("Failed to load sizes:", error);
      addNotification(
        error.response?.data?.message || "Failed to load sizes.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);
  useEffect(() => {
    loadSizes();
  }, [loadSizes]);
  const resetForm = () => {
    setEditingSize(null);
    setFormData(initialFormData);
    setErrors({});
    setShowModal(false);
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Size name is required";
    }
    if (!formData.code.trim()) {
      newErrors.code = "Size code is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleOpenCreate = () => {
    if (!canCreateSize) {
      addNotification(
        "Size management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    setEditingSize(null);
    setFormData(initialFormData);
    setErrors({});
    setShowModal(true);
  };
  const handleOpenEdit = (size) => {
    if (!canEditSize) {
      addNotification(
        "Size management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    setEditingSize(size);
    setFormData({
      name: size.name,
      code: size.code,
      isActive: size.isActive,
    });
    setErrors({});
    setShowModal(true);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!(canCreateSize || canEditSize)) {
      addNotification(
        "Size management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    if (!validateForm()) {
      return;
    }
    try {
      setSaving(true);
      if (editingSize) {
        await menuService.updateSize(editingSize._id, formData);
      } else {
        await menuService.createSize(formData);
      }
      await loadSizes();
      resetForm();
      addNotification(
        editingSize
          ? "Size updated successfully."
          : "Size created successfully.",
        "success",
      );
    } catch (error) {
      logger.error("Failed to save size:", error);
      addNotification(
        error.response?.data?.message || "Failed to save size.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };
  const handleToggleStatus = async (sizeId) => {
    if (!canToggleSizeStatus) {
      addNotification(
        "Size management is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    const size = sizes.find((item) => item._id === sizeId);
    const confirmed = await confirmAction({
      title: `${size?.isActive ? "Deactivate" : "Activate"} Size`,
      message: `Are you sure you want to ${size?.isActive ? "deactivate" : "activate"} this size?`,
      confirmLabel: size?.isActive ? "Deactivate" : "Activate",
      tone: "warning",
    });
    if (!confirmed) {
      return;
    }
    try {
      await menuService.toggleSizeStatus(sizeId);
      await loadSizes();
      addNotification("Size status updated successfully.", "success");
    } catch (error) {
      logger.error("Failed to toggle size status:", error);
      addNotification(
        error.response?.data?.message || "Failed to update size status.",
        "error",
      );
    }
  };
  const filteredSizes = useMemo(() => {
    return sizes.filter((size) => {
      const matchesSearch =
        !searchTerm ||
        size.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        size.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? size.isActive : !size.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, sizes, statusFilter]);
  if (loading && sizes.length === 0) {
    return (
      <AdminPageSkeleton stats={3} filters={2} cards={4} cardHeight="h-40" />
    );
  }
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Size Management</h1>
          <p className="text-gray-600">
            Manage menu sizes and their reusable codes.
          </p>
        </div>
        <PermissionGuard permission="menu.size_create" disableInMonitoring>
          <button
            onClick={handleOpenCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Size
          </button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by size name or code"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      {filteredSizes.length > 0 && (
        <>
          <div className="space-y-4 md:hidden">
            {filteredSizes.map((size) => (
              <div
                key={size._id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-900">
                      <Ruler className="h-4 w-4 text-gray-400" />
                      <h2 className="font-semibold">{size.name}</h2>
                    </div>
                    <p className="text-sm text-gray-600">Code: {size.code}</p>
                    <span
                      className={`inline-flex items-center justify-center w-20 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider text-center ${
                        size.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                          : "bg-rose-50 text-rose-700 border border-rose-200/80"
                      }`}
                    >
                      {size.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <PermissionGuard permission="menu.size_edit" disableInMonitoring>
                    <button
                      onClick={() => handleOpenEdit(size)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                      title="Edit size"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  </PermissionGuard>
                  <PermissionGuard permission="menu.size_toggle_status" disableInMonitoring>
                    <button
                      onClick={() => handleToggleStatus(size._id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-orange-200 px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                      title="Toggle status"
                    >
                      {size.isActive ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {size.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </PermissionGuard>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white md:block shadow-2xs">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-[45%] px-5 py-3.5">Name</th>
                  <th className="w-[20%] px-5 py-3.5">Code</th>
                  <th className="w-[20%] px-5 py-3.5">Status</th>
                  <th className="w-[15%] px-5 py-3.5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSizes.map((size) => (
                  <tr key={size._id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                        <Ruler className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{size.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-slate-600 font-mono text-xs">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 border border-slate-200">{size.code}</span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span
                        className={`inline-flex items-center justify-center w-20 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider text-center ${
                          size.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : "bg-rose-50 text-rose-700 border border-rose-200/80"
                        }`}
                      >
                        {size.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <PermissionGuard permission="menu.size_edit" disableInMonitoring>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(size)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
                            title="Edit size"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission="menu.size_toggle_status" disableInMonitoring>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(size._id)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition shadow-2xs ${
                              size.isActive
                                ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                                : "border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={size.isActive ? "Deactivate size" : "Activate size"}
                          >
                            {size.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {filteredSizes.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <Ruler className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No sizes found
          </h3>
          <p className="text-gray-600 mb-4">
            Try clearing the filters or create a new size.
          </p>
          <PermissionGuard permission="menu.size_create" disableInMonitoring>
            <button
              onClick={handleOpenCreate}
              className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 sm:w-auto"
            >
              Create Size
            </button>
          </PermissionGuard>
        </div>
      )}

      {(canCreateSize || canEditSize) && showModal && (
        <AdminModal
          isOpen={showModal}
          title={editingSize ? "Edit Size" : "Create Size"}
          subtitle="Manage reusable menu sizes and codes."
          onClose={resetForm}
          maxWidth="max-w-lg"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="size-form"
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
              >
                {saving && <Loader className="h-4 w-4 animate-spin mr-2" />}
                {editingSize ? "Update Size" : "Create Size"}
              </button>
            </div>
          }
        >
          <form
            id="size-form"
            onSubmit={handleSubmit}
            className="p-5 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className={`w-full border rounded-lg px-3 py-2 ${errors.name ? "border-red-300" : "border-gray-300"}`}
                placeholder="e.g. Medium"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                className={`w-full border rounded-lg px-3 py-2 ${errors.code ? "border-red-300" : "border-gray-300"}`}
                placeholder="e.g. M"
              />
              {errors.code && (
                <p className="text-red-600 text-sm mt-1">{errors.code}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="size-active"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-primary-600"
              />
              <label
                htmlFor="size-active"
                className="ml-2 text-sm text-gray-700"
              >
                Active Size
              </label>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
