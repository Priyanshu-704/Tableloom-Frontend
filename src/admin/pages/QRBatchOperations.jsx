import { logger } from "../../common/utils/logger.js";
import React, { useEffect, useState, useMemo } from "react";
import {
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Printer,
  FileText,
  Grid,
  Settings,
  Search,
  Check,
  X,
  Info,
  MapPin,
  Users,
  QrCode,
  Sparkles,
} from "lucide-react";
import tableService from "../../common/services/TableService";
import Select from "../components/common/Select";
import { useAdmin } from "../context/AdminContext";
import { withTenantQueryParams } from "../../common/utils/qrImage";
import { useAuth } from "../../common/context/AuthContext";

export function QRBatchOperations({ tables = [], onClose, onSuccess }) {
  const { addNotification } = useAdmin();
  const { hasPermission } = useAuth();
  const canDownloadQr = hasPermission("table.qr_download");
  const canRegenerateQr = hasPermission("table.qr_regenerate");

  const [loading, setLoading] = useState(false);
  const [fetchingTables, setFetchingTables] = useState(false);
  const [fetchedTables, setFetchedTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [operation, setOperation] = useState(
    canDownloadQr ? "download" : canRegenerateQr ? "regenerate" : "print",
  );
  const [qrSize, setQrSize] = useState("medium");
  const [printLayout, setPrintLayout] = useState("multiple");
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
  });

  // Load all tables if passed array is empty or incomplete
  useEffect(() => {
    let isMounted = true;
    if (!tables || tables.length === 0) {
      setFetchingTables(true);
      tableService
        .getTables({ limit: 100 })
        .then((response) => {
          if (!isMounted) return;
          if (response?.success && response.data) {
            const transformed = response.data.map((t) => ({
              id: t._id,
              number: t.tableNumber,
              tableName: t.tableName,
              capacity: t.capacity,
              status: t.status,
              location: t.location,
              qrCode: withTenantQueryParams(t.qrCode),
              qrUrl: t.qrUrl,
            }));
            setFetchedTables(transformed);
          }
        })
        .catch((error) => {
          logger.error("Failed to load tables for batch operations:", error);
        })
        .finally(() => {
          if (isMounted) setFetchingTables(false);
        });
    } else {
      setFetchedTables(tables);
    }
    return () => {
      isMounted = false;
    };
  }, [tables]);

  const sourceTables = tables && tables.length > 0 ? tables : fetchedTables;

  const tablesWithQR = useMemo(() => {
    return (sourceTables || [])
      .filter((t) => Boolean(t.id || t._id || t.number || t.tableNumber))
      .map((t) => {
        const id = t.id || t._id;
        const number = t.number || t.tableNumber;
        const qrUrl = t.qrUrl || "";
        const qrCode =
          t.qrCode ||
          (qrUrl
            ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`
            : "");
        return {
          ...t,
          id,
          number,
          qrCode: withTenantQueryParams(qrCode),
          qrUrl,
        };
      });
  }, [sourceTables]);

  const filteredTables = useMemo(() => {
    if (!filterSearch.trim()) return tablesWithQR;
    const query = filterSearch.toLowerCase().trim();
    return tablesWithQR.filter(
      (t) =>
        String(t.number).toLowerCase().includes(query) ||
        String(t.tableName || "").toLowerCase().includes(query) ||
        String(t.location || "").toLowerCase().includes(query),
    );
  }, [filterSearch, tablesWithQR]);

  const selectedTableData = useMemo(() => {
    return tablesWithQR.filter((t) => selectedTables.includes(t.id));
  }, [selectedTables, tablesWithQR]);

  const allFilteredSelected = useMemo(() => {
    if (filteredTables.length === 0) return false;
    return filteredTables.every((t) => selectedTables.includes(t.id));
  }, [filteredTables, selectedTables]);

  const operationOptions = [
    canDownloadQr
      ? {
          id: "download",
          label: "Download QR",
          subtitle: "Save PNG image files",
          icon: Download,
        }
      : null,
    canRegenerateQr
      ? {
          id: "regenerate",
          label: "Regenerate",
          subtitle: "Refresh tokens & links",
          icon: RefreshCw,
        }
      : null,
    canDownloadQr || canRegenerateQr
      ? {
          id: "print",
          label: "Print Sheets",
          subtitle: "Export table tent cards",
          icon: Printer,
        }
      : null,
  ].filter(Boolean);

  const getPreviewWidth = (size) => {
    switch (size) {
      case "small":
        return "140px";
      case "large":
        return "280px";
      default:
        return "200px";
    }
  };

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredTables.map((t) => t.id));
      setSelectedTables((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredTables.map((t) => t.id);
      setSelectedTables((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectTable = (tableId) => {
    if (selectedTables.includes(tableId)) {
      setSelectedTables((prev) => prev.filter((id) => id !== tableId));
    } else {
      setSelectedTables((prev) => [...prev, tableId]);
    }
  };

  const handleBatchDownload = async () => {
    setLoading(true);
    setProgress({ current: 0, total: selectedTables.length });
    try {
      for (let i = 0; i < selectedTables.length; i++) {
        const tableId = selectedTables[i];
        await tableService.downloadQRCode(tableId);
        setProgress({ current: i + 1, total: selectedTables.length });
      }
      onSuccess?.(`Successfully downloaded ${selectedTables.length} QR codes`);
    } catch (error) {
      logger.error("Batch download failed:", error);
      addNotification(
        error.response?.data?.message || "Failed to download some QR codes",
        "error",
      );
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleBatchRegenerate = async () => {
    setLoading(true);
    setProgress({ current: 0, total: selectedTables.length });
    try {
      for (let i = 0; i < selectedTables.length; i++) {
        const tableId = selectedTables[i];
        await tableService.regenerateQRCode(tableId);
        setProgress({ current: i + 1, total: selectedTables.length });
      }
      onSuccess?.(`Successfully regenerated ${selectedTables.length} QR codes`);
      setConfirmRegenerate(false);
    } catch (error) {
      logger.error("Batch regeneration failed:", error);
      addNotification(
        error.response?.data?.message || "Failed to regenerate some QR codes",
        "error",
      );
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleBatchPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addNotification("Please allow popups to print QR codes.", "warning");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Batch QR Codes Print</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              margin: 0;
              padding: 20px;
              background: #fff;
            }
            .page {
              page-break-after: always;
              padding: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .qr-item {
              text-align: center;
              padding: 20px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              page-break-inside: avoid;
              background: #fafafa;
            }
            img { max-width: 200px; height: auto; }
            .table-number { font-size: 20px; font-weight: bold; margin: 10px 0; color: #0f172a; }
            .instructions { 
              margin-top: 12px; 
              font-size: 11px; 
              color: #475569;
              text-align: left;
              background: #fff;
              padding: 10px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            @media print {
              .page { page-break-after: always; }
              .qr-item { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${selectedTableData
            .map(
              (table, index) => `
            <div class="page">
              <div class="${printLayout === "multiple" ? "grid" : ""}">
                ${
                  printLayout === "multiple"
                    ? selectedTableData
                        .slice(index, index + 4)
                        .map(
                          (t) => `
                        <div class="qr-item">
                          <div class="table-number">Table ${t.number}</div>
                          ${t.tableName ? `<div style="color: #64748b; font-size: 13px; margin-bottom: 8px;">${t.tableName}</div>` : ""}
                          <img src="${t.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(t.qrUrl || "")}`}" alt="QR Code for Table ${t.number}" />
                          <div style="margin-top: 8px; font-size: 11px; color: #64748b; font-weight: 600;">
                            Scan to view menu & place order
                          </div>
                          ${
                            includeInstructions
                              ? `
                            <div class="instructions">
                              <strong>Quick Steps:</strong>
                              <ol style="margin-top: 4px; padding-left: 16px;">
                                <li>Open smartphone camera</li>
                                <li>Point camera at QR code</li>
                                <li>Tap notification link to order</li>
                              </ol>
                            </div>
                          `
                              : ""
                          }
                        </div>
                      `,
                        )
                        .join("")
                    : `
                  <div class="qr-item">
                    <div class="table-number">Table ${table.number}</div>
                    ${table.tableName ? `<div style="color: #64748b; font-size: 14px; margin-bottom: 10px;">${table.tableName}</div>` : ""}
                    <img src="${table.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(table.qrUrl || "")}`}" alt="QR Code for Table ${table.number}" />
                    <div style="margin-top: 10px; font-size: 12px; color: #64748b; font-weight: 600;">
                      Scan to view menu & place order
                    </div>
                    ${
                      includeInstructions
                        ? `
                      <div class="instructions">
                        <strong>Quick Steps:</strong>
                        <ol style="margin-top: 6px; padding-left: 18px;">
                          <li>Open smartphone camera</li>
                          <li>Point camera at QR code</li>
                          <li>Tap notification link to order</li>
                        </ol>
                      </div>
                    `
                        : ""
                    }
                  </div>
                `
                }
              </div>
            </div>
          `,
            )
            .join("")}
        </body>
      </html>
    `);
    printWindow.document.close();
    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
    };
    window.setTimeout(triggerPrint, 250);
  };

  const handleExecute = () => {
    if (selectedTables.length === 0) return;
    if (operation === "download") {
      handleBatchDownload();
    } else if (operation === "regenerate") {
      setConfirmRegenerate(true);
    } else if (operation === "print") {
      handleBatchPrint();
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select Operation */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Step 1: Choose Action
          </label>
        </div>

        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {operationOptions.map((op) => {
            const Icon = op.icon;
            const isSelected = operation === op.id;
            return (
              <button
                key={op.id}
                onClick={() => {
                  setOperation(op.id);
                  setConfirmRegenerate(false);
                }}
                className={`group flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20"
                    : "border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs"
                }`}
                type="button"
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      isSelected
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <p className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {op.label}
                  </p>
                  <p className={`mt-0.5 text-[11px] ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {op.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Table Selection */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Step 2: Select Target Tables ({selectedTables.length} of {tablesWithQR.length})
          </label>
          <button
            onClick={handleToggleSelectAll}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 transition"
            type="button"
          >
            {allFilteredSelected ? "Deselect All" : "Select All"}
          </button>
        </div>

        {/* Filter Input */}
        {tablesWithQR.length > 3 ? (
          <div className="relative mt-2">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by table number or location zone..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>
        ) : null}

        {/* Table Selection Cards List */}
        <div className="mt-2.5 max-h-60 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 shadow-2xs">
          {fetchingTables ? (
            <div className="p-6 text-center text-xs font-medium text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
              <span>Loading tables from workspace...</span>
            </div>
          ) : filteredTables.length > 0 ? (
            filteredTables.map((t) => {
              const isChecked = selectedTables.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition ${
                    isChecked ? "bg-sky-50/60" : "hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleSelectTable(t.id)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Table {t.number}
                        </span>
                        {t.tableName ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {t.tableName}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>{t.location || "Main Hall"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-full">
                    <Users className="h-3 w-3 text-slate-500" />
                    <span>{t.capacity || "4"} seats</span>
                  </div>
                </label>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs font-medium text-slate-500">
              No matching tables found in workspace.
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Print & Export Preferences */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Step 3: Layout Options
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="QR Code Size"
            value={qrSize}
            onChange={setQrSize}
            options={[
              { value: "small", label: "Small (150x150)" },
              { value: "medium", label: "Medium (220x220)" },
              { value: "large", label: "Large (300x300)" },
            ]}
          />

          {operation === "print" ? (
            <Select
              label="Print Layout"
              value={printLayout}
              onChange={setPrintLayout}
              options={[
                { value: "single", label: "Single per page" },
                { value: "multiple", label: "Multiple per page (Grid)" },
              ]}
            />
          ) : null}
        </div>

        {operation === "print" ? (
          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInstructions}
              onChange={(e) => setIncludeInstructions(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-xs font-semibold text-slate-700">
              Include 4-step quick scanning guide for guests
            </span>
          </label>
        ) : null}
      </div>

      {/* Step 4: Live Print Preview Box (when Print is selected) */}
      {operation === "print" && selectedTableData.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Print Sheet Preview ({selectedTableData.length} cards)
            </label>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-100/50 p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {selectedTableData.map((t) => (
                <div
                  key={`preview-${t.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-2xs space-y-2"
                >
                  <p className="text-xs font-bold text-slate-900">Table {t.number}</p>
                  <div className="flex items-center justify-center p-2 rounded-lg bg-slate-50 border border-dashed border-slate-200">
                    <img
                      src={t.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(t.qrUrl || "")}`}
                      alt={`Table ${t.number}`}
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{t.location || "Main Hall"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Progress Bar */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Executing batch {operation}...</span>
            <span>
              {progress.current} of {progress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-sky-600 transition-all duration-300 rounded-full"
              style={{
                width: `${(progress.current / (progress.total || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Warning Box for Batch Regenerate */}
      {confirmRegenerate && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-xs sm:text-sm">
                Confirm Batch QR Regeneration
              </p>
              <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                This will replace the QR codes and URL tokens for{" "}
                <strong>{selectedTables.length} selected tables</strong>. Existing printed media will stop working immediately.
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleBatchRegenerate}
                  disabled={loading}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50 shadow-2xs"
                  type="button"
                >
                  {loading ? "Regenerating..." : "Yes, Regenerate All"}
                </button>
                <button
                  onClick={() => setConfirmRegenerate(false)}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Actions */}
      <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
        <button
          onClick={onClose}
          className="rounded-xl border border-slate-300/80 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
          type="button"
        >
          Cancel
        </button>
        <button
          onClick={handleExecute}
          disabled={selectedTables.length === 0 || loading || confirmRegenerate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          {loading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              {operation === "download" && <Download className="h-3.5 w-3.5" />}
              {operation === "regenerate" && <RefreshCw className="h-3.5 w-3.5" />}
              {operation === "print" && <Printer className="h-3.5 w-3.5" />}
              <span>
                {operation === "download" && `Download (${selectedTables.length})`}
                {operation === "regenerate" && `Regenerate (${selectedTables.length})`}
                {operation === "print" && `Print (${selectedTables.length})`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
