import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Plus, RefreshCw, Search, Pencil, Trash2, ArrowUpCircle, AlertTriangle, PackageX, PackageCheck, UtensilsCrossed, Upload, Download } from "lucide-react";
import { inventoryService, menuService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import AdminPagination from "../components/common/AdminPagination";
import { AdminListSkeleton } from "../components/common/AdminSkeleton";
import ResponsiveFilterSection from "../components/common/ResponsiveFilterSection";
import { INVENTORY_ADJUSTMENT_DEFAULTS, INVENTORY_ADJUSTMENT_OPTIONS, INVENTORY_FORM_DEFAULTS, INVENTORY_PAGE_SIZE, INVENTORY_STATUS_OPTIONS, INVENTORY_UNIT_OPTIONS, formatInventoryUnitLabel, normalizeInventoryRelations, normalizeInventoryUnitValue } from "../../common/utils/inventory";
import InventoryStatusBadge from "../components/InventoryStatusBadge.jsx";
import { useNavigate } from "react-router-dom";
import { buildAdminPath } from "../../common/utils/routes";
import { saveInventoryBulkUploadResult } from "../utils/inventoryUploadResults";

const renderMenuLinks = (item) => {
  const relatedItems = item?.relatedMenuItems || [];

  if (!relatedItems.length) {
    return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
        No menu links
      </span>;
  }

  return <div className="flex flex-wrap gap-2">
      {relatedItems.slice(0, 2).map(relation => <span key={`${item._id}-availability-${relation.menuItem?._id || relation.menuItem}`} className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${relation.menuItem?.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {relation.menuItem?.name}: {relation.menuItem?.isAvailable ? "Available" : "Hidden"}
        </span>)}
    </div>;
};
export function InventoryManagement() {
  const navigate = useNavigate();
  const {
    confirmAction,
    addNotification
  } = useAdmin();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    category: "all"
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [formState, setFormState] = useState(INVENTORY_FORM_DEFAULTS);
  const [adjustmentState, setAdjustmentState] = useState(INVENTORY_ADJUSTMENT_DEFAULTS);
  const [bulkFile, setBulkFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const [inventoryResponse, categoryResponse, menuResponse] = await Promise.all([inventoryService.getInventoryItems({
        page: currentPage,
        limit: INVENTORY_PAGE_SIZE,
        search: filters.search.trim() || undefined,
        status: filters.status,
        category: filters.category !== "all" ? filters.category : undefined
      }), menuService.getCategories(true, true), menuService.getMenuItems({
        activeOnly: true,
        availableOnly: false,
        limit: 200
      })]);
      setInventoryItems(inventoryResponse.data || []);
      setStats(inventoryResponse.stats || null);
      setPagination({
        page: inventoryResponse.pagination?.page || currentPage,
        pages: inventoryResponse.pagination?.pages || 1,
        total: inventoryResponse.pagination?.total || 0
      });
      setCategories(categoryResponse.data || []);
      setMenuItems(menuResponse.data || []);
    } catch (error) {
      logger.error("Failed to load inventory:", error);
      addNotification(error.response?.data?.message || "Failed to load inventory.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters.category, filters.search, filters.status]);
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status, filters.category]);
  const openCreateForm = () => {
    setEditingItem(null);
    setFormState(INVENTORY_FORM_DEFAULTS);
    setIsFormOpen(true);
  };
  const openEditForm = item => {
    setEditingItem(item);
    setFormState({
      ingredientName: item.ingredientName || "",
      sku: item.sku || "",
      unit: normalizeInventoryUnitValue(item.unit),
      currentStock: item.currentStock ?? "",
      minimumStock: item.minimumStock ?? "",
      reorderQuantity: item.reorderQuantity ?? "",
      notes: item.notes || "",
      isActive: item.isActive ?? true,
      relatedMenuItems: normalizeInventoryRelations(item.relatedMenuItems)
    });
    setIsFormOpen(true);
  };
  const openAdjustmentForm = item => {
    setActiveItem(item);
    setAdjustmentState(INVENTORY_ADJUSTMENT_DEFAULTS);
    setIsAdjustOpen(true);
  };
  const closeBulkUploadModal = () => {
    setIsBulkUploadOpen(false);
    setBulkFile(null);
  };
  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = `${import.meta.env.BASE_URL || "/"}inventory-bulk-upload-100-items.csv`;
    link.download = "inventory-bulk-upload-100-items.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...formState,
        unit: normalizeInventoryUnitValue(formState.unit),
        currentStock: Number(formState.currentStock || 0),
        minimumStock: Number(formState.minimumStock || 0),
        reorderQuantity: Number(formState.reorderQuantity || 0),
        relatedMenuItems: (formState.relatedMenuItems || []).map(relation => ({
          ...relation,
          quantityRequired: Number(relation.quantityRequired || 0)
        }))
      };
      if (editingItem) {
        await inventoryService.updateInventoryItem(editingItem._id, payload);
      } else {
        await inventoryService.createInventoryItem(payload);
      }
      setIsFormOpen(false);
      setEditingItem(null);
      await loadInventory();
      addNotification(editingItem ? "Inventory item updated successfully." : "Inventory item created successfully.", "success");
    } catch (error) {
      logger.error("Failed to save inventory item:", error);
      addNotification(error.response?.data?.message || "Failed to save inventory item.", "error");
    } finally {
      setSaving(false);
    }
  };
  const handleAdjustment = async () => {
    if (!activeItem) {
      return;
    }
    try {
      setSaving(true);
      await inventoryService.adjustInventoryStock(activeItem._id, {
        ...adjustmentState,
        quantity: Number(adjustmentState.quantity || 0)
      });
      setIsAdjustOpen(false);
      setActiveItem(null);
      await loadInventory();
      addNotification("Inventory adjusted successfully.", "success");
    } catch (error) {
      logger.error("Failed to adjust inventory:", error);
      addNotification(error.response?.data?.message || "Failed to adjust inventory.", "error");
    } finally {
      setSaving(false);
    }
  };
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      addNotification("Choose a CSV file to upload inventory data.", "error");
      return;
    }
    try {
      setBulkUploading(true);
      const response = await inventoryService.bulkUploadInventory(bulkFile);
      const uploadStats = response?.data || {};
      const uploadResultPayload = {
        ...uploadStats,
        sourceFileName: bulkFile.name || uploadStats.fileName || "inventory-upload.csv"
      };
      saveInventoryBulkUploadResult(uploadResultPayload);
      closeBulkUploadModal();
      await loadInventory();
      addNotification(`Bulk upload completed. Created ${uploadStats.created || 0}, updated ${uploadStats.updated || 0}, failed ${uploadStats.failed || 0}.`, uploadStats.failed ? "warning" : "success");
      navigate(buildAdminPath("/inventory/upload-results"), {
        state: {
          uploadResult: uploadResultPayload
        }
      });
    } catch (error) {
      logger.error("Failed to bulk upload inventory:", error);
      addNotification(error.response?.data?.message || "Failed to bulk upload inventory.", "error");
    } finally {
      setBulkUploading(false);
    }
  };
  const handleDelete = async item => {
    const confirmed = await confirmAction({
      title: "Delete Ingredient Inventory",
      message: `Delete inventory tracking for ${item.ingredientName || "this ingredient"}?`,
      confirmLabel: "Delete",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }
    try {
      await inventoryService.deleteInventoryItem(item._id);
      await loadInventory();
      addNotification("Inventory item deleted successfully.", "success");
    } catch (error) {
      logger.error("Failed to delete inventory item:", error);
      addNotification(error.response?.data?.message || "Failed to delete inventory item.", "error");
    }
  };
  const renderStatsCard = (title, value, Icon, tintClass) => <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${tintClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>;
  const toggleRelation = (menuItemId, enabled) => {
    setFormState(current => {
      const currentRelations = Array.isArray(current.relatedMenuItems) ? current.relatedMenuItems : [];
      if (!enabled) {
        return {
          ...current,
          relatedMenuItems: currentRelations.filter(relation => relation.menuItem !== menuItemId)
        };
      }
      if (currentRelations.some(relation => relation.menuItem === menuItemId)) {
        return current;
      }
      return {
        ...current,
        relatedMenuItems: [...currentRelations, {
          menuItem: menuItemId,
          quantityRequired: ""
        }]
      };
    });
  };
  const updateRelationQuantity = (menuItemId, quantityRequired) => {
    setFormState(current => ({
      ...current,
      relatedMenuItems: current.relatedMenuItems.map(relation => relation.menuItem === menuItemId ? {
        ...relation,
        quantityRequired: Math.max(Number(quantityRequired || 0), 0)
      } : relation)
    }));
  };
  const selectedRelationIds = useMemo(() => new Set(formState.relatedMenuItems.map(relation => relation.menuItem)), [formState.relatedMenuItems]);
  return <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">
            Track ingredient stock levels and connect them to the menu items that use them.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadInventory} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button type="button" onClick={handleDownloadTemplate} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
            <Download className="h-4 w-4" />
            CSV Template
          </button>
          <button type="button" onClick={() => setIsBulkUploadOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-primary-700 transition-colors hover:bg-primary-100 sm:w-auto">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </button>
          <button type="button" onClick={openCreateForm} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Ingredient
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {renderStatsCard("Tracked Items", stats?.totalItems || 0, Boxes, "bg-blue-50 text-blue-600")}
        {renderStatsCard("In Stock", stats?.inStock || 0, PackageCheck, "bg-emerald-50 text-emerald-600")}
        {renderStatsCard("Low Stock", stats?.lowStock || 0, AlertTriangle, "bg-sky-50 text-sky-600")}
        {renderStatsCard("Out of Stock", stats?.outOfStock || 0, PackageX, "bg-rose-50 text-rose-600")}
      </div>

      <ResponsiveFilterSection title="Inventory Filters">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={filters.search} onChange={event => setFilters(current => ({
          ...current,
          search: event.target.value
        }))} placeholder="Search by ingredient name or SKU" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4" />
          </div>
          <select value={filters.status} onChange={event => setFilters(current => ({
        ...current,
        status: event.target.value
      }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            {INVENTORY_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>
              {option.label}
            </option>)}
          </select>
          <select value={filters.category} onChange={event => setFilters(current => ({
        ...current,
        category: event.target.value
      }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="all">All Categories</option>
            {categories.map(category => <option key={category._id} value={category._id}>
              {category.name}
            </option>)}
          </select>
        </div>
      </ResponsiveFilterSection>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Upload inventory in CSV format with supported units only: kg, pieces, gram, milligram, liter, and ton.
      </div>

      {loading ? <AdminListSkeleton rows={6} /> : inventoryItems.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <Boxes className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">No ingredient inventory yet</h3>
          <p className="mt-1 text-gray-600">
            Add ingredients and link them to menu items to control menu availability.
          </p>
        </div> : <>
          <div className="space-y-4 md:hidden">
            {inventoryItems.map(item => <div key={item._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.ingredientName}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      SKU: {item.sku || "Not set"} • Unit: {formatInventoryUnitLabel(item.unit)}
                    </p>
                  </div>
                  <InventoryStatusBadge status={item.stockStatus} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Stock</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {item.currentStock} {formatInventoryUnitLabel(item.unit)}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Reorder at {item.reorderQuantity} {formatInventoryUnitLabel(item.unit)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Minimum Threshold</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {item.minimumStock} {formatInventoryUnitLabel(item.unit)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Related Menu Items</p>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {(item.relatedMenuItems || []).length > 0 ? item.relatedMenuItems.slice(0, 3).map(relation => <p key={`${item._id}-${relation.menuItem?._id || relation.menuItem}`}>
                          {relation.menuItem?.name || "Unknown item"} • {relation.quantityRequired} {formatInventoryUnitLabel(item.unit)}
                        </p>) : <p>No linked menu items</p>}
                    {(item.relatedMenuItems || []).length > 3 ? <p className="text-xs text-gray-400">+{item.relatedMenuItems.length - 3} more</p> : null}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Availability Impact</p>
                  <div className="mt-2">
                    {renderMenuLinks(item)}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => openAdjustmentForm(item)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    Adjust
                  </button>
                  <button type="button" onClick={() => openEditForm(item)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(item)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50">
                    Delete
                  </button>
                </div>
              </div>)}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-[220px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Ingredient
                    </th>
                    <th className="w-[260px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Related Menu Items
                    </th>
                    <th className="w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Stock
                    </th>
                    <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Threshold
                    </th>
                    <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="w-[230px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Availability Impact
                    </th>
                    <th className="w-[150px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {inventoryItems.map(item => <tr key={item._id}>
                      <td className="px-4 py-4 align-top">
                        <div>
                          <p className="font-medium text-gray-900">{item.ingredientName}</p>
                          <p className="text-sm text-gray-500">
                            SKU: {item.sku || "Not set"} • Unit: {formatInventoryUnitLabel(item.unit)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-gray-600">
                        <div className="space-y-1 break-words">
                          {(item.relatedMenuItems || []).length > 0 ? item.relatedMenuItems.slice(0, 3).map(relation => <p key={`${item._id}-${relation.menuItem?._id || relation.menuItem}`}>
                                {relation.menuItem?.name || "Unknown item"} • {relation.quantityRequired} {formatInventoryUnitLabel(item.unit)}
                              </p>) : <p>No linked menu items</p>}
                          {(item.relatedMenuItems || []).length > 3 ? <p className="text-xs text-gray-400">
                              +{item.relatedMenuItems.length - 3} more
                            </p> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-gray-900">
                          {item.currentStock} {formatInventoryUnitLabel(item.unit)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Reorder at {item.reorderQuantity} {formatInventoryUnitLabel(item.unit)}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-gray-600">
                        Min {item.minimumStock} {formatInventoryUnitLabel(item.unit)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <InventoryStatusBadge status={item.stockStatus} />
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        {renderMenuLinks(item)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openAdjustmentForm(item)} className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:bg-gray-50" title="Adjust stock">
                            <ArrowUpCircle className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openEditForm(item)} className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:bg-gray-50" title="Edit inventory">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(item)} className="rounded-lg border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50" title="Delete inventory">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <AdminPagination page={pagination.page} totalPages={pagination.pages} totalItems={pagination.total} pageSize={INVENTORY_PAGE_SIZE} onPageChange={setCurrentPage} />
        </>}

      <AdminModal isOpen={isFormOpen} title={editingItem ? "Edit Ingredient Inventory" : "Add Ingredient Inventory"} subtitle="Link each ingredient to the menu items that depend on it." onClose={() => {
      setIsFormOpen(false);
      setEditingItem(null);
    }} footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setIsFormOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 sm:w-auto">
              Cancel
            </button>
            <button type="button" disabled={saving || !formState.ingredientName.trim()} onClick={handleSave} className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto">
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </button>
          </div>}>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Ingredient Name</span>
            <input type="text" value={formState.ingredientName} onChange={event => setFormState(current => ({
            ...current,
            ingredientName: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Tomato, Cheese, Chicken Breast..." />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">SKU</span>
            <input type="text" value={formState.sku} onChange={event => setFormState(current => ({
            ...current,
            sku: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Optional stock code" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Unit</span>
            <select value={normalizeInventoryUnitValue(formState.unit)} onChange={event => setFormState(current => ({
            ...current,
            unit: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              {INVENTORY_UNIT_OPTIONS.map(option => <option key={option.value} value={option.value}>
                  {option.label}
                </option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Current Stock</span>
            <input type="number" min="0" step="0.01" value={formState.currentStock} onChange={event => setFormState(current => ({
            ...current,
            currentStock: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Minimum Stock</span>
            <input type="number" min="0" step="0.01" value={formState.minimumStock} onChange={event => setFormState(current => ({
            ...current,
            minimumStock: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Reorder Quantity</span>
            <input type="number" min="0" step="0.01" value={formState.reorderQuantity} onChange={event => setFormState(current => ({
            ...current,
            reorderQuantity: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Notes</span>
            <textarea value={formState.notes} onChange={event => setFormState(current => ({
            ...current,
            notes: event.target.value
          }))} rows="3" className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Supplier, shelf, or stock handling notes" />
          </label>
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Related Menu Items</span>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {menuItems.map(menuItem => {
              const selected = selectedRelationIds.has(menuItem._id);
              const relation = formState.relatedMenuItems.find(entry => entry.menuItem === menuItem._id);
              return <div key={menuItem._id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <label className="flex items-center gap-3">
                        <input type="checkbox" checked={selected} onChange={event => toggleRelation(menuItem._id, event.target.checked)} />
                        <div>
                          <p className="font-medium text-gray-900">{menuItem.name}</p>
                          <p className="text-sm text-gray-500">
                            {menuItem.category?.name || "Uncategorized"}
                          </p>
                        </div>
                      </label>
                      {selected ? <label className="space-y-1">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Required Qty
                          </span>
                          <input type="number" min="0" step="0.01" value={relation?.quantityRequired ?? ""} onChange={event => updateRelationQuantity(menuItem._id, event.target.value)} className="w-28 rounded-lg border border-gray-300 px-3 py-2" />
                        </label> : null}
                    </div>
                  </div>;
            })}
            </div>
          </div>
          <label className="flex items-center gap-3 md:col-span-2">
            <input type="checkbox" checked={formState.isActive} onChange={event => setFormState(current => ({
            ...current,
            isActive: event.target.checked
          }))} />
            <span className="text-sm font-medium text-gray-700">
              Keep this inventory record active
            </span>
          </label>
        </div>
      </AdminModal>

      <AdminModal isOpen={isBulkUploadOpen} title="Bulk Upload Inventory" subtitle="Upload a CSV file to create new ingredients or update existing items by SKU or ingredient name." onClose={closeBulkUploadModal} maxWidth="max-w-2xl" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeBulkUploadModal} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 sm:w-auto">
              Cancel
            </button>
            <button type="button" onClick={handleBulkUpload} disabled={bulkUploading || !bulkFile} className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto">
              {bulkUploading ? "Uploading..." : "Upload CSV"}
            </button>
          </div>}>
        <div className="space-y-5 p-5">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Supported units</p>
            <p className="mt-1">kg, pieces, gram, milligram, liter, ton</p>
            <p className="mt-3 font-semibold text-slate-900">Required columns</p>
            <p className="mt-1">ingredientName, unit, currentStock, minimumStock, reorderQuantity</p>
            <p className="mt-3 text-slate-500">Optional columns: sku, notes. Existing rows update automatically when SKU or ingredient name already exists.</p>
            <p className="mt-3 text-slate-500">After upload, you will be redirected to a results page that lists successful rows, failed rows, and the failure reason for each rejected record.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleDownloadTemplate} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Download 100-Item Sample CSV
            </button>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-700">CSV File</span>
            <input type="file" accept=".csv,text/csv" onChange={event => setBulkFile(event.target.files?.[0] || null)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-primary-700" />
          </label>

          {bulkFile ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Ready to upload: {bulkFile.name}
            </div> : null}
        </div>
      </AdminModal>

      <AdminModal isOpen={isAdjustOpen} title="Adjust Stock" subtitle={activeItem?.ingredientName ? `Update stock for ${activeItem.ingredientName}` : "Update stock quantity"} onClose={() => {
      setIsAdjustOpen(false);
      setActiveItem(null);
    }} maxWidth="max-w-2xl" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setIsAdjustOpen(false)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 sm:w-auto">
              Cancel
            </button>
            <button type="button" disabled={saving || !adjustmentState.quantity} onClick={handleAdjustment} className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto">
              {saving ? "Updating..." : "Apply"}
            </button>
          </div>}>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Adjustment Type</span>
            <select value={adjustmentState.adjustmentType} onChange={event => setAdjustmentState(current => ({
            ...current,
            adjustmentType: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              {INVENTORY_ADJUSTMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>
                  {option.label}
                </option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Quantity</span>
            <input type="number" min="0.01" step="0.01" value={adjustmentState.quantity} onChange={event => setAdjustmentState(current => ({
            ...current,
            quantity: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Notes</span>
            <textarea rows="3" value={adjustmentState.notes} onChange={event => setAdjustmentState(current => ({
            ...current,
            notes: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Reason for the stock movement" />
          </label>
        </div>
      </AdminModal>
    </div>;
}
