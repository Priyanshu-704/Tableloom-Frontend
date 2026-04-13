import { logger } from "../../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  LineChart,
  Ruler,
  Tags,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { menuService } from "../../../common/services";
import { useAdmin } from "../../context/AdminContext";
import { ItemForm } from "./ItemForm";
import { AdminPageSkeleton } from "../common/AdminSkeleton";
import { AdminModal } from "../common/AdminModal";
import { buildAdminPath } from "../../../common/utils/routes";
import { useSettings } from "../../../common/context/SettingsContext";
import { useMonitoringMode } from "../../hooks/useMonitoringMode";
const FILTER_OPTIONS = [
  {
    value: "all",
    label: "All Items",
  },
  {
    value: "seasonal",
    label: "Seasonal Only",
  },
  {
    value: "active",
    label: "Active Now",
  },
  {
    value: "inactive",
    label: "Inactive Seasonals",
  },
];
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "Not set";
const getPrimaryPrice = (item) => {
  const firstPrice = item?.prices?.[0];
  return firstPrice?.price ?? 0;
};
export function SeasonalMenu() {
  const navigate = useNavigate();
  const isMonitoringMode = useMonitoringMode();
  const { settings } = useSettings();
  const { addNotification } = useAdmin();
  const currency = settings?.taxSettings?.currency || "INR";
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [filter, setFilter] = useState("seasonal");
  const [loading, setLoading] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [savingId, setSavingId] = useState("");
  const [seasonalModal, setSeasonalModal] = useState({
    isOpen: false,
    item: null,
    seasonName: "",
    startDate: "",
    endDate: "",
  });
  const loadSeasonalData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsResponse, categoriesResponse, sizesResponse] =
        await Promise.all([
          menuService.getMenuItems({
            activeOnly: false,
            availableOnly: false,
            limit: 500,
          }),
          menuService.getCategories(true, true),
          menuService.getSizes(true),
        ]);
      setItems(itemsResponse?.data || []);
      setCategories(categoriesResponse?.data || []);
      setSizes(sizesResponse?.data || []);
    } catch (error) {
      logger.error("Failed to load seasonal menu data:", error);
      addNotification(
        error.response?.data?.message || "Failed to load seasonal menu.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadSeasonalData();
  }, [loadSeasonalData]);
  const seasonalStats = useMemo(() => {
    const seasonalItems = items.filter((item) => item?.seasonal?.isSeasonal);
    const activeSeasonals = seasonalItems.filter((item) =>
      menuService.isItemSeasonal(item.seasonal),
    );
    return {
      total: items.length,
      seasonal: seasonalItems.length,
      active: activeSeasonals.length,
      inactive: seasonalItems.length - activeSeasonals.length,
    };
  }, [items]);
  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return items;
    }
    if (filter === "seasonal") {
      return items.filter((item) => item?.seasonal?.isSeasonal);
    }
    if (filter === "active") {
      return items.filter((item) => menuService.isItemSeasonal(item?.seasonal));
    }
    if (filter === "inactive") {
      return items.filter(
        (item) =>
          item?.seasonal?.isSeasonal &&
          !menuService.isItemSeasonal(item?.seasonal),
      );
    }
    return items;
  }, [filter, items]);
  const openCreateForm = () => {
    if (isMonitoringMode) {
      addNotification(
        "Seasonal menu is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    setEditingItem({
      seasonal: {
        isSeasonal: true,
        startDate: "",
        endDate: "",
        seasonName: "",
      },
    });
    setShowItemForm(true);
  };
  const handleSaveItem = async (itemData, imageFile) => {
    if (isMonitoringMode) {
      addNotification(
        "Seasonal menu is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    try {
      if (editingItem?._id) {
        await menuService.updateMenuItem(editingItem._id, itemData, imageFile);
      } else {
        await menuService.createMenuItem(itemData, imageFile);
      }
      setShowItemForm(false);
      setEditingItem(null);
      await loadSeasonalData();
      addNotification(
        editingItem?._id
          ? "Seasonal item updated successfully."
          : "Seasonal item created successfully.",
        "success",
      );
    } catch (error) {
      logger.error("Failed to save seasonal item:", error);
      addNotification(
        error.response?.data?.message || "Failed to save seasonal item.",
        "error",
      );
    }
  };
  const buildSeasonalPayload = (item, seasonal) => ({
    name: item.name,
    description: item.description,
    category: item.category?._id || item.category,
    preparationTime: item.preparationTime,
    ingredients: item.ingredients || [],
    spiceLevel: item.spiceLevel,
    isVegetarian: item.isVegetarian,
    isVegan: item.isVegan,
    isGlutenFree: item.isGlutenFree,
    isAvailable: item.isAvailable,
    tags: item.tags || [],
    nutritionalInfo: item.nutritionalInfo || {},
    prices: (item.prices || []).map((price) => ({
      sizeId: price?.size?._id || price?.sizeId?._id || price?.sizeId,
      price: price?.price,
      costPrice: price?.costPrice,
    })),
    seasonal,
  });
  const openSeasonalModal = (item) => {
    if (isMonitoringMode) {
      addNotification(
        "Seasonal menu is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    setSeasonalModal({
      isOpen: true,
      item,
      seasonName: item?.seasonal?.seasonName || "",
      startDate: item?.seasonal?.startDate
        ? new Date(item.seasonal.startDate).toISOString().slice(0, 10)
        : "",
      endDate: item?.seasonal?.endDate
        ? new Date(item.seasonal.endDate).toISOString().slice(0, 10)
        : "",
    });
  };
  const closeSeasonalModal = () => {
    setSeasonalModal({
      isOpen: false,
      item: null,
      seasonName: "",
      startDate: "",
      endDate: "",
    });
  };
  const submitSeasonalModal = async () => {
    if (isMonitoringMode) {
      addNotification(
        "Seasonal menu is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    if (!seasonalModal.item?._id) {
      return;
    }
    try {
      setSavingId(seasonalModal.item._id);
      await menuService.updateMenuItem(
        seasonalModal.item._id,
        buildSeasonalPayload(seasonalModal.item, {
          isSeasonal: true,
          seasonName: seasonalModal.seasonName.trim(),
          startDate: seasonalModal.startDate || undefined,
          endDate: seasonalModal.endDate || undefined,
        }),
      );
      closeSeasonalModal();
      await loadSeasonalData();
      addNotification("Seasonal item updated successfully.", "success");
    } catch (error) {
      logger.error("Failed to update seasonal status:", error);
      addNotification(
        error.response?.data?.message || "Failed to update seasonal status.",
        "error",
      );
    } finally {
      setSavingId("");
    }
  };
  const toggleSeasonalStatus = async (item) => {
    if (isMonitoringMode) {
      addNotification(
        "Seasonal menu is read-only in monitoring mode.",
        "error",
      );
      return;
    }
    if (!item?.seasonal?.isSeasonal) {
      openSeasonalModal(item);
      return;
    }
    try {
      setSavingId(item._id);
      await menuService.updateMenuItem(
        item._id,
        buildSeasonalPayload(item, {
          isSeasonal: false,
        }),
      );
      await loadSeasonalData();
      addNotification("Seasonal status updated successfully.", "success");
    } catch (error) {
      logger.error("Failed to update seasonal status:", error);
      addNotification(
        error.response?.data?.message || "Failed to update seasonal status.",
        "error",
      );
    } finally {
      setSavingId("");
    }
  };
  if (loading) {
    return (
      <AdminPageSkeleton stats={4} filters={2} cards={6} cardHeight="h-48" />
    );
  }
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seasonal Menu</h1>
          <p className="text-gray-600">
            Manage limited-time items and control their seasonal windows.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(buildAdminPath("/menu/items"))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50"
          >
            <Tags className="h-4 w-4" />
            Menu Items
          </button>
          <button
            type="button"
            onClick={() => navigate(buildAdminPath("/menu/sizes"))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50"
          >
            <Ruler className="h-4 w-4" />
            Sizes
          </button>
          <button
            type="button"
            onClick={() => navigate(buildAdminPath("/menu/prices"))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50"
          >
            <LineChart className="h-4 w-4" />
            Price History
          </button>
          <button
            type="button"
            onClick={loadSeasonalData}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {!isMonitoringMode ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Seasonal Item
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Catalog Items</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {seasonalStats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Seasonal Tagged</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {seasonalStats.seasonal}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active Right Now</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {seasonalStats.active}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Inactive Seasonal</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {seasonalStats.inactive}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-xl border px-4 py-2 text-sm transition-colors ${filter === option.value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">
            No items found
          </h3>
          <p className="mt-1 text-gray-600">
            Try another filter or create a new seasonal menu item.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const isActiveNow = menuService.isItemSeasonal(item?.seasonal);
            return (
              <div
                key={item._id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {item.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {item.category?.name || "Uncategorized"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${item?.seasonal?.isSeasonal ? (isActiveNow ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700") : "bg-slate-100 text-slate-700"}`}
                  >
                    {item?.seasonal?.isSeasonal
                      ? isActiveNow
                        ? "Active"
                        : "Scheduled"
                      : "Not Seasonal"}
                  </span>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <p className="text-sm text-gray-600">
                    {item.description || "No description provided."}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Tag className="h-4 w-4" />
                    <span>
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency,
                        maximumFractionDigits: 2,
                      }).format(Number(getPrimaryPrice(item) || 0))}
                    </span>
                  </div>

                  <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Start: {formatDate(item?.seasonal?.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>End: {formatDate(item?.seasonal?.endDate)}</span>
                    </div>
                    <div>Season: {item?.seasonal?.seasonName || "Not set"}</div>
                  </div>

                  {!isMonitoringMode ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingId === item._id}
                        onClick={() => toggleSeasonalStatus(item)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
                      >
                        {item?.seasonal?.isSeasonal ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {item?.seasonal?.isSeasonal
                          ? "Remove Seasonal"
                          : "Mark Seasonal"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isMonitoringMode && showItemForm ? (
        <ItemForm
          item={editingItem}
          onSave={handleSaveItem}
          onCancel={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
          categories={categories}
          sizes={sizes}
        />
      ) : null}

      {!isMonitoringMode ? (
        <AdminModal
          isOpen={seasonalModal.isOpen}
          title="Mark Seasonal Item"
          subtitle={
            seasonalModal.item
              ? `Set season details for ${seasonalModal.item.name}.`
              : ""
          }
          onClose={closeSeasonalModal}
          maxWidth="max-w-lg"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeSeasonalModal}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSeasonalModal}
                disabled={savingId === seasonalModal.item?._id}
                className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
              >
                Save Seasonal Details
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 p-4 sm:p-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Season Name
              </label>
              <input
                type="text"
                value={seasonalModal.seasonName}
                onChange={(event) =>
                  setSeasonalModal((current) => ({
                    ...current,
                    seasonName: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="e.g. Summer Special"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  value={seasonalModal.startDate}
                  onChange={(event) =>
                    setSeasonalModal((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  value={seasonalModal.endDate}
                  onChange={(event) =>
                    setSeasonalModal((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
