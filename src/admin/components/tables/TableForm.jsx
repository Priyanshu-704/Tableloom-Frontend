import { logger } from "../../../common/utils/logger.js";
import React, { useState } from "react";
import { Users, MapPin, Loader } from "lucide-react";
import tableService from "../../../common/services/TableService";
import { AdminModal } from "../common/AdminModal";
const LOCATIONS = [
  "Indoor",
  "Main Hall",
  "Private Room",
  "Outdoor",
  "Bar Area",
  "Terrace",
];
export function TableForm({ table, onSave, onCancel, showToast }) {
  const [formData, setFormData] = useState({
    tableNumber: table?.tableNumber || table?.number || "",
    tableName: table?.tableName || "",
    capacity: table?.capacity ?? "",
    location: table?.location || LOCATIONS[0],
    notes: table?.notes || "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const validateForm = () => {
    const validation = tableService.validateTableData({
      tableNumber: formData.tableNumber,
      capacity: formData.capacity,
      tableName: formData.tableName,
      notes: formData.notes,
    });
    setErrors(validation.errors);
    return validation.isValid;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setSubmitting(true);
    try {
      const tableData = {
        tableNumber: formData.tableNumber,
        tableName: formData.tableName,
        capacity: parseInt(formData.capacity),
        location:
          {
            Indoor: "indoor",
            "Main Hall": "main hall",
            "Private Room": "private-room",
            Outdoor: "outdoor",
            "Bar Area": "bar",
            Terrace: "terrace",
          }[formData.location] || "indoor",
        notes: formData.notes,
      };
      if (table?._id || table?.id) {
        const tableId = table._id || table.id;
        await tableService.updateTable(tableId, tableData);
      } else {
        await tableService.createTable(tableData);
      }
      onSave();
      showToast?.(
        table ? "Table updated successfully" : "Table created successfully",
        "success",
      );
    } catch (error) {
      logger.error("Failed to save table:", error);
      let errorMessage = "Failed to save table. Please try again.";
      if (error.response?.data) {
        const apiError = error.response.data;
        if (apiError.message?.includes("number already exists")) {
          setErrors((prev) => ({
            ...prev,
            tableNumber: "Table number already exists",
          }));
          return;
        }
        errorMessage = apiError.message || errorMessage;
      }
      showToast?.(errorMessage, "error");
    }
  };
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };
  return (
    <AdminModal
      isOpen={true}
      title={table ? "Edit Table" : "Add New Table"}
      subtitle={
        table ? "Update table details." : "Add a new table to your restaurant."
      }
      onClose={onCancel}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="table-form"
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader className="h-4 w-4 animate-spin" />}
            <span>
              {submitting ? "Saving..." : table ? "Update Table" : "Add Table"}
            </span>
          </button>
        </div>
      }
    >
      <form id="table-form" onSubmit={handleSubmit} className="space-y-6 p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Number *
              </label>
              <input
                type="text"
                value={formData.tableNumber}
                onChange={(e) => handleChange("tableNumber", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.tableNumber ? "border-red-300" : "border-gray-300"}`}
                placeholder="e.g., T01"
                disabled={!!table}
              />
              {errors.tableNumber && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.tableNumber}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Name
              </label>
              <input
                type="text"
                value={formData.tableName}
                onChange={(e) => handleChange("tableName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Window Side Table"
              />
              {errors.tableName && (
                <p className="text-red-600 text-sm mt-1">{errors.tableName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity *
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.capacity}
                  onChange={(e) => handleChange("capacity", e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.capacity ? "border-red-300" : "border-gray-300"}`}
                />
              </div>
              {errors.capacity && (
                <p className="text-red-600 text-sm mt-1">{errors.capacity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.location ? "border-red-300" : "border-gray-300"}`}
                >
                  {LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              {errors.location && (
                <p className="text-red-600 text-sm mt-1">{errors.location}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Additional notes about this table..."
              />
              {errors.notes && (
                <p className="text-red-600 text-sm mt-1">{errors.notes}</p>
              )}
            </div>
          </div>
        </div>
      </form>
    </AdminModal>
  );
}
