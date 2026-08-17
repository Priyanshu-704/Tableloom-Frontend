import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChefHat,
  Plus,
  Edit,
  Trash2,
  Unlink,
  Eye,
  FolderPlus,
  Clock,
  Layers,
  Tag,
  X,
} from "lucide-react";
import { kitchenStationService, menuService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import { AdminCardGridSkeleton } from "../components/common/AdminSkeleton";
import PermissionGuard from "../components/common/PermissionGuard";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { useAuth } from "../../common/context/AuthContext";

const STATION_TYPES = [
  "grill",
  "fryer",
  "salad",
  "dessert",
  "beverage",
  "expediter",
  "fast food",
  "main course",
];

const STATION_STATUS = ["active", "maintenance", "closed"];

const initialFormData = {
  name: "",
  stationType: "grill",
  capacity: "",
  colorCode: "#4CAF50",
  displayOrder: "",
  status: "active",
  preparationTimes: {
    min: "",
    max: "",
    average: "",
  },
};

export function KitchenStationManagement() {
  const { addNotification, confirmAction } = useAdmin();
  const isMonitoringMode = useMonitoringMode();
  const { hasPermission } = useAuth();

  const canCreateStation =
    !isMonitoringMode && hasPermission("kitchen.station_create");
  const canEditStation =
    !isMonitoringMode && hasPermission("kitchen.station_edit");
  const canDeleteStation =
    !isMonitoringMode && hasPermission("kitchen.station_delete");
  const canAssignStationCategory =
    !isMonitoringMode && hasPermission("kitchen.station_assign_category");
  const canRemoveStationCategory =
    !isMonitoringMode && hasPermission("kitchen.station_remove_category");

  const [stations, setStations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [pageError, setPageError] = useState("");

  // Category Assignment & Details Drawer States
  const [selectedStationIdForCategories, setSelectedStationIdForCategories] = useState(null);
  const [selectedStationIdForDetails, setSelectedStationIdForDetails] = useState(null);
  const [selectedCategoryToAssign, setSelectedCategoryToAssign] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const getErrorMessage = (error, fallbackMessage) => {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      fallbackMessage
    );
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const [stationsResponse, categoriesResponse] = await Promise.all([
        kitchenStationService.getKitchenStations(),
        menuService.getCategories(true, false),
      ]);
      setStations(stationsResponse.data || []);
      setCategories(categoriesResponse.data || []);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to load kitchen station data.",
      );
      logger.error("Failed to load kitchen station data:", error);
      setPageError(message);
      addNotification(message, "error");
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unassignedCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          !category?.kitchenStation?._id && !category?.kitchenStation,
      ),
    [categories],
  );

  const selectedStationForCategories = useMemo(
    () => stations.find((s) => s._id === selectedStationIdForCategories) || null,
    [stations, selectedStationIdForCategories],
  );

  const selectedStationForDetails = useMemo(
    () => stations.find((s) => s._id === selectedStationIdForDetails) || null,
    [stations, selectedStationIdForDetails],
  );

  const handleOpenCreate = () => {
    if (!canCreateStation) return;
    setEditingStation(null);
    setFormData({ ...initialFormData });
    setFormErrors({});
    setShowForm(true);
  };

  const handleOpenEdit = (station) => {
    if (!canEditStation) return;
    setEditingStation(station);
    setFormData({
      name: station.name,
      stationType: station.stationType,
      capacity: station.capacity ?? "",
      colorCode: station.colorCode || "#4CAF50",
      displayOrder: station.displayOrder ?? "",
      status: station.status || "active",
      preparationTimes: {
        min: station.preparationTimes?.min ?? "",
        max: station.preparationTimes?.max ?? "",
        average: station.preparationTimes?.average ?? "",
      },
    });
    setFormErrors({});
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingStation(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handlePreparationTimeChange = (field, value) => {
    setFormData((prev) => {
      const nextPrepTimes = {
        ...prev.preparationTimes,
        [field]: value,
      };

      const minVal = Number(field === "min" ? value : nextPrepTimes.min);
      const maxVal = Number(field === "max" ? value : nextPrepTimes.max);

      if (!Number.isNaN(minVal) && !Number.isNaN(maxVal) && minVal > 0 && maxVal >= minVal) {
        nextPrepTimes.average = String(Math.round((minVal + maxVal) / 2));
      } else if (minVal > 0 && (Number.isNaN(maxVal) || maxVal <= 0)) {
        nextPrepTimes.average = String(minVal);
      } else if (maxVal > 0 && (Number.isNaN(minVal) || minVal <= 0)) {
        nextPrepTimes.average = String(maxVal);
      }

      return {
        ...prev,
        preparationTimes: nextPrepTimes,
      };
    });

    if (formErrors[`preparationTimes.${field}`]) {
      setFormErrors((prev) => ({
        ...prev,
        [`preparationTimes.${field}`]: "",
      }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    const capacity = Number(formData.capacity);
    const displayOrder = Number(formData.displayOrder);
    const min = Number(formData.preparationTimes.min);
    const max = Number(formData.preparationTimes.max);
    const average = Number(formData.preparationTimes.average);

    if (!formData.name.trim()) {
      nextErrors.name = "Station name is required.";
    }
    if (!formData.stationType) {
      nextErrors.stationType = "Station type is required.";
    }
    if (
      String(formData.capacity).trim() === "" ||
      Number.isNaN(capacity) ||
      capacity < 1 ||
      capacity > 50
    ) {
      nextErrors.capacity = "Capacity must be between 1 and 50.";
    }
    if (
      String(formData.displayOrder).trim() === "" ||
      Number.isNaN(displayOrder) ||
      displayOrder < 0
    ) {
      nextErrors.displayOrder = "Display order must be 0 or greater.";
    }
    if (
      String(formData.preparationTimes.min).trim() === "" ||
      Number.isNaN(min) ||
      min < 1
    ) {
      nextErrors["preparationTimes.min"] = "Min prep time must be at least 1.";
    }
    if (
      String(formData.preparationTimes.max).trim() === "" ||
      Number.isNaN(max) ||
      max < 1
    ) {
      nextErrors["preparationTimes.max"] = "Max prep time must be at least 1.";
    }
    if (
      !nextErrors["preparationTimes.min"] &&
      !nextErrors["preparationTimes.max"] &&
      min > max
    ) {
      nextErrors["preparationTimes.max"] =
        "Max prep time must be greater than or equal to min prep time.";
    }
    if (
      String(formData.preparationTimes.average).trim() === "" ||
      Number.isNaN(average) ||
      average < min ||
      average > max
    ) {
      nextErrors["preparationTimes.average"] =
        "Average prep time must be between min and max.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!(canCreateStation || canEditStation)) return;
    if (!validateForm()) {
      addNotification("Please fix the highlighted form errors.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        capacity: Number(formData.capacity),
        displayOrder: Number(formData.displayOrder),
        preparationTimes: {
          min: Number(formData.preparationTimes.min),
          max: Number(formData.preparationTimes.max),
          average: Number(formData.preparationTimes.average),
        },
      };

      if (editingStation) {
        await kitchenStationService.updateKitchenStation(
          editingStation._id,
          payload,
        );
        addNotification("Kitchen station updated successfully.", "success");
      } else {
        await kitchenStationService.createKitchenStation(payload);
        addNotification("Kitchen station created successfully.", "success");
      }

      resetForm();
      await loadData();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save kitchen station.");
      logger.error("Failed to save station:", error);
      addNotification(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (stationId) => {
    if (!canDeleteStation) return;
    const confirmed = await confirmAction({
      title: "Delete Kitchen Station",
      message: "Are you sure you want to delete this kitchen station?",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await kitchenStationService.deleteKitchenStation(stationId);
      addNotification("Kitchen station deleted successfully.", "success");
      await loadData();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete kitchen station.");
      logger.error("Failed to delete station:", error);
      addNotification(message, "error");
    }
  };

  const handleAssignCategory = async (stationId, categoryId) => {
    if (!canAssignStationCategory || !categoryId) return;
    setIsAssigning(true);
    try {
      await kitchenStationService.assignCategoryToStation(stationId, categoryId);
      addNotification("Category assigned successfully.", "success");
      setSelectedCategoryToAssign("");
      await loadData();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to assign category.");
      logger.error("Failed to assign category:", error);
      addNotification(message, "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveCategory = async (stationId, categoryId) => {
    if (!canRemoveStationCategory) return;
    try {
      await kitchenStationService.removeCategoryFromStation(stationId, categoryId);
      addNotification("Category removed successfully.", "success");
      await loadData();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to remove category.");
      logger.error("Failed to remove category:", error);
      addNotification(message, "error");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kitchen Station Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create stations, assign menu categories, and monitor preparation line metrics.
          </p>
        </div>
        <PermissionGuard permission="kitchen.station_create" disableInMonitoring>
          <button
            onClick={handleOpenCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-2xs sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Station
          </button>
        </PermissionGuard>
      </div>

      {pageError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {pageError}
        </div>
      )}

      {/* Main Grid View (Summary Cards) */}
      {loading && stations.length === 0 ? (
        <AdminCardGridSkeleton count={4} cardHeight="h-48" columns="lg:grid-cols-2 xl:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stations.map((station) => {
            const categoryCount = station.assignedCategories?.length || 0;
            const avgPrepTime = station.preparationTimes?.average || 0;

            return (
              <div
                key={station._id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all duration-200"
              >
                {/* Station Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-bold shadow-2xs"
                        style={{ backgroundColor: station.colorCode || "#4CAF50" }}
                      >
                        <ChefHat className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3
                          onClick={() => setSelectedStationIdForDetails(station._id)}
                          className="font-bold text-slate-900 text-base tracking-tight hover:text-sky-600 cursor-pointer transition-colors truncate"
                        >
                          {station.name}
                        </h3>
                        <p className="text-xs text-slate-500 capitalize mt-0.5">
                          {station.stationType} Station
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        station.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                          : station.status === "maintenance"
                          ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                          : "bg-slate-100 text-slate-700 border border-slate-200/80"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          station.status === "active"
                            ? "bg-emerald-500"
                            : station.status === "maintenance"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                        }`}
                      />
                      {station.status || "active"}
                    </span>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-3 gap-2 my-4 text-xs">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-center">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Capacity</span>
                      <span className="font-bold text-slate-800">{station.capacity || "N/A"}</span>
                    </div>

                    <div className="rounded-xl bg-sky-50/60 border border-sky-100 p-2 text-center">
                      <span className="block text-[10px] uppercase font-bold text-sky-600">Avg Prep</span>
                      <span className="font-bold text-sky-900">{avgPrepTime}m</span>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-center">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Categories</span>
                      <span className="font-bold text-slate-800">{categoryCount}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStationIdForCategories(station._id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <FolderPlus className="h-3.5 w-3.5 text-sky-600" />
                    <span>Categories</span>
                    <span className="ml-1 rounded-full bg-white px-1.5 py-0.2 text-[10px] font-bold text-slate-600 border border-slate-200">
                      {categoryCount}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedStationIdForDetails(station._id)}
                      title="View Details Drawer"
                      aria-label="View Details Drawer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {(canEditStation || canDeleteStation) && (
                      <>
                        <PermissionGuard permission="kitchen.station_edit" disableInMonitoring>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(station)}
                            title="Edit Station"
                            aria-label="Edit Station"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </PermissionGuard>

                        <PermissionGuard permission="kitchen.station_delete" disableInMonitoring>
                          <button
                            type="button"
                            onClick={() => handleDelete(station._id)}
                            title="Delete Station"
                            aria-label="Delete Station"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition shadow-2xs"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && stations.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <ChefHat className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            No kitchen stations created yet
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
            Create a station to map menu categories and route incoming kitchen orders efficiently.
          </p>
          <PermissionGuard permission="kitchen.station_create" disableInMonitoring>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              <Plus className="h-4 w-4" />
              Create Station
            </button>
          </PermissionGuard>
        </div>
      )}

      {/* ────────────────── 1. MANAGE CATEGORIES MODAL ────────────────── */}
      {selectedStationForCategories && (
        <AdminModal
          isOpen={Boolean(selectedStationForCategories)}
          title={`Manage Categories - ${selectedStationForCategories.name}`}
          subtitle="Assign or unassign menu categories for this kitchen preparation station."
          onClose={() => {
            setSelectedStationIdForCategories(null);
            setSelectedCategoryToAssign("");
          }}
          maxWidth="max-w-lg"
        >
          <div className="p-5 space-y-5">
            {/* Currently Assigned Categories */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Assigned Categories</span>
                <span className="text-xs font-normal text-slate-500">
                  {selectedStationForCategories.assignedCategories?.length || 0} total
                </span>
              </h3>

              {selectedStationForCategories.assignedCategories?.length ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedStationForCategories.assignedCategories.map((category) => (
                    <div
                      key={category._id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        <Tag className="h-4 w-4 text-sky-600" />
                        <span>{category.name}</span>
                      </div>

                      <PermissionGuard permission="kitchen.station_remove_category" disableInMonitoring>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(selectedStationForCategories._id, category._id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 rounded-lg px-2.5 py-1 transition"
                        >
                          <Unlink className="h-3 w-3" />
                          Remove
                        </button>
                      </PermissionGuard>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                  No menu categories currently assigned to this station.
                </div>
              )}
            </div>

            {/* Assign New Category Selector */}
            {canAssignStationCategory && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Assign Unassigned Category
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden"
                    value={selectedCategoryToAssign}
                    onChange={(e) => setSelectedCategoryToAssign(e.target.value)}
                  >
                    <option value="">Select unassigned category...</option>
                    {unassignedCategories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedCategoryToAssign || isAssigning}
                    onClick={() =>
                      handleAssignCategory(selectedStationForCategories._id, selectedCategoryToAssign)
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Assign
                  </button>
                </div>
              </div>
            )}
          </div>
        </AdminModal>
      )}

      {/* ────────────────── 2. STATION DETAILS SIDE DRAWER ────────────────── */}
      {selectedStationForDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedStationIdForDetails(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold shadow-2xs"
                    style={{ backgroundColor: selectedStationForDetails.colorCode || "#4CAF50" }}
                  >
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      Station Details
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selectedStationForDetails.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStationIdForDetails(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
                  aria-label="Close drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Station Card Header Info */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{selectedStationForDetails.name}</h3>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">
                        {selectedStationForDetails.stationType} Station
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        selectedStationForDetails.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : selectedStationForDetails.status === "maintenance"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {selectedStationForDetails.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 text-slate-600">
                    <div>
                      <span className="text-slate-400 font-medium block">Capacity Limit</span>
                      <span className="font-bold text-slate-800">{selectedStationForDetails.capacity || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Display Order</span>
                      <span className="font-bold text-slate-800">{selectedStationForDetails.displayOrder ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Preparation Times Breakdown */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Preparation Times Breakdown
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
                      <span className="block text-slate-400 font-medium">Min Time</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">
                        {selectedStationForDetails.preparationTimes?.min || 0}m
                      </span>
                    </div>

                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-center shadow-2xs">
                      <span className="block text-sky-600 font-bold text-[11px]">Average</span>
                      <span className="text-base font-bold text-sky-900 mt-1 block">
                        {selectedStationForDetails.preparationTimes?.average || 0}m
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
                      <span className="block text-slate-400 font-medium">Max Time</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">
                        {selectedStationForDetails.preparationTimes?.max || 0}m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned Menu Categories */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      Assigned Menu Categories
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      {selectedStationForDetails.assignedCategories?.length || 0} categories
                    </span>
                  </h4>

                  {selectedStationForDetails.assignedCategories?.length ? (
                    <div className="space-y-2">
                      {selectedStationForDetails.assignedCategories.map((cat) => (
                        <div
                          key={cat._id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-sky-600" />
                            <span>{cat.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Assigned
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400 italic">
                      No menu categories currently assigned to this station.
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Sticky Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const stationId = selectedStationForDetails._id;
                    setSelectedStationIdForDetails(null);
                    setSelectedStationIdForCategories(stationId);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                >
                  <FolderPlus className="h-4 w-4 text-sky-600" />
                  Manage Categories
                </button>

                <div className="flex items-center gap-2">
                  {canEditStation && (
                    <button
                      type="button"
                      onClick={() => {
                        const station = selectedStationForDetails;
                        setSelectedStationIdForDetails(null);
                        handleOpenEdit(station);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit Station
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedStationIdForDetails(null)}
                    className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 3. CREATE / EDIT STATION MODAL ────────────────── */}
      {(canCreateStation || canEditStation) && showForm && (
        <AdminModal
          isOpen={showForm}
          title={editingStation ? "Edit Kitchen Station" : "Create Kitchen Station"}
          subtitle="Configure station details and preparation settings."
          onClose={resetForm}
          maxWidth="max-w-xl"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 sm:w-auto transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="kitchen-station-form"
                disabled={isSaving}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto transition"
              >
                {isSaving ? "Saving..." : editingStation ? "Update" : "Create"}
              </button>
            </div>
          }
        >
          <form id="kitchen-station-form" onSubmit={handleSave}>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${formErrors.name ? "border-red-300" : "border-gray-300"}`}
                  required
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Type <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  value={formData.stationType}
                  onChange={(e) =>
                    handleFieldChange("stationType", e.target.value)
                  }
                  className={`w-full border rounded-lg px-3 py-2 ${formErrors.stationType ? "border-red-300" : "border-gray-300"}`}
                  required
                >
                  {STATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {formErrors.stationType && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.stationType}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFieldChange("status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {STATION_STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) =>
                    handleFieldChange("capacity", e.target.value)
                  }
                  className={`w-full border rounded-lg px-3 py-2 ${formErrors.capacity ? "border-red-300" : "border-gray-300"}`}
                />
                {formErrors.capacity && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.capacity}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    handleFieldChange("displayOrder", e.target.value)
                  }
                  className={`w-full border rounded-lg px-3 py-2 ${formErrors.displayOrder ? "border-red-300" : "border-gray-300"}`}
                />
                {formErrors.displayOrder && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.displayOrder}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Code
                </label>
                <input
                  type="color"
                  value={formData.colorCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      colorCode: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prep Time Min <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.preparationTimes.min}
                  onChange={(e) =>
                    handlePreparationTimeChange("min", e.target.value)
                  }
                  className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.min"] ? "border-red-300" : "border-gray-300"}`}
                />
                {formErrors["preparationTimes.min"] && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors["preparationTimes.min"]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prep Time Max <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.preparationTimes.max}
                  onChange={(e) =>
                    handlePreparationTimeChange("max", e.target.value)
                  }
                  className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.max"] ? "border-red-300" : "border-gray-300"}`}
                />
                {formErrors["preparationTimes.max"] && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors["preparationTimes.max"]}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                  <span>Prep Time Average</span>
                  <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">Auto-Calculated</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.preparationTimes.average}
                  onChange={(e) =>
                    handlePreparationTimeChange("average", e.target.value)
                  }
                  className={`w-full border rounded-lg px-3 py-2 bg-slate-50 font-medium ${formErrors["preparationTimes.average"] ? "border-red-300" : "border-gray-300"}`}
                />
                {formErrors["preparationTimes.average"] && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors["preparationTimes.average"]}
                  </p>
                )}
              </div>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
