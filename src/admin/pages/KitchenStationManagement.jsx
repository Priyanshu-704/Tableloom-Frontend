import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Plus, Edit, Trash2, Loader, Unlink } from "lucide-react";
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
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [pageError, setPageError] = useState("");
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
  const handleOpenCreate = () => {
    if (!canCreateStation) {
      return;
    }
    setEditingStation(null);
    setFormData({
      ...initialFormData,
    });
    setFormErrors({});
    setShowForm(true);
  };
  const handleOpenEdit = (station) => {
    if (!canEditStation) {
      return;
    }
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
    setFormData((prev) => ({
      ...prev,
      preparationTimes: {
        ...prev.preparationTimes,
        [field]: value,
      },
    }));
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
    if (!(canCreateStation || canEditStation)) {
      return;
    }
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
    if (!canDeleteStation) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete Kitchen Station",
      message: "Are you sure you want to delete this kitchen station?",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }
    try {
      await kitchenStationService.deleteKitchenStation(stationId);
      addNotification("Kitchen station deleted successfully.", "success");
      await loadData();
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to delete kitchen station.",
      );
      logger.error("Failed to delete station:", error);
      addNotification(message, "error");
    }
  };
  const handleAssignCategory = async (stationId, categoryId) => {
    if (!canAssignStationCategory) {
      return;
    }
    try {
      await kitchenStationService.assignCategoryToStation(
        stationId,
        categoryId,
      );
      addNotification("Category assigned successfully.", "success");
      await loadData();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to assign category.");
      logger.error("Failed to assign category:", error);
      addNotification(message, "error");
    }
  };
  const handleRemoveCategory = async (stationId, categoryId) => {
    if (!canRemoveStationCategory) {
      return;
    }
    try {
      await kitchenStationService.removeCategoryFromStation(
        stationId,
        categoryId,
      );
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Kitchen Station Management
          </h1>
          <p className="text-gray-600">
            Create stations and assign menu categories to the right preparation
            line.
          </p>
        </div>
        <PermissionGuard permission="kitchen.station_create" disableInMonitoring>
          <button
            onClick={handleOpenCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Station
          </button>
        </PermissionGuard>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {loading ? (
        <AdminCardGridSkeleton
          count={4}
          cardHeight="h-56"
          columns="lg:grid-cols-2"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {stations.map((station) => (
            <div
              key={station._id}
              className="flex h-full min-h-112 flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: station.colorCode || "#4CAF50",
                    }}
                  >
                    <ChefHat className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {station.name}
                    </h2>
                    <p className="text-sm text-gray-600 capitalize">
                      {station.stationType} • Capacity {station.capacity}
                    </p>
                  </div>
                </div>

                {(canEditStation || canDeleteStation) && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <PermissionGuard permission="kitchen.station_edit" disableInMonitoring>
                      <button
                        onClick={() => handleOpenEdit(station)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="kitchen.station_delete" disableInMonitoring>
                      <button
                        onClick={() => handleDelete(station._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </PermissionGuard>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${station.status === "active" ? "bg-green-100 text-green-800" : station.status === "maintenance" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {station.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-gray-500">
                <div className="rounded-md bg-gray-50 border border-gray-200 px-2 py-2">
                  Min: {station.preparationTimes?.min || 0}m
                </div>
                <div className="rounded-md bg-gray-50 border border-gray-200 px-2 py-2">
                  Avg: {station.preparationTimes?.average || 0}m
                </div>
                <div className="rounded-md bg-gray-50 border border-gray-200 px-2 py-2">
                  Max: {station.preparationTimes?.max || 0}m
                </div>
              </div>

              <div className="mb-4 flex-1 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Assigned Categories
                </p>
                {station.assignedCategories?.length ? (
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {station.assignedCategories.map((category) => (
                      <div
                        key={category._id}
                        className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <span className="text-sm text-gray-700">
                          {category.name}
                        </span>
                        <PermissionGuard
                          permission="kitchen.station_remove_category"
                          disableInMonitoring
                        >
                          <button
                            onClick={() =>
                              handleRemoveCategory(station._id, category._id)
                            }
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                          >
                            <Unlink className="h-3 w-3" />
                            Remove
                          </button>
                        </PermissionGuard>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-4 text-center text-sm text-gray-500">
                    No categories assigned
                  </div>
                )}
              </div>

              {canAssignStationCategory && (
                <div className="mt-auto border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Assign Category
                  </p>
                  <div className="flex flex-col gap-2">
                    <select
                      className="w-full flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          handleAssignCategory(station._id, value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Select unassigned category</option>
                      {unassignedCategories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && stations.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No kitchen stations yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create a station to map categories and route orders.
          </p>
          <PermissionGuard permission="kitchen.station_create" disableInMonitoring>
            <button
              onClick={handleOpenCreate}
              className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 sm:w-auto"
            >
              Create Station
            </button>
          </PermissionGuard>
        </div>
      )}

      {(canCreateStation || canEditStation) && showForm && (
        <AdminModal
          isOpen={showForm}
          title={
            editingStation ? "Edit Kitchen Station" : "Create Kitchen Station"
          }
          subtitle="Configure station details and preparation settings."
          onClose={resetForm}
          maxWidth="max-w-xl"
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
                form="kitchen-station-form"
                disabled={isSaving}
                className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
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
                  Station Name *
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
                  Station Type *
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
                  Capacity
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
                  Prep Time Min
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
                  Prep Time Max
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prep Time Average
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.preparationTimes.average}
                  onChange={(e) =>
                    handlePreparationTimeChange("average", e.target.value)
                  }
                  className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.average"] ? "border-red-300" : "border-gray-300"}`}
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
