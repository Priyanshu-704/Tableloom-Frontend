import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Download,
  IndianRupee,
  Eye,
  Loader2,
  Package2,
  RefreshCw,
  Tag,
  Upload,
  XCircle,
} from "lucide-react";
import { menuService } from "../../../common/services";
import { useAdmin } from "../../context/AdminContext";
import { AdminPageSkeleton } from "../common/AdminSkeleton";
import { useMonitoringMode } from "../../hooks/useMonitoringMode";
const BULK_ACTIONS = [
  {
    id: "updatePrices",
    name: "Update Prices",
    icon: IndianRupee,
  },
  {
    id: "updateAvailability",
    name: "Update Availability",
    icon: Eye,
  },
  {
    id: "updateStatus",
    name: "Update Status",
    icon: CheckCircle,
  },
  {
    id: "updateCategories",
    name: "Move Category",
    icon: Tag,
  },
  {
    id: "export",
    name: "Export Selected",
    icon: Download,
  },
  {
    id: "import",
    name: "Import Items",
    icon: Upload,
  },
];
const actionDescriptions = {
  updatePrices: "Apply a single price update across selected menu items.",
  updateAvailability: "Control whether selected items are available to order.",
  updateStatus: "Activate or deactivate items in bulk.",
  updateCategories: "Move selected items into a different category.",
  export: "Download a live export for the selected items.",
  import: "Upload CSV data to create or update menu records.",
};
export function BulkOperations() {
  const PAGE_SIZE = 20;
  const isMonitoringMode = useMonitoringMode();
  const { addNotification } = useAdmin();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkData, setBulkData] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingMoreItems, setLoadingMoreItems] = useState(false);
  const [itemPage, setItemPage] = useState(1);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [lastResult, setLastResult] = useState(null);
  const resultRows = lastResult?.rows || [];
  const getStatusClasses = (status) =>
    status === "success"
      ? "bg-green-100 text-green-700 border border-green-200"
      : "bg-red-100 text-red-700 border border-red-200";
  const getActionClasses = (action) => {
    if (action === "created") {
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    }
    if (action === "updated") {
      return "bg-blue-100 text-blue-700 border border-blue-200";
    }
    return "bg-red-100 text-red-700 border border-red-200";
  };
  const loadBulkData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [itemsResponse, categoryResponse, sizeResponse] = await Promise.all(
        [
          menuService.getMenuItems({
            activeOnly: false,
            availableOnly: false,
            page: 1,
            limit: PAGE_SIZE,
          }),
          menuService.getCategories(true, true),
          menuService.getSizes(true),
        ],
      );
      setMenuItems(itemsResponse?.data || []);
      setItemPage(1);
      setHasMoreItems(
        (itemsResponse?.pagination?.page || 1) <
          (itemsResponse?.pagination?.pages || 1),
      );
      setCategories(categoryResponse?.data || []);
      setSizes(sizeResponse?.data || []);
    } catch {
      addNotification("Failed to load bulk operation data", "error");
    } finally {
      setLoadingData(false);
    }
  }, [addNotification]);
  useEffect(() => {
    loadBulkData();
  }, [loadBulkData]);
  const loadMoreMenuItems = useCallback(async () => {
    if (loadingData || loadingMoreItems || !hasMoreItems) {
      return;
    }
    try {
      setLoadingMoreItems(true);
      const nextPage = itemPage + 1;
      const itemsResponse = await menuService.getMenuItems({
        activeOnly: false,
        availableOnly: false,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      const nextItems = itemsResponse?.data || [];
      setMenuItems((current) => [...current, ...nextItems]);
      setItemPage(nextPage);
      setHasMoreItems(
        (itemsResponse?.pagination?.page || nextPage) <
          (itemsResponse?.pagination?.pages || nextPage),
      );
    } catch {
      addNotification("Failed to load more menu items", "error");
    } finally {
      setLoadingMoreItems(false);
    }
  }, [
    PAGE_SIZE,
    addNotification,
    hasMoreItems,
    itemPage,
    loadingData,
    loadingMoreItems,
  ]);
  const selectedItemList = useMemo(
    () => menuItems.filter((item) => selectedItems.has(item?._id)),
    [menuItems, selectedItems],
  );
  const activeItemsCount = useMemo(
    () => menuItems.filter((item) => item?.isActive !== false).length,
    [menuItems],
  );
  const availableItemsCount = useMemo(
    () => menuItems.filter((item) => item?.isAvailable !== false).length,
    [menuItems],
  );
  const categoryCount = categories.length;
  const selectAllItems = () => {
    if (selectedItems.size === menuItems.length) {
      setSelectedItems(new Set());
      return;
    }
    setSelectedItems(
      new Set(menuItems.map((item) => item?._id).filter(Boolean)),
    );
  };
  const toggleItemSelection = (itemId) => {
    const next = new Set(selectedItems);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedItems(next);
  };
  const resetState = () => {
    setSelectedItems(new Set());
    setBulkData({});
    setSelectedAction("");
  };
  const handleItemsScroll = (event) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 120) {
      loadMoreMenuItems();
    }
  };
  const executeBulkAction = async () => {
    if (isMonitoringMode) {
      addNotification(
        "Bulk operations are disabled in monitoring mode.",
        "error",
      );
      return;
    }
    if (!selectedItems.size && selectedAction !== "import") {
      addNotification("Please select at least one item", "error");
      return;
    }
    setLoading(true);
    try {
      const itemIds = Array.from(selectedItems);
      if (selectedAction === "updatePrices") {
        if (
          !bulkData?.sizeId ||
          bulkData?.price === undefined ||
          bulkData?.price === ""
        ) {
          addNotification("Select a size and enter a price", "error");
          setLoading(false);
          return;
        }
        const response = await menuService.bulkUpdatePrices(
          itemIds.map((menuItemId) => ({
            menuItemId,
            sizeId: bulkData.sizeId,
            newPrice: parseFloat(bulkData.price),
            reason: bulkData.reason || "Bulk price update",
          })),
        );
        const stats = response?.data || {};
        setLastResult({
          message:
            response?.message ||
            `Bulk price update completed. ${stats.successful || 0} succeeded, ${stats.failed || 0} failed.`,
          rows: stats.rows || [],
          details: stats.errors || [],
          successful: stats.successful || 0,
          failed: stats.failed || 0,
        });
      } else if (selectedAction === "updateAvailability") {
        const response = await menuService.bulkUpdateAvailability(
          itemIds.map((menuItemId) => ({
            menuItemId,
            isAvailable: Boolean(bulkData.isAvailable),
          })),
        );
        const stats = response?.data || {};
        setLastResult({
          message:
            response?.message ||
            `Bulk availability update completed. ${stats.successful || 0} succeeded, ${stats.failed || 0} failed.`,
          rows: stats.rows || [],
          details: stats.errors || [],
          successful: stats.successful || 0,
          failed: stats.failed || 0,
        });
      } else if (selectedAction === "updateStatus") {
        const response = await menuService.bulkUpdateStatus(
          itemIds.map((menuItemId) => ({
            menuItemId,
            isActive: Boolean(bulkData.isActive),
          })),
        );
        const stats = response?.data || {};
        setLastResult({
          message:
            response?.message ||
            `Bulk status update completed. ${stats.successful || 0} succeeded, ${stats.failed || 0} failed.`,
          rows: stats.rows || [],
          details: stats.errors || [],
          successful: stats.successful || 0,
          failed: stats.failed || 0,
        });
      } else if (selectedAction === "updateCategories") {
        if (!bulkData?.categoryId) {
          addNotification("Please select a target category", "error");
          setLoading(false);
          return;
        }
        const response = await menuService.bulkUpdateCategories(
          itemIds.map((menuItemId) => ({
            menuItemId,
            categoryId: bulkData.categoryId,
          })),
        );
        const stats = response?.data || {};
        setLastResult({
          message:
            response?.message ||
            `Bulk category update completed. ${stats.successful || 0} succeeded, ${stats.failed || 0} failed.`,
          rows: stats.rows || [],
          details: stats.errors || [],
          successful: stats.successful || 0,
          failed: stats.failed || 0,
        });
      } else if (selectedAction === "export") {
        const response = await menuService.exportMenuItems({
          itemIds: itemIds.join(","),
          activeOnly: false,
          availableOnly: false,
        });
        setLastResult({
          message: `Exported ${itemIds.length} selected items to ${response?.filename || "CSV file"}.`,
          details: [],
        });
      }
      addNotification("Bulk operation completed successfully", "success");
      resetState();
      await loadBulkData();
    } catch {
      addNotification("Bulk operation failed", "error");
    } finally {
      setLoading(false);
    }
  };
  const handleImport = async (file) => {
    if (isMonitoringMode) {
      addNotification(
        "Bulk operations are disabled in monitoring mode.",
        "error",
      );
      return;
    }
    if (!file) {
      return;
    }
    setLoading(true);
    try {
      const response = await menuService.importMenuItems(file);
      const importStats = response?.data || {};
      setLastResult({
        message:
          response?.message ||
          `Imported ${importStats.created || 0} items with ${importStats.failed || 0} failures.`,
        rows: importStats.rows || [],
        details: importStats.errors || [],
        created: importStats.created || 0,
        updated: importStats.updated || 0,
        failed: importStats.failed || 0,
      });
      addNotification(
        response?.message || "Import completed successfully",
        "success",
      );
      await loadBulkData();
      resetState();
    } catch {
      addNotification("Import failed. Please verify the CSV file.", "error");
    } finally {
      setLoading(false);
    }
  };
  const renderActionForm = () => {
    switch (selectedAction) {
      case "updatePrices":
        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <select
              value={bulkData.sizeId || ""}
              onChange={(event) =>
                setBulkData((current) => ({
                  ...current,
                  sizeId: event.target.value,
                }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select size</option>
              {sizes.map((size) => (
                <option key={size?._id} value={size?._id}>
                  {size?.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bulkData.price || ""}
              onChange={(event) =>
                setBulkData((current) => ({
                  ...current,
                  price: event.target.value,
                }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="New price"
            />
            <input
              type="text"
              value={bulkData.reason || ""}
              onChange={(event) =>
                setBulkData((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Reason (optional)"
            />
          </div>
        );
      case "updateAvailability":
        return (
          <select
            value={String(bulkData.isAvailable ?? "")}
            onChange={(event) =>
              setBulkData((current) => ({
                ...current,
                isAvailable: event.target.value === "true",
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Select availability</option>
            <option value="true">Make available</option>
            <option value="false">Make unavailable</option>
          </select>
        );
      case "updateStatus":
        return (
          <select
            value={String(bulkData.isActive ?? "")}
            onChange={(event) =>
              setBulkData((current) => ({
                ...current,
                isActive: event.target.value === "true",
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Select status</option>
            <option value="true">Activate</option>
            <option value="false">Deactivate</option>
          </select>
        );
      case "updateCategories":
        return (
          <select
            value={bulkData.categoryId || ""}
            onChange={(event) =>
              setBulkData((current) => ({
                ...current,
                categoryId: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category?._id} value={category?._id}>
                {category?.name}
              </option>
            ))}
          </select>
        );
      case "import":
        return (
          <div className="space-y-3">
            <input
              type="file"
              accept=".csv"
              disabled={isMonitoringMode}
              onChange={(event) => handleImport(event.target.files?.[0])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <button
              type="button"
              disabled={isMonitoringMode}
              onClick={() => menuService.downloadImportTemplate()}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Download import template
            </button>
          </div>
        );
      default:
        return null;
    }
  };
  if (loadingData) {
    return (
      <AdminPageSkeleton stats={4} filters={0} cards={5} cardHeight="h-56" />
    );
  }
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Bulk Operations
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Run menu-wide updates, imports, and exports with the live backend
            integration already connected to your catalog data.
          </p>
        </div>
        <button
          type="button"
          onClick={loadBulkData}
          disabled={loadingData}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`}
          />
          Refresh data
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Menu Items
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {menuItems.length}
              </p>
            </div>
            <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
              <Package2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Items</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {activeItemsCount}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Available Now
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {availableItemsCount}
              </p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
              <Eye className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Categories</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {categoryCount}
              </p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
              <Tag className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Choose an Action
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select the operation you want to run before configuring item
            selection.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {BULK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const active = selectedAction === action.id;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => setSelectedAction(action.id)}
                disabled={isMonitoringMode}
                className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? "border-primary-500 bg-primary-50 shadow-sm" : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-2xl p-3 ${active ? "bg-primary-600 text-white" : "bg-white text-slate-600 shadow-sm"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {action.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {actionDescriptions[action.id]}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedAction ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {selectedAction !== "import" ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Select Items
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedItems.size} selected from {menuItems.length} loaded
                    menu items.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={selectAllItems}
                  disabled={isMonitoringMode}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedItems.size === menuItems.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div
                className="max-h-128 overflow-y-auto rounded-2xl border border-slate-200"
                onScroll={handleItemsScroll}
              >
                {menuItems.map((item) => (
                  <label
                    key={item?._id}
                    className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item?._id)}
                      onChange={() => toggleItemSelection(item?._id)}
                      disabled={isMonitoringMode}
                      className="mt-1 rounded border-slate-300 text-primary-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item?.name}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          {item?.category?.name || "Uncategorized"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {(item?.prices || [])
                          .map(
                            (price) =>
                              `${price?.size?.name || "Size"}: ${price?.price ?? 0}`,
                          )
                          .join(", ") || "No pricing configured"}
                      </p>
                    </div>
                  </label>
                ))}

                {loadingMoreItems ? (
                  <div className="flex items-center justify-center px-4 py-4 text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more items...
                  </div>
                ) : null}

                {!hasMoreItems && menuItems.length > 0 ? (
                  <div className="px-4 py-4 text-center text-xs text-slate-500">
                    All available items loaded
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Configure Action
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {actionDescriptions[selectedAction]}
              </p>
            </div>

            <div className="space-y-4">{renderActionForm()}</div>

            {selectedAction !== "import" ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Ready to update {selectedItemList.length} items
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  This action will run on the currently selected records using
                  the live backend bulk API.
                </p>
              </div>
            ) : null}

            {lastResult ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">
                  {lastResult.message}
                </p>
                {lastResult.successful !== undefined ||
                lastResult.created !== undefined ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {lastResult.created !== undefined ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Created: {lastResult.created || 0}
                        </span>
                      </div>
                    ) : null}
                    {lastResult.updated !== undefined ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Updated: {lastResult.updated || 0}
                        </span>
                      </div>
                    ) : null}
                    {lastResult.successful !== undefined ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Successful: {lastResult.successful || 0}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">
                        Failed: {lastResult.failed || 0}
                      </span>
                    </div>
                  </div>
                ) : null}
                {resultRows.length ? (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Item
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Size
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Action
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {resultRows.map((row, index) => (
                          <tr
                            key={`${row.menuItemId || row.rowNumber || "row"}-${index}`}
                            className="align-top"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                              {row.itemName || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {row.size || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(row.status)}`}
                              >
                                {row.status || "failed"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getActionClasses(row.action)}`}
                              >
                                {row.action || "failed"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {row.reason || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {lastResult.details?.length ? (
                  <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">
                      Raw Details ({lastResult.details.length})
                    </summary>
                    <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                      {lastResult.details.map((detail, index) => (
                        <p
                          key={`${detail}-${index}`}
                          className="text-xs text-slate-600"
                        >
                          {detail}
                        </p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}

            {selectedAction && selectedAction !== "import" ? (
              <button
                type="button"
                onClick={executeBulkAction}
                disabled={
                  isMonitoringMode || loading || !selectedItemList.length
                }
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : null}
                <span>
                  Execute{" "}
                  {
                    BULK_ACTIONS.find((action) => action.id === selectedAction)
                      ?.name
                  }
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
