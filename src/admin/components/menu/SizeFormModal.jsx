import React from "react";
import { Loader } from "lucide-react";
import { AdminModal } from "../common/AdminModal";
export function SizeFormModal({
  isOpen,
  editingSize,
  saving,
  formData,
  errors,
  onClose,
  onSubmit,
  onFieldChange
}) {
  return <AdminModal isOpen={isOpen} title={editingSize ? "Edit Size" : "Create Size"} subtitle="Manage reusable menu sizes and codes." onClose={onClose} maxWidth="max-w-lg" footer={<div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" form="size-form" disabled={saving} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-60 flex items-center">
            {saving && <Loader className="h-4 w-4 animate-spin mr-2" />}
            {editingSize ? "Update Size" : "Create Size"}
          </button>
        </div>}>
      <form id="size-form" onSubmit={onSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Size Name *
          </label>
          <input type="text" value={formData.name} onChange={event => onFieldChange("name", event.target.value)} className={`w-full border rounded-lg px-3 py-2 ${errors.name ? "border-red-300" : "border-gray-300"}`} placeholder="e.g. Medium" />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code *
          </label>
          <input type="text" value={formData.code} onChange={event => onFieldChange("code", event.target.value.toUpperCase())} className={`w-full border rounded-lg px-3 py-2 ${errors.code ? "border-red-300" : "border-gray-300"}`} placeholder="e.g. M" />
          {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code}</p>}
        </div>

        <div className="flex items-center">
          <input type="checkbox" id="size-active" checked={formData.isActive} onChange={event => onFieldChange("isActive", event.target.checked)} className="rounded border-gray-300 text-primary-600" />
          <label htmlFor="size-active" className="ml-2 text-sm text-gray-700">
            Active Size
          </label>
        </div>
      </form>
    </AdminModal>;
}
export default SizeFormModal;
