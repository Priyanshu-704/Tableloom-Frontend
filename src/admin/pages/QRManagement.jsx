import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  Mail,
  Printer,
  QrCode,
  RefreshCw,
  Settings,
  Share2,
  X,
} from "lucide-react";
import { logger } from "../../common/utils/logger.js";
import tableService from "../../common/services/TableService";
import Select from "../components/common/Select";
import { useAdmin } from "../context/AdminContext";
import { withTenantQueryParams } from "../../common/utils/qrImage";
const QR_SIZE_OPTIONS = [
  {
    value: "small",
    label: "Small (150x150)",
  },
  {
    value: "medium",
    label: "Medium (250x250)",
  },
  {
    value: "large",
    label: "Large (350x350)",
  },
  {
    value: "xlarge",
    label: "Extra Large (500x500)",
  },
];
const QR_FORMAT_OPTIONS = [
  {
    value: "png",
    label: "PNG - High Quality",
  },
  {
    value: "svg",
    label: "SVG - Vector",
  },
  {
    value: "pdf",
    label: "PDF - Printable",
  },
];
const PRINT_LAYOUT_OPTIONS = [
  {
    value: "single",
    label: "Single per page",
  },
  {
    value: "multiple",
    label: "Multiple per page",
  },
  {
    value: "table-tent",
    label: "Table Tent Style",
  },
  {
    value: "sticker",
    label: "Sticker Sheet",
  },
];
const getQrPreviewWidth = (size) => {
  switch (size) {
    case "small":
      return "150px";
    case "large":
      return "350px";
    case "xlarge":
      return "500px";
    case "medium":
    default:
      return "250px";
  }
};
const getQrRouteDetails = (qrUrl = "") => {
  if (!qrUrl) {
    return {
      host: "",
      path: "",
      tenantPath: "",
    };
  }
  try {
    const parsed = new URL(qrUrl);
    const path = parsed.pathname || "";
    const segments = path.split("/").filter(Boolean);
    const tenantPath =
      segments.length >= 2 ? `/${segments[0]}/${segments[1]}` : "";
    return {
      host: parsed.origin,
      path,
      tenantPath,
    };
  } catch {
    return {
      host: "",
      path: qrUrl,
      tenantPath: "",
    };
  }
};
export function QRManagement({ table, onClose, onSuccess }) {
  const { addNotification } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [qrSize, setQrSize] = useState("medium");
  const [qrFormat, setQrFormat] = useState("png");
  const [printLayout, setPrintLayout] = useState("single");
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [activeTab, setActiveTab] = useState("preview");
  const [tokenStatus, setTokenStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [tableState, setTableState] = useState({
    ...table,
    qrCode: withTenantQueryParams(table?.qrCode),
  });
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, []);
  const loadTokenStatus = useCallback(async () => {
    try {
      const response = await tableService.getQRTokenStatus(table.id);
      if (response.success) {
        setTokenStatus(response.data);
      }
    } catch (error) {
      logger.error("Failed to load token status:", error);
    }
  }, [table.id]);
  useEffect(() => {
    setTableState({
      ...table,
      qrCode: withTenantQueryParams(table?.qrCode),
    });
    loadTokenStatus();
  }, [loadTokenStatus, table]);
  const handleRegenerateQR = async () => {
    setLoading(true);
    try {
      const response = await tableService.regenerateQRCode(table.id);
      if (response.success) {
        setTableState((current) => ({
          ...current,
          ...response.data,
          qrCode: withTenantQueryParams(response.data?.qrCode),
        }));
        await loadTokenStatus();
        onSuccess?.("QR code regenerated successfully");
        setShowRegenerateConfirm(false);
      }
    } catch (error) {
      logger.error("Failed to regenerate QR:", error);
      addNotification(
        error.response?.data?.message || "Failed to regenerate QR code",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };
  const handleDownloadQR = async () => {
    try {
      await tableService.downloadQRCode(table.id);
      addNotification("QR code downloaded successfully.", "success");
    } catch (error) {
      logger.error("Failed to download QR:", error);
      addNotification(
        error.response?.data?.message || "Failed to download QR code",
        "error",
      );
    }
  };
  const handlePrintQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addNotification("Please allow popups to print the QR code.", "warning");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - Table ${table.number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 500px;
            }
            .qr-container {
              margin: 20px 0;
              padding: 20px;
              border: 2px dashed #ccc;
              border-radius: 10px;
            }
            img { max-width: 100%; height: auto; }
            .title { font-size: 24px; font-weight: bold; margin: 10px 0; }
            .subtitle { color: #666; margin: 5px 0; }
            .instructions {
              margin-top: 20px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 5px;
              text-align: left;
            }
            .footer { margin-top: 30px; color: #999; font-size: 12px; word-break: break-word; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="title">Table ${table.number}</div>
            <div class="subtitle">${table.tableName || ""}</div>
            <div class="qr-container">
              <img src="${tableState.qrCode || ""}" alt="QR Code for Table ${table.number}" />
            </div>
            <div class="subtitle">Scan to view menu & place order</div>
            ${
              includeInstructions
                ? `
              <div class="instructions">
                <strong>Instructions:</strong>
                <ol style="margin-top: 5px; padding-left: 20px;">
                  <li>Open your phone's camera app</li>
                  <li>Point at the QR code above</li>
                  <li>Tap the notification that appears</li>
                  <li>Browse menu and place order</li>
                </ol>
              </div>
            `
                : ""
            }
            <div class="footer">
              ${tableState.qrUrl ? `Route: ${tableState.qrUrl}<br />` : ""}
              QR Code valid until: ${new Date(tableState.tokenExpiry || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
    };
    const imageLoadPromises = Array.from(printWindow.document.images).map(
      (image) => {
        if (image.complete) {
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, {
            once: true,
          });
          image.addEventListener("error", resolve, {
            once: true,
          });
        });
      },
    );
    Promise.all(imageLoadPromises)
      .then(() => {
        addNotification("Print window opened successfully.", "success");
        window.setTimeout(triggerPrint, 150);
      })
      .catch(() => {
        addNotification("Print window opened successfully.", "success");
        window.setTimeout(triggerPrint, 150);
      });
  };
  const handleCopyQRUrl = async () => {
    if (!tableState.qrUrl) return;
    try {
      await navigator.clipboard.writeText(tableState.qrUrl);
      setCopied(true);
      addNotification("QR URL copied to clipboard.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      addNotification("Could not copy the QR URL.", "error");
    }
  };
  const handleEmailQR = () => {
    const subject = `QR Code for Table ${table.number}`;
    const body = `Here is the QR code URL for Table ${table.number}:\n\n${tableState.qrUrl || ""}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    addNotification("Email draft opened successfully.", "success");
  };
  const handleRefreshToken = async () => {
    setLoading(true);
    try {
      const response = await tableService.refreshQRToken(table.id);
      if (response.success) {
        setTableState((current) => ({
          ...current,
          ...response.data,
          qrCode: withTenantQueryParams(
            response.data?.qrCode || current.qrCode,
          ),
        }));
        await loadTokenStatus();
        onSuccess?.("Token refreshed successfully");
      }
    } catch (error) {
      logger.error("Failed to refresh token:", error);
      addNotification(
        error.response?.data?.message || "Failed to refresh token",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };
  const effectiveDaysRemaining =
    tokenStatus?.daysRemaining ?? tableState.tokenDaysRemaining ?? 0;
  const effectiveTokenValid =
    tokenStatus?.tokenValid ?? !tableState.tokenExpired;
  const tokenStatusMeta = useMemo(() => {
    if (
      !tableState.tokenExpiry ||
      !effectiveTokenValid ||
      effectiveDaysRemaining <= 0
    ) {
      return {
        wrapper: "border-rose-200 bg-rose-50",
        icon: AlertTriangle,
        iconClass: "text-rose-600",
        titleClass: "text-rose-900",
        textClass: "text-rose-700",
        label: "Expired",
        description:
          "Token has expired. Regenerate the QR to keep scans working.",
      };
    }
    if (effectiveDaysRemaining <= 7) {
      return {
        wrapper: "border-amber-200 bg-amber-50",
        icon: Clock,
        iconClass: "text-amber-600",
        titleClass: "text-amber-900",
        textClass: "text-amber-700",
        label: "Expiring soon",
        description: `Expires in ${effectiveDaysRemaining} day${effectiveDaysRemaining === 1 ? "" : "s"}.`,
      };
    }
    return {
      wrapper: "border-emerald-200 bg-emerald-50",
      icon: CheckCircle2,
      iconClass: "text-emerald-600",
      titleClass: "text-emerald-900",
      textClass: "text-emerald-700",
      label: "Valid",
      description: `Expires in ${effectiveDaysRemaining} day${effectiveDaysRemaining === 1 ? "" : "s"}.`,
    };
  }, [effectiveDaysRemaining, effectiveTokenValid, tableState.tokenExpiry]);
  const TokenStatusIcon = tokenStatusMeta.icon;
  const qrRouteDetails = useMemo(
    () => getQrRouteDetails(tableState.qrUrl),
    [tableState.qrUrl],
  );
  return (
    <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary-50 p-3">
              <QrCode className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                QR Code Management
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Table {table.number}
                {table.tableName ? ` • ${table.tableName}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            {
              id: "preview",
              label: "Preview",
              icon: Eye,
            },
            {
              id: "settings",
              label: "Settings",
              icon: Settings,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${activeTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="space-y-5">
          <div
            className={`rounded-3xl border p-4 sm:p-5 ${tokenStatusMeta.wrapper}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <TokenStatusIcon
                  className={`mt-0.5 h-5 w-5 ${tokenStatusMeta.iconClass}`}
                />
                <div>
                  <p className={`font-semibold ${tokenStatusMeta.titleClass}`}>
                    Token status: {tokenStatusMeta.label}
                  </p>
                  <p className={`mt-1 text-sm ${tokenStatusMeta.textClass}`}>
                    {tokenStatusMeta.description}
                    {tableState.tokenExpiry
                      ? ` Valid until ${new Date(tableState.tokenExpiry).toLocaleDateString()}.`
                      : ""}
                  </p>
                </div>
              </div>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                disabled={loading}
                onClick={handleRefreshToken}
                type="button"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh Token
              </button>
            </div>
          </div>

          {activeTab === "preview" ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">QR Preview</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Optimized for mobile scanning and table-side access.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex min-h-75 items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-4">
                  {tableState.qrCode ? (
                    <img
                      alt={`QR Code for Table ${table.number}`}
                      className="h-auto max-w-full"
                      src={tableState.qrCode}
                      style={{
                        width: getQrPreviewWidth(qrSize),
                      }}
                    />
                  ) : (
                    <div className="py-12 text-center">
                      <QrCode className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        No QR code available
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Select
                    label="QR Code Size"
                    onChange={setQrSize}
                    options={QR_SIZE_OPTIONS}
                    value={qrSize}
                  />
                  <Select
                    label="Format"
                    onChange={setQrFormat}
                    options={QR_FORMAT_OPTIONS}
                    value={qrFormat}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="font-semibold text-slate-900">QR Details</h3>

                  <div className="mt-4 space-y-3">
                    {[
                      {
                        label: "Table Number",
                        value: table.number,
                      },
                      {
                        label: "Table Name",
                        value: table.tableName || "—",
                      },
                      {
                        label: "Location",
                        value: table.location || "—",
                      },
                      {
                        label: "Capacity",
                        value: table.capacity
                          ? `${table.capacity} people`
                          : "—",
                      },
                      {
                        label: "Tenant Route",
                        value: qrRouteDetails.tenantPath || "Not available",
                        mono: true,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col gap-1 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-sm text-slate-500">
                          {item.label}
                        </span>
                        <span
                          className={`text-sm font-medium text-slate-900 ${item.mono ? "break-all font-mono" : ""}`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="font-semibold text-slate-900">QR URL</h3>
                  <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-4 text-sm text-slate-100">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-sky-200">
                      Customer Entry Link
                    </p>
                    <p className="mt-2 break-all font-mono text-[13px]">
                      {tableState.qrUrl || "Not available"}
                    </p>
                    {qrRouteDetails.host ? (
                      <p className="mt-3 break-all text-xs text-slate-300">
                        {qrRouteDetails.host}
                        {qrRouteDetails.path}
                      </p>
                    ) : null}
                  </div>

                  <button
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                    disabled={!tableState.qrUrl}
                    onClick={handleCopyQRUrl}
                    type="button"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied" : "Copy QR URL"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
                    onClick={handleDownloadQR}
                    type="button"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                    onClick={handlePrintQR}
                    type="button"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                    disabled={!tableState.qrUrl}
                    onClick={handleEmailQR}
                    type="button"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                    disabled={!tableState.qrUrl}
                    onClick={handleCopyQRUrl}
                    type="button"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="font-semibold text-slate-900">Print Settings</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Print Layout"
                    onChange={setPrintLayout}
                    options={PRINT_LAYOUT_OPTIONS}
                    value={printLayout}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <input
                      checked={includeInstructions}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      onChange={(event) =>
                        setIncludeInstructions(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-slate-700">
                      Include short usage instructions for guests.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <input
                      checked={includeLogo}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      onChange={(event) => setIncludeLogo(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-sm text-slate-700">
                      Include restaurant branding in the printable layout.
                    </span>
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900">
                      Regenerate QR Code
                    </h3>
                    <p className="mt-1 text-sm text-amber-800">
                      Regenerating invalidates the current QR code. Any already
                      printed copies will stop working until they are replaced.
                    </p>

                    {!showRegenerateConfirm ? (
                      <button
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 sm:w-auto"
                        onClick={() => setShowRegenerateConfirm(true)}
                        type="button"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate QR Code
                      </button>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-medium text-amber-900">
                          Are you sure you want to replace the current QR?
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                            disabled={loading}
                            onClick={handleRegenerateQR}
                            type="button"
                          >
                            {loading ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Yes, Regenerate
                              </>
                            )}
                          </button>
                          <button
                            className="rounded-2xl border border-amber-300 bg-white px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                            onClick={() => setShowRegenerateConfirm(false)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <div className="flex justify-end">
          <button
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
