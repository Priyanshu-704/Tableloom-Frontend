import { logger } from "../../../common/utils/logger.js";
import React, { useRef, useState } from "react";
import {
  CheckCircle,
  Download,
  FileText,
  FolderTree,
  Upload,
  XCircle,
} from "lucide-react";
import { menuService } from "../../../common/services";
import { useAdmin } from "../../context/AdminContext";
import { useMonitoringMode } from "../../hooks/useMonitoringMode";
import { Button } from "../../../common/components/ui/button";
import { Input } from "../../../common/components/ui/input";
import { Label } from "../../../common/components/ui/label";

function ImportExport() {
  const isMonitoringMode = useMonitoringMode();
  const { addNotification } = useAdmin();
  const [menuImportFile, setMenuImportFile] = useState(null);
  const [categoryImportFile, setCategoryImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [resultsLabel, setResultsLabel] = useState("Import Results");
  const [loading, setLoading] = useState("");
  const menuFileRef = useRef(null);
  const categoryFileRef = useRef(null);
  const importRows = importResults?.rows || [];

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
  const resetFileInput = (inputRef) => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };
  const guardMonitoringMode = () => {
    if (!isMonitoringMode) {
      return false;
    }
    addNotification(
      "Import and export actions are disabled in monitoring mode.",
      "error",
    );
    return true;
  };
  const handleExport = async () => {
    if (guardMonitoringMode()) {
      return;
    }
    setLoading("export");
    try {
      await menuService.exportMenuItems();
      addNotification("Menu exported successfully.", "success");
    } catch (error) {
      logger.error("Export failed:", error);
      addNotification(
        error.response?.data?.message || "Export failed. Please try again.",
        "error",
      );
    } finally {
      setLoading("");
    }
  };
  const handleMenuImport = async () => {
    if (guardMonitoringMode()) {
      return;
    }
    if (!menuImportFile) {
      addNotification("Please select a menu CSV file to import", "error");
      return;
    }
    setLoading("menu-import");
    try {
      const response = await menuService.importMenuItems(menuImportFile);
      setImportResults(response?.data || null);
      setResultsLabel("Menu Import Results");
      setMenuImportFile(null);
      resetFileInput(menuFileRef);
      addNotification(
        response?.message || "Menu imported successfully.",
        "success",
      );
    } catch (error) {
      logger.error("Menu import failed:", error);
      addNotification(
        error.response?.data?.message ||
          "Menu import failed. Please check the file format.",
        "error",
      );
    } finally {
      setLoading("");
    }
  };
  const handleCategoryImport = async () => {
    if (guardMonitoringMode()) {
      return;
    }
    if (!categoryImportFile) {
      addNotification("Please select a category CSV file to import", "error");
      return;
    }
    setLoading("category-import");
    try {
      const response = await menuService.importCategories(categoryImportFile);
      setImportResults(response?.data || null);
      setResultsLabel("Category Import Results");
      setCategoryImportFile(null);
      resetFileInput(categoryFileRef);
      addNotification(
        response?.message || "Categories imported successfully.",
        "success",
      );
    } catch (error) {
      logger.error("Category import failed:", error);
      addNotification(
        error.response?.data?.message ||
          "Category import failed. Please check the file format.",
        "error",
      );
    } finally {
      setLoading("");
    }
  };
  const downloadMenuTemplate = async () => {
    if (guardMonitoringMode()) {
      return;
    }
    try {
      await menuService.downloadImportTemplate();
      addNotification("Menu import template downloaded successfully.", "success");
    } catch (error) {
      logger.error("Failed to download menu template:", error);
      addNotification(
        error.response?.data?.message || "Failed to download menu template.",
        "error",
      );
    }
  };
  const downloadCategoryTemplate = async () => {
    if (guardMonitoringMode()) {
      return;
    }
    try {
      await menuService.downloadCategoryImportTemplate();
      addNotification(
        "Category import template downloaded successfully.",
        "success",
      );
    } catch (error) {
      logger.error("Failed to download category template:", error);
      addNotification(
        error.response?.data?.message ||
          "Failed to download category import template.",
        "error",
      );
    }
  };

  const actionButtonClassName =
    "w-full min-w-0 flex-1 whitespace-normal text-center leading-5 sm:min-w-[12rem]";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Import / Export
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Export menu data, bulk import menu items, and upload categories in
          structured CSV files. Menu imports now auto-create missing category
          and size names when needed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Export Menu
              </h2>
              <p className="text-sm text-slate-500">
                Download the live catalog as CSV.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleExport}
            disabled={loading === "export"}
            className="w-full"
          >
            <Download className="h-4 w-4" />
            {loading === "export" ? "Exporting..." : "Export Menu CSV"}
          </Button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Import Menu Items
              </h2>
              <p className="text-sm text-slate-500">
                Create or update menu items from CSV.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menu-import-file">Menu CSV File</Label>
              <Input
                id="menu-import-file"
                ref={menuFileRef}
                type="file"
                accept=".csv"
                disabled={isMonitoringMode}
                onChange={(event) =>
                  setMenuImportFile(event.target.files?.[0] || null)
                }
              />
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              Enter category and size by name in the CSV. If a category or size
              does not exist yet, it will be created automatically. For new
              categories, add a `station` or `kitchenStation` column, or the
              first active station will be used.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={downloadMenuTemplate}
                className={actionButtonClassName}
              >
                <FileText className="h-4 w-4" />
                Menu Template
              </Button>
              <Button
                type="button"
                onClick={handleMenuImport}
                disabled={loading === "menu-import" || !menuImportFile}
                className={actionButtonClassName}
              >
                <Upload className="h-4 w-4" />
                {loading === "menu-import" ? "Importing..." : "Import Menu"}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Import Categories
              </h2>
              <p className="text-sm text-slate-500">
                Bulk create or update category records.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-import-file">Category CSV File</Label>
              <Input
                id="category-import-file"
                ref={categoryFileRef}
                type="file"
                accept=".csv"
                disabled={isMonitoringMode}
                onChange={(event) =>
                  setCategoryImportFile(event.target.files?.[0] || null)
                }
              />
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              Use the category template to provide the category name,
              description, and kitchen station name or ID. Existing categories
              will be updated instead of duplicated.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={downloadCategoryTemplate}
                className={actionButtonClassName}
              >
                <FileText className="h-4 w-4" />
                Category Template
              </Button>
              <Button
                type="button"
                onClick={handleCategoryImport}
                disabled={loading === "category-import" || !categoryImportFile}
                className={actionButtonClassName}
              >
                <Upload className="h-4 w-4" />
                {loading === "category-import"
                  ? "Importing..."
                  : "Import Categories"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      {importResults ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            {resultsLabel}
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span>Created: {importResults.created || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <CheckCircle className="h-5 w-5" />
              <span>Updated: {importResults.updated || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              <span>Failed: {importResults.failed || 0}</span>
            </div>
          </div>

          {importRows.length > 0 ? (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Row
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Record
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Station
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
                  {importRows.map((row, index) => (
                    <tr key={`${row.rowNumber}-${index}`} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {row.rowNumber}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {row.itemName || row.categoryName || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.category || row.categoryName || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.size || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.station || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(row.status)}`}
                        >
                          {row.status || "failed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getActionClasses(row.action)}`}
                        >
                          {row.action || "failed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {row.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export { ImportExport };
export default ImportExport;
