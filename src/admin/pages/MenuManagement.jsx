import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Package, Tag, Loader, Ruler, Percent, CalendarRange, LineChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { ItemForm } from "../components/menu/ItemForm";
import AdminPagination from "../components/common/AdminPagination";
import { AdminPageSkeleton } from "../components/common/AdminSkeleton";
import { menuService } from "../../common/services";
import { buildAdminPath } from "../../common/utils/routes";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { MonitoringBanner } from "../components/common/MonitoringBanner";

const renderPriceList = (item) => {
  const prices = item?.prices || [];

  if (!prices.length) {
    return "-";
  }

  return <div className="space-y-1">
      {prices.map((priceRow, idx) => <div key={`${item._id}-price-${idx}`} className="text-sm">
          {priceRow.size?.name || "Size"}: ₹{Number(priceRow.price || 0).toFixed(2)}
        </div>)}
    </div>;
};
export function MenuManagement() {
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const {
    menuItems,
    dispatch,
    confirmAction,
    addNotification
  } = useAdmin();
  const isMonitoringMode = useMonitoringMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [stats, setStats] = useState({
    totalItems: 0,
    availableItems: 0,
    unavailableItems: 0,
    categoriesCount: 0
  });
  const loadMenuData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsResponse, categoriesResponse, statsResponse, sizesResponse] = await Promise.all([menuService.getMenuItems({
        activeOnly: true,
        availableOnly: false,
        page: currentPage,
        limit: PAGE_SIZE,
        query: searchTerm.trim() || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        isAvailable: availabilityFilter === "all" ? undefined : availabilityFilter === "available"
      }), menuService.getCategories(true, true), menuService.getMenuStatistics(), menuService.getSizes(true)]);
      dispatch({
        type: "SET_MENU_ITEMS",
        payload: itemsResponse.data || []
      });
      setPagination({
        page: itemsResponse.pagination?.page || currentPage,
        pages: itemsResponse.pagination?.pages || 1,
        total: itemsResponse.total || 0
      });
      setCategories(categoriesResponse.data || []);
      setSizes(sizesResponse.data || []);
      setStats(statsResponse.data || {});
    } catch (error) {
      logger.error("Failed to load menu data:", error);
      addNotification(error.response?.data?.message || "Failed to load menu data.", "error");
    } finally {
      setLoading(false);
    }
  }, [availabilityFilter, currentPage, dispatch, searchTerm, selectedCategory]);
  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [availabilityFilter, searchTerm, selectedCategory]);
  const handleAddItem = () => {
    if (isMonitoringMode) {
      return;
    }
    setEditingItem(null);
    setShowItemForm(true);
  };
  const handleEditItem = item => {
    if (isMonitoringMode) {
      return;
    }
    setEditingItem(item);
    setShowItemForm(true);
  };
  const handleDeleteItem = async itemId => {
    if (isMonitoringMode) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete Menu Item",
      message: "Are you sure you want to delete this menu item?",
      confirmLabel: "Delete",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }
    try {
      await menuService.deleteMenuItem(itemId);
      await loadMenuData();
      addNotification("Menu item deleted successfully.", "success");
    } catch (error) {
      logger.error("Failed to delete menu item:", error);
      addNotification(error.response?.data?.message || "Failed to delete menu item.", "error");
    }
  };
  const handleToggleAvailability = async itemId => {
    if (isMonitoringMode) {
      return;
    }
    const item = menuItems.find(menuItem => menuItem._id === itemId);
    const confirmed = await confirmAction({
      title: `${item?.isAvailable ? "Deactivate" : "Activate"} Menu Item`,
      message: `Are you sure you want to ${item?.isAvailable ? "deactivate" : "activate"} this menu item?`,
      confirmLabel: item?.isAvailable ? "Deactivate" : "Activate",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }
    try {
      await menuService.toggleMenuItemAvailability(itemId);
      await loadMenuData();
      addNotification(item?.isAvailable ? "Menu item deactivated successfully." : "Menu item activated successfully.", "success");
    } catch (error) {
      logger.error("Failed to update availability:", error);
      addNotification(error.response?.data?.message || "Failed to update availability.", "error");
    }
  };
  const handleSaveItem = async (itemData, imageFile) => {
    if (isMonitoringMode) {
      return;
    }
    try {
      if (editingItem) {
        await menuService.updateMenuItem(editingItem._id, itemData, imageFile);
      } else {
        await menuService.createMenuItem(itemData, imageFile);
      }
      setShowItemForm(false);
      setEditingItem(null);
      await loadMenuData();
      addNotification(editingItem ? "Menu item updated successfully." : "Menu item created successfully.", "success");
    } catch (error) {
      logger.error("Failed to save menu item:", error);
      addNotification(error.response?.data?.message || "Failed to save menu item.", "error");
    }
  };
  const handleExportMenu = async () => {
    try {
      await menuService.exportMenuItems({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        availableOnly: availabilityFilter === "available"
      });
      addNotification("Menu exported successfully.", "success");
    } catch (error) {
      logger.error("Export failed:", error);
      addNotification(error.response?.data?.message || "Failed to export menu.", "error");
    }
  };
  const handleImportMenu = async file => {
    try {
      const response = await menuService.importMenuItems(file);
      if (response.success) {
        await loadMenuData();
        addNotification("Menu import completed successfully.", "success");
      }
    } catch (error) {
      logger.error("Import failed:", error);
      addNotification(error.response?.data?.message || "Failed to import menu.", "error");
    }
  };
  if (loading) {
    return <AdminPageSkeleton stats={4} filters={4} cards={6} cardHeight="h-48" />;
  }
  return <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600">
            Manage your catalog, pricing, and item availability from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate(buildAdminPath("/menu/categories"))} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
            <Tag className="h-4 w-4" />
            <span>Categories</span>
          </button>
          <button onClick={() => navigate(buildAdminPath("/menu/discounts"))} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
            <Percent className="h-4 w-4" />
            <span>Discounts</span>
          </button>
          <button onClick={() => navigate(buildAdminPath("/menu/sizes"))} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
            <Ruler className="h-4 w-4" />
            <span>Sizes</span>
          </button>
          <button onClick={() => navigate(buildAdminPath("/menu/seasonal"))} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
            <CalendarRange className="h-4 w-4" />
            <span>Seasonal</span>
          </button>
          <button onClick={() => navigate(buildAdminPath("/menu/prices"))} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
            <LineChart className="h-4 w-4" />
            <span>Price History</span>
          </button>
          {!isMonitoringMode && <button onClick={handleAddItem} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 sm:w-auto">
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>}
        </div>
      </div>

      {isMonitoringMode && <MonitoringBanner message="Menu data stays visible in monitoring mode, but item creation, edits, deletes, imports, and availability changes are disabled." />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalItems || menuItems.length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.availableItems || menuItems.filter(item => item.isAvailable).length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.unavailableItems || menuItems.filter(item => !item.isAvailable).length}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <EyeOff className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.categoriesCount || categories.length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Tag className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input type="text" placeholder="Search menu items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-primary-500" />
          </div>

          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500">
            <option value="all">All Categories</option>
            {categories.map(category => <option key={category._id} value={category._id}>
                {category.name}
              </option>)}
          </select>

          <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500">
            <option value="all">All Items</option>
            <option value="available">Available</option>
            <option value="unavailable">Out of Stock</option>
          </select>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button onClick={handleExportMenu} className="flex-1 rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50">
              Export
            </button>
            {!isMonitoringMode && <label className="flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2 text-center hover:bg-gray-50">
                Import
                <input type="file" accept=".csv" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportMenu(file);
                  e.target.value = "";
                }
              }} />
              </label>}
          </div>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {menuItems.map(item => <div key={item._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-200">
                {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-gray-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {item.name}
                  </h3>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {item.isAvailable ? "Available" : "Out of Stock"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {item.category?.name || "Uncategorized"}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                  {item.description || "No description"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Prices
              </p>
              <div className="mt-2 text-gray-700">
                {renderPriceList(item)}
              </div>
            </div>

            {!isMonitoringMode ? <div className="mt-4 grid grid-cols-3 gap-2">
                <button onClick={() => handleToggleAvailability(item._id)} className="rounded-xl border border-orange-200 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50" title={item.isAvailable ? "Mark unavailable" : "Mark available"}>
                  {item.isAvailable ? "Hide" : "Show"}
                </button>
                <button onClick={() => handleEditItem(item)} className="rounded-xl border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50" title="Edit item">
                  Edit
                </button>
                <button onClick={() => handleDeleteItem(item._id)} className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" title="Delete item">
                  Delete
                </button>
              </div> : null}
          </div>)}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Item</th>
                <th className="text-left p-4 font-semibold text-gray-900">Category</th>
                <th className="text-left p-4 font-semibold text-gray-900">Prices</th>
                <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                <th className="text-right p-4 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map(item => <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <Package className="h-6 w-6 text-gray-400" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{item.category?.name || "-"}</td>
                  <td className="p-4 text-gray-700">{renderPriceList(item)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {item.isAvailable ? "Available" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="p-4">
                    {!isMonitoringMode && <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleToggleAvailability(item._id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title={item.isAvailable ? "Mark unavailable" : "Mark available"}>
                          {item.isAvailable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleEditItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit item">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteItem(item._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete item">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination page={pagination.page} totalPages={pagination.pages} totalItems={pagination.total} pageSize={PAGE_SIZE} itemLabel="menu items" onPageChange={setCurrentPage} />

      {menuItems.length === 0 && <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600">Try changing filters or add a new menu item.</p>
        </div>}

      {!isMonitoringMode && showItemForm && <ItemForm item={editingItem} onSave={handleSaveItem} onCancel={() => {
      setShowItemForm(false);
      setEditingItem(null);
    }} categories={categories} sizes={sizes} />}
    </div>;
}
