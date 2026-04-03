import { logger } from "../../../common/utils/logger.js";
import React, { useState } from "react";
import { Upload, Download, FileText, CheckCircle, XCircle } from "lucide-react";
import { menuService } from "../../../common/services";
import { useAdmin } from "../../context/AdminContext";

export function ImportExport() {
  const { addNotification } = useAdmin();
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handleExport = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      addNotification("Please select a file to import", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await menuService.importMenuItems(importFile);
      setImportResults(response?.data || null);
      setImportFile(null);
      addNotification(
        response?.message || "Menu imported successfully.",
        "success",
      );
      document.getElementById("import-file").value = "";
    } catch (error) {
      logger.error("Import failed:", error);
      addNotification(
        error.response?.data?.message ||
          "Import failed. Please check the file format.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      await menuService.downloadImportTemplate();
      addNotification("Import template downloaded successfully.", "success");
    } catch (error) {
      logger.error("Failed to download template:", error);
      addNotification(
        error.response?.data?.message || "Failed to download import template.",
        "error",
      );
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import/Export Menu</h1>
        <p className="text-gray-600">
          Bulk import and export menu items using CSV files
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-3">
            <Download className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Export Menu</h2>
          </div>

          <p className="mb-4 text-gray-600">
            Export your current menu items to a CSV file for backup or analysis.
          </p>

          <button
            onClick={handleExport}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Menu as CSV
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-3">
            <Upload className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Import Menu</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select CSV File
              </label>
              <input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={downloadTemplate}
                className="flex flex-1 items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                Download Template
              </button>

              <button
                onClick={handleImport}
                disabled={loading || !importFile}
                className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Import File
              </button>
            </div>
          </div>
        </div>
      </div>

      {importResults && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Import Results
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Created: {importResults.created || 0}</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <CheckCircle className="h-5 w-5" />
              <span>Updated: {importResults.updated || 0}</span>
            </div>
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Failed: {importResults.failed || 0}</span>
            </div>
          </div>

          {importRows.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 font-medium text-gray-900">
                Row-wise Results
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Row
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {importRows.map((row, index) => (
                      <tr
                        key={`${row.rowNumber}-${row.itemName || index}`}
                        className="align-top"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {row.rowNumber}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {row.itemName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.category || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
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
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.reason || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importResults.errors && importResults.errors.length > 0 && (
            <details className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-red-700">
                Raw Error List ({importResults.errors.length})
              </summary>
              <div className="mt-3 space-y-2">
                {importResults.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    {error}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
