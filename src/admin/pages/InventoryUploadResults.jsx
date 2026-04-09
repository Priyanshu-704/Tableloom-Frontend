import React, { useMemo } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildAdminPath } from "../../common/utils/routes";
import { getInventoryBulkUploadResult } from "../utils/inventoryUploadResults";

const formatProcessedAt = (value) => {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const renderCellValue = (value, fallback = "Not provided") =>
  String(value || "").trim() || fallback;

const SummaryCard = ({ title, value, icon: Icon, tintClass }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`rounded-2xl p-3 ${tintClass}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

const ResultTable = ({ rows = [], emptyMessage = "", tone = "success" }) => {
  const toneClasses =
    tone === "danger"
      ? "bg-rose-50 text-rose-700"
      : "bg-emerald-50 text-emerald-700";

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                CSV Line
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ingredient
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row) => (
              <tr key={`${row.line}-${row.status}-${row.ingredientName || row.sku || "row"}`}>
                <td className="px-4 py-4 align-top text-sm font-semibold text-gray-900">
                  {row.line}
                </td>
                <td className="px-4 py-4 align-top text-sm text-gray-700">
                  {renderCellValue(row.ingredientName, "Missing ingredient name")}
                </td>
                <td className="px-4 py-4 align-top text-sm text-gray-600">
                  {renderCellValue(row.sku)}
                </td>
                <td className="px-4 py-4 align-top text-sm">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${toneClasses}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-4 align-top text-sm text-gray-700">
                  {renderCellValue(row.message)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export function InventoryUploadResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const uploadResult = useMemo(
    () => location.state?.uploadResult || getInventoryBulkUploadResult(),
    [location.state],
  );

  const successfulRows = useMemo(
    () =>
      (uploadResult?.results || []).filter(
        (row) => row.status === "created" || row.status === "updated",
      ),
    [uploadResult],
  );

  const failedRows = useMemo(
    () => (uploadResult?.results || []).filter((row) => row.status === "failed"),
    [uploadResult],
  );

  if (!uploadResult) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            No upload result available
          </h1>
          <p className="mt-2 text-gray-600">
            Upload a CSV file first, then this page will show which ingredient
            rows succeeded and which failed.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(buildAdminPath("/inventory"))}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inventory
            </button>
            <button
              type="button"
              onClick={() => navigate(buildAdminPath("/inventory"))}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            <FileSpreadsheet className="h-4 w-4" />
            Inventory Upload Result
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Bulk ingredient upload completed
          </h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Review each uploaded row below. Successful rows show whether the
            ingredient was created or updated, and failed rows include the exact
            reason so you can fix and re-upload.
          </p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500">
            <p>
              <span className="font-semibold text-gray-700">Source file:</span>{" "}
              {renderCellValue(
                uploadResult.sourceFileName || uploadResult.fileName,
                "inventory-upload.csv",
              )}
            </p>
            <p>
              <span className="font-semibold text-gray-700">Processed:</span>{" "}
              {formatProcessedAt(uploadResult.processedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={() => navigate(buildAdminPath("/inventory"))}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </button>
          <button
            type="button"
            onClick={() => navigate(buildAdminPath("/inventory"))}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4" />
            Upload Another CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Rows Processed"
          value={uploadResult.total || 0}
          icon={FileSpreadsheet}
          tintClass="bg-slate-100 text-slate-700"
        />
        <SummaryCard
          title="Created"
          value={uploadResult.created || 0}
          icon={CheckCircle2}
          tintClass="bg-emerald-50 text-emerald-700"
        />
        <SummaryCard
          title="Updated"
          value={uploadResult.updated || 0}
          icon={RefreshCw}
          tintClass="bg-sky-50 text-sky-700"
        />
        <SummaryCard
          title="Failed"
          value={uploadResult.failed || 0}
          icon={XCircle}
          tintClass="bg-rose-50 text-rose-700"
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
            <CircleAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Failed rows</h2>
            <p className="text-sm text-gray-500">
              Each failed row includes the reason it was rejected.
            </p>
          </div>
        </div>
        <ResultTable
          rows={failedRows}
          tone="danger"
          emptyMessage="No failed rows. Every ingredient record in this upload was accepted."
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Successful rows</h2>
            <p className="text-sm text-gray-500">
              These ingredients were created or updated successfully.
            </p>
          </div>
        </div>
        <ResultTable
          rows={successfulRows}
          tone="success"
          emptyMessage="No successful rows were returned for this upload."
        />
      </section>
    </div>
  );
}
