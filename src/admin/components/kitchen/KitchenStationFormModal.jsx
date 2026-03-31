import React from "react";
import { AdminModal } from "../common/AdminModal";
export function KitchenStationFormModal({
  isOpen,
  editingStation,
  isSaving,
  formData,
  formErrors,
  stationTypes,
  stationStatuses,
  onClose,
  onSubmit,
  onFieldChange,
  onPreparationTimeChange
}) {
  return <AdminModal isOpen={isOpen} title={editingStation ? "Edit Kitchen Station" : "Create Kitchen Station"} subtitle="Configure station details and preparation settings." onClose={onClose} maxWidth="max-w-xl" footer={<div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" form="kitchen-station-form" disabled={isSaving} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-60">
            {isSaving ? "Saving..." : editingStation ? "Update" : "Create"}
          </button>
        </div>}>
      <form id="kitchen-station-form" onSubmit={onSubmit}>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Station Name *</label>
            <input type="text" value={formData.name} onChange={event => onFieldChange("name", event.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors.name ? "border-red-300" : "border-gray-300"}`} required />
            {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Station Type *</label>
            <select value={formData.stationType} onChange={event => onFieldChange("stationType", event.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors.stationType ? "border-red-300" : "border-gray-300"}`} required>
              {stationTypes.map(type => <option key={type} value={type}>
                  {type}
                </option>)}
            </select>
            {formErrors.stationType && <p className="mt-1 text-sm text-red-600">{formErrors.stationType}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={formData.status} onChange={event => onFieldChange("status", event.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              {stationStatuses.map(status => <option key={status} value={status}>
                  {status}
                </option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input type="number" min="1" value={formData.capacity} onChange={event => onFieldChange("capacity", event.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors.capacity ? "border-red-300" : "border-gray-300"}`} />
            {formErrors.capacity && <p className="mt-1 text-sm text-red-600">{formErrors.capacity}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <input type="number" min="0" value={formData.displayOrder} onChange={event => onFieldChange("displayOrder", event.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors.displayOrder ? "border-red-300" : "border-gray-300"}`} />
            {formErrors.displayOrder && <p className="mt-1 text-sm text-red-600">{formErrors.displayOrder}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Color Code</label>
            <input type="color" value={formData.colorCode} onChange={event => onFieldChange("colorCode", event.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time Min</label>
            <input type="number" min="1" value={formData.preparationTimes.min} onChange={event => onPreparationTimeChange("min", event.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.min"] ? "border-red-300" : "border-gray-300"}`} />
            {formErrors["preparationTimes.min"] && <p className="mt-1 text-sm text-red-600">
                {formErrors["preparationTimes.min"]}
              </p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time Max</label>
            <input type="number" min="1" value={formData.preparationTimes.max} onChange={event => onPreparationTimeChange("max", event.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.max"] ? "border-red-300" : "border-gray-300"}`} />
            {formErrors["preparationTimes.max"] && <p className="mt-1 text-sm text-red-600">
                {formErrors["preparationTimes.max"]}
              </p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time Average</label>
            <input type="number" min="1" value={formData.preparationTimes.average} onChange={event => onPreparationTimeChange("average", event.target.value)} className={`w-full border rounded-lg px-3 py-2 ${formErrors["preparationTimes.average"] ? "border-red-300" : "border-gray-300"}`} />
            {formErrors["preparationTimes.average"] && <p className="mt-1 text-sm text-red-600">
                {formErrors["preparationTimes.average"]}
              </p>}
          </div>
        </div>
      </form>
    </AdminModal>;
}
export default KitchenStationFormModal;
