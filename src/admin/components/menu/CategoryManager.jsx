import { logger } from "../../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowLeft, Image as ImageIcon, Tag, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { menuService } from "../../../common/services";
import kitchenStationService from "../../../common/services/kitchenStationService";
import { CategoryModal } from "./CategoryModal";
import { useAdmin } from "../../context/AdminContext";
import { AdminPageSkeleton } from "../common/AdminSkeleton";
import { buildAdminPath } from "../../../common/utils/routes";
import { useMonitoringMode } from "../../hooks/useMonitoringMode";
import { MonitoringBanner } from "../common/MonitoringBanner";
const initialFormData = {
  name: "",
  description: "",
  displayOrder: 0,
  isActive: true,
  kitchenStation: ""
};
export function CategoryManager({
  onBack
}) {
  const {
    confirmAction,
    addNotification
  } = useAdmin();
  const isMonitoringMode = useMonitoringMode();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [kitchenStations, setKitchenStations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [withStationFilter, setWithStationFilter] = useState("true");
  const activeKitchenStations = useMemo(() => kitchenStations.filter(station => station.status === "active").sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)), [kitchenStations]);
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesResponse, stationsResponse] = await Promise.all([menuService.getCategories(statusFilter === "all" ? "all" : statusFilter === "active", withStationFilter === "true"), kitchenStationService.getKitchenStations()]);
      setCategories(categoriesResponse.data || []);
      setKitchenStations(stationsResponse.data || []);
    } catch (error) {
      logger.error("Failed to load category data:", error);
      addNotification(error.response?.data?.message || "Failed to load category data.", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, withStationFilter]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      ...initialFormData,
      displayOrder: categories.length
    });
    setImageFile(null);
    setImagePreview("");
    setErrors({});
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }
    if (!formData.kitchenStation) {
      newErrors.kitchenStation = "Kitchen station is required";
    }
    if (formData.displayOrder < 0) {
      newErrors.displayOrder = "Display order must be non-negative";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };
  const handleOpenCreate = () => {
    if (isMonitoringMode) {
      return;
    }
    setEditingCategory(null);
    setFormData({
      ...initialFormData,
      displayOrder: categories.length
    });
    setImageFile(null);
    setImagePreview("");
    setErrors({});
    setShowForm(true);
  };
  const handleEditCategory = category => {
    if (isMonitoringMode) {
      return;
    }
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      displayOrder: category.displayOrder || 0,
      isActive: category.isActive,
      kitchenStation: category.kitchenStation?._id || category.kitchenStation || ""
    });
    setImageFile(null);
    setImagePreview(category.image || "");
    setErrors({});
    setShowForm(true);
  };
  const handleImageChange = event => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      addNotification("Please select a valid image file.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addNotification("Image size should be less than 5MB.", "error");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (isMonitoringMode) {
      return;
    }
    if (!validateForm()) {
      return;
    }
    try {
      setFormLoading(true);
      if (editingCategory) {
        await menuService.updateCategory(editingCategory._id, formData, imageFile);
      } else {
        await menuService.createCategory(formData, imageFile);
      }
      await loadData();
      resetForm();
      addNotification(editingCategory ? "Category updated successfully." : "Category created successfully.", "success");
    } catch (error) {
      logger.error("Failed to save category:", error);
      addNotification(error.response?.data?.message || "Failed to save category.", "error");
    } finally {
      setFormLoading(false);
    }
  };
  const handleToggleCategoryStatus = async categoryId => {
    if (isMonitoringMode) {
      return;
    }
    const category = categories.find(item => item._id === categoryId);
    const confirmed = await confirmAction({
      title: `${category?.isActive ? "Deactivate" : "Activate"} Category`,
      message: `Are you sure you want to ${category?.isActive ? "deactivate" : "activate"} this category?`,
      confirmLabel: category?.isActive ? "Deactivate" : "Activate",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }
    try {
      await menuService.toggleCategoryStatus(categoryId);
      await loadData();
      addNotification("Category status updated successfully.", "success");
    } catch (error) {
      logger.error("Failed to update category status:", error);
      addNotification(error.response?.data?.message || "Failed to update category status.", "error");
    }
  };
  const handleDeleteCategory = async categoryId => {
    if (isMonitoringMode) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete Category",
      message: "Are you sure you want to delete this category?",
      confirmLabel: "Delete",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }
    try {
      await menuService.deleteCategory(categoryId);
      await loadData();
      addNotification("Category deleted successfully.", "success");
    } catch (error) {
      logger.error("Failed to delete category:", error);
      addNotification(error.response?.data?.message || "Failed to delete category.", "error");
    }
  };
  if (loading && categories.length === 0) {
    return <AdminPageSkeleton stats={4} filters={2} cards={6} cardHeight="h-40" />;
  }
  return <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Category Management
          </h1>
          <p className="text-gray-600">
            Manage categories and map them to kitchen stations.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onBack || (() => navigate(buildAdminPath("/menu/items")))} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Menu</span>
          </button>
          {!isMonitoringMode && <button onClick={handleOpenCreate} className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </button>}
        </div>
      </div>

      {isMonitoringMode && <MonitoringBanner message="Categories are visible in monitoring mode, but create, edit, delete, and activate/deactivate actions are disabled." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg border border-gray-200 p-4">
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <select value={withStationFilter} onChange={e => setWithStationFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="true">With Station</option>
          <option value="false">Without Station</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {categories.map(category => <div key={category._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-36 bg-gray-100 relative">
              {category.image ? <img src={category.image} alt={category.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                </div>}
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {category.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {category.name}
              </h2>
              {category.description && <p className="text-sm text-gray-600 line-clamp-2">
                  {category.description}
                </p>}
              <p className="text-sm text-gray-500">
                Station: {category.kitchenStation?.name || "Unassigned"}
              </p>
              <p className="text-sm text-gray-500">
                Display Order: {category.displayOrder || 0}
              </p>

              {!isMonitoringMode && <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between">
                  <button onClick={() => handleEditCategory(category)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button onClick={() => handleToggleCategoryStatus(category._id)} className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700">
                    {category.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {category.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => handleDeleteCategory(category._id)} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>}
            </div>
          </div>)}
      </div>

      {categories.length === 0 && <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No categories found
          </h3>
          <p className="text-gray-600 mb-4">
            Try clearing the filters or create a new category.
          </p>
          {!isMonitoringMode && <button onClick={handleOpenCreate} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
              Create Category
            </button>}
        </div>}

      {!isMonitoringMode && <CategoryModal isOpen={showForm} editingCategory={editingCategory} formData={formData} errors={errors} imagePreview={imagePreview} activeKitchenStations={activeKitchenStations} formLoading={formLoading} onClose={resetForm} onSubmit={handleSubmit} onFieldChange={handleFieldChange} onImageChange={handleImageChange} onRemoveImage={removeImage} />}
    </div>;
}
