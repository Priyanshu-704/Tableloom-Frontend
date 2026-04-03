import React from "react";
import { Loader, X } from "lucide-react";
import { AdminModal } from "../common/AdminModal";
export function CategoryModal({
  isOpen,
  editingCategory,
  formData,
  errors,
  imagePreview,
  activeKitchenStations,
  formLoading,
  onClose,
  onSubmit,
  onFieldChange,
  onImageChange,
  onRemoveImage
}) {
  if (!isOpen) {
    return null;
  }
  return <AdminModal isOpen={isOpen} title={editingCategory ? "Edit Category" : "Create Category"} subtitle="Manage category details and kitchen station mapping." onClose={onClose} maxWidth="max-w-xl" footer={<div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" form="category-form" disabled={formLoading} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-60 flex items-center">
            {formLoading && <Loader className="h-4 w-4 animate-spin mr-2" />}
            {editingCategory ? "Update Category" : "Create Category"}
          </button>
        </div>}>
      <form id="category-form" onSubmit={onSubmit}>
        <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name *
              </label>
              <input type="text" value={formData.name} onChange={e => onFieldChange("name", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${errors.name ? "border-red-300" : "border-gray-300"}`} placeholder="Enter category name" />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kitchen Station *
              </label>
              <select value={formData.kitchenStation} onChange={e => onFieldChange("kitchenStation", e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${errors.kitchenStation ? "border-red-300" : "border-gray-300"}`}>
                <option value="">Select kitchen station</option>
                {activeKitchenStations.map(station => <option key={station._id} value={station._id}>
                    {station.name} ({station.stationType})
                  </option>)}
              </select>
              {errors.kitchenStation && <p className="text-red-600 text-sm mt-1">
                  {errors.kitchenStation}
                </p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea value={formData.description} onChange={e => onFieldChange("description", e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Enter category description" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input type="number" min="0" value={formData.displayOrder} onChange={e => onFieldChange("displayOrder", e.target.value === "" ? "" : parseInt(e.target.value, 10))} className={`w-full border rounded-lg px-3 py-2 ${errors.displayOrder ? "border-red-300" : "border-gray-300"}`} placeholder="e.g. 1" />
              {errors.displayOrder && <p className="text-red-600 text-sm mt-1">
                  {errors.displayOrder}
                </p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Image
              </label>
              {imagePreview && <div className="mb-3 relative inline-block">
                  <img src={imagePreview} alt="Category preview" className="h-28 w-28 object-cover rounded-lg border border-gray-300" />
                  <button type="button" onClick={onRemoveImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>}
              <input type="file" accept="image/*" onChange={onImageChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>

            <div className="flex items-center">
              <input type="checkbox" id="category-active" checked={formData.isActive} onChange={e => onFieldChange("isActive", e.target.checked)} className="rounded border-gray-300 text-primary-600" />
              <label htmlFor="category-active" className="ml-2 text-sm text-gray-700">
                Active Category
              </label>
            </div>
        </div>
      </form>
    </AdminModal>;
}
