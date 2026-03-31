import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Plus, Edit, Trash2, Loader, Link2, Unlink } from "lucide-react";
import { kitchenStationService, menuService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import { AdminCardGridSkeleton } from "../components/common/AdminSkeleton";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { MonitoringBanner } from "../components/common/MonitoringBanner";
const STATION_TYPES = ["grill", "fryer", "salad", "dessert", "beverage", "expediter", "fast food", "main course"];
const STATION_STATUS = ["active", "maintenance", "closed"];
const initialFormData = {
  name: "",
  stationType: "grill",
  capacity: 1,
  colorCode: "#4CAF50",
  displayOrder: 0,
  status: "active",
  preparationTimes: {
    min: 5,
    max: 30,
    average: 15
  }
};
export function KitchenStationManagement() {
  const {
    addNotification,
    confirmAction
  } = useAdmin();
  const isMonitoringMode = useMonitoringMode();
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
    return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallbackMessage;
  };
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const [stationsResponse, categoriesResponse] = await Promise.all([kitchenStationService.getKitchenStations(), menuService.getCategories(true, true)]);
      setStations(stationsResponse.data || []);
      setCategories(categoriesResponse.data || []);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load kitchen station data.");
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
  const unassignedCategories = useMemo(() => categories.filter(category => !category.kitchenStation), [categories]);
  const handleOpenCreate = () => {
    if (isMonitoringMode) {
      return;
    }
    setEditingStation(null);
    setFormData({
      ...initialFormData,
      displayOrder: stations.length
    });
    setFormErrors({});
    setShowForm(true);
  };
  const handleOpenEdit = station => {
    if (isMonitoringMode) {
      return;
    }
    setEditingStation(station);
    setFormData({
      name: station.name,
      stationType: station.stationType,
      capacity: station.capacity || 1,
      colorCode: station.colorCode || "#4CAF50",
      displayOrder: station.displayOrder || 0,
      status: station.status || "active",
      preparationTimes: {
        min: station.preparationTimes?.min || 5,
        max: station.preparationTimes?.max || 30,
        average: station.preparationTimes?.average || 15
      }
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };
  const handlePreparationTimeChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      preparationTimes: {
        ...prev.preparationTimes,
        [field]: value
      }
    }));
    if (formErrors[`preparationTimes.${field}`]) {
      setFormErrors(prev => ({
        ...prev,
        [`preparationTimes.${field}`]: ""
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
    if (Number.isNaN(capacity) || capacity < 1 || capacity > 50) {
      nextErrors.capacity = "Capacity must be between 1 and 50.";
    }
    if (Number.isNaN(displayOrder) || displayOrder < 0) {
      nextErrors.displayOrder = "Display order must be 0 or greater.";
    }
    if (Number.isNaN(min) || min < 1) {
      nextErrors["preparationTimes.min"] = "Min prep time must be at least 1.";
    }
    if (Number.isNaN(max) || max < 1) {
      nextErrors["preparationTimes.max"] = "Max prep time must be at least 1.";
    }
    if (!nextErrors["preparationTimes.min"] && !nextErrors["preparationTimes.max"] && min > max) {
      nextErrors["preparationTimes.max"] = "Max prep time must be greater than or equal to min prep time.";
    }
    if (Number.isNaN(average) || average < min || average > max) {
      nextErrors["preparationTimes.average"] = "Average prep time must be between min and max.";
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleSave = async e => {
    e.preventDefault();
    if (isMonitoringMode) {
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
          average: Number(formData.preparationTimes.average)
        }
      };
      if (editingStation) {
        await kitchenStationService.updateKitchenStation(editingStation._id, payload);
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
  const handleDelete = async stationId => {
    if (isMonitoringMode) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete Kitchen Station",
      message: "Are you sure you want to delete this kitchen station?",
      confirmLabel: "Delete",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }
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
    if (isMonitoringMode) {
      return;
    }
    try {
      await kitchenStationService.assignCategoryToStation(stationId, categoryId);
      addNotification("Category assigned successfully.", "success");
      await loadData();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to assign category.");
      logger.error("Failed to assign category:", error);
      addNotification(message, "error");
    }
  };
  const handleRemoveCategory = async (stationId, categoryId) => {
    if (isMonitoringMode) {
      return;
    }
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
  return <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Station Management</h1>
          <p className="text-gray-600">
            Create stations and assign menu categories to the right preparation line.
          </p>
        </div>
        {!isMonitoringMode && <button onClick={handleOpenCreate} className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
            <Plus className="h-4 w-4" />
            Add Station
          </button>}
      </div>

      {isMonitoringMode && <MonitoringBanner message="Kitchen stations and category routing are visible here for monitoring, but create, edit, delete, and assignment actions are disabled." />}

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>}

      {loading ? <AdminCardGridSkeleton count={4} cardHeight="h-56" columns="lg:grid-cols-2" /> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stations.map(station => <div key={station._id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{
              backgroundColor: station.colorCode || "#4CAF50"
            }}>
                    <ChefHat className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{station.name}</h2>
                    <p className="text-sm text-gray-600 capitalize">
                      {station.stationType} • Capacity {station.capacity}
                    </p>
                  </div>
                </div>

                {!isMonitoringMode && <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenEdit(station)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(station._id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>}
              </div>

              <div className="mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${station.status === "active" ? "bg-green-100 text-green-800" : station.status === "maintenance" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
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

              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700">Assigned Categories</p>
                {station.assignedCategories?.length ? <div className="space-y-2">
                    {station.assignedCategories.map(category => <div key={category._id} className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded px-3 py-2">
                        <span className="text-sm text-gray-700">{category.name}</span>
                        {!isMonitoringMode && <button onClick={() => handleRemoveCategory(station._id, category._id)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
                            <Unlink className="h-3 w-3" />
                            Remove
                          </button>}
                      </div>)}
                  </div> : <p className="text-sm text-gray-500">No categories assigned</p>}
              </div>

              {!isMonitoringMode && <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Assign Category</p>
                <div className="flex gap-2">
                  <select className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" defaultValue="" onChange={e => {
              const value = e.target.value;
              if (value) {
                handleAssignCategory(station._id, value);
                e.target.value = "";
              }
            }}>
                    <option value="">Select unassigned category</option>
                    {unassignedCategories.map(category => <option key={category._id} value={category._id}>
                        {category.name}
                      </option>)}
                  </select>
                  <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700" disabled>
                    <Link2 className="h-4 w-4" />
                  </button>
                </div>
              </div>}
            </div>)}
        </div>}

      {!loading && stations.length === 0 && <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No kitchen stations yet</h3>
          <p className="text-gray-600 mb-4">Create a station to map categories and route orders.</p>
          {!isMonitoringMode && <button onClick={handleOpenCreate} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
              Create Station
            </button>}
        </div>}

      {!isMonitoringMode && showForm && <AdminModal isOpen={showForm} title={editingStation ? "Edit Kitchen Station" : "Create Kitchen Station"} subtitle="Configure station details and preparation settings." onClose={resetForm} maxWidth="max-w-xl" footer={<div className="flex justify-end gap-3">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" form="kitchen-station-form" disabled={isSaving} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-60">
                {isSaving ? "Saving..." : editingStation ? "Update" : "Create"}
              </button>
            </div>}>
          <form id="kitchen-station-form" onSubmit={handleSave}>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Station Name *</label>
                <input type="text" value={formData.name} onChange={e => handleFieldChange("name", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors.name ? "border-red-300" : "border-gray-300"}`} required />
                {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station Type *</label>
                <select value={formData.stationType} onChange={e => handleFieldChange("stationType", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors.stationType ? "border-red-300" : "border-gray-300"}`} required>
                  {STATION_TYPES.map(type => <option key={type} value={type}>
                      {type}
                    </option>)}
                </select>
                {formErrors.stationType && <p className="mt-1 text-sm text-red-600">
                    {formErrors.stationType}
                  </p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={e => handleFieldChange("status", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  {STATION_STATUS.map(status => <option key={status} value={status}>
                      {status}
                    </option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input type="number" min="1" value={formData.capacity} onChange={e => handleFieldChange("capacity", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors.capacity ? "border-red-300" : "border-gray-300"}`} />
                {formErrors.capacity && <p className="mt-1 text-sm text-red-600">
                    {formErrors.capacity}
                  </p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input type="number" min="0" value={formData.displayOrder} onChange={e => handleFieldChange("displayOrder", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors.displayOrder ? "border-red-300" : "border-gray-300"}`} />
                {formErrors.displayOrder && <p className="mt-1 text-sm text-red-600">
                    {formErrors.displayOrder}
                  </p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Color Code</label>
                <input type="color" value={formData.colorCode} onChange={e => setFormData(prev => ({
              ...prev,
              colorCode: e.target.value
            }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time Min</label>
                <input type="number" min="1" value={formData.preparationTimes.min} onChange={e => handlePreparationTimeChange("min", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.min"] ? "border-red-300" : "border-gray-300"}`} />
                {formErrors["preparationTimes.min"] && <p className="mt-1 text-sm text-red-600">
                    {formErrors["preparationTimes.min"]}
                  </p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time Max</label>
                <input type="number" min="1" value={formData.preparationTimes.max} onChange={e => handlePreparationTimeChange("max", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.max"] ? "border-red-300" : "border-gray-300"}`} />
                {formErrors["preparationTimes.max"] && <p className="mt-1 text-sm text-red-600">
                    {formErrors["preparationTimes.max"]}
                  </p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time Average</label>
                <input type="number" min="1" value={formData.preparationTimes.average} onChange={e => handlePreparationTimeChange("average", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.average"] ? "border-red-300" : "border-gray-300"}`} />
                {formErrors["preparationTimes.average"] && <p className="mt-1 text-sm text-red-600">
                    {formErrors["preparationTimes.average"]}
                  </p>}
              </div>
            </div>
          </form>
        </AdminModal>}
    </div>;
}
