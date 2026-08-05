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
  Shield,
  FileText,
  Sparkles,
  ExternalLink,
  Info,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { logger } from "../../common/utils/logger.js";
import tableService from "../../common/services/TableService";
import Select from "../components/common/Select";
import { useAdmin } from "../context/AdminContext";
import { withTenantQueryParams } from "../../common/utils/qrImage";
import { useAuth } from "../../common/context/AuthContext";

const QR_SIZE_OPTIONS = [
  { value: "small", label: "Small (150x150)" },
  { value: "medium", label: "Medium (220x220)" },
  { value: "large", label: "Large (300x300)" },
  { value: "xlarge", label: "Extra Large (350x350)" },
];

const PRINT_LAYOUT_OPTIONS = [
  { value: "single", label: "Single per page (Full Card)" },
  { value: "multiple", label: "Multiple per page (Grid)" },
  { value: "table-tent", label: "Table Tent Folded Style" },
  { value: "sticker", label: "Sticker Sheet (Compact)" },
];

const getQrSizePx = (size) => {
  switch (size) {
    case "small":
      return 150;
    case "large":
      return 300;
    case "xlarge":
      return 350;
    case "medium":
    default:
      return 220;
  }
};

const getQrPreviewWidth = (size) => {
  return `${getQrSizePx(size)}px`;
};

const getQrRouteDetails = (qrUrl = "") => {
  if (!qrUrl) {
    return { host: "", path: "", tenantPath: "" };
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
    return { host: "", path: qrUrl, tenantPath: "" };
  }
};

export function QRManagement({ table, onClose, onSuccess }) {
  const { addNotification } = useAdmin();
  const { hasPermission } = useAuth();
  const canViewQr = hasPermission("table.qr_view");
  const canDownloadQr = hasPermission("table.qr_download");
  const canRegenerateQr = hasPermission("table.qr_regenerate");
  const canRefreshQrToken = hasPermission("table.qr_refresh_token");

  const [loading, setLoading] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [qrSize, setQrSize] = useState("medium");
  const [printLayout, setPrintLayout] = useState("single");
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [activeTab, setActiveTab] = useState("preview");
  const [tokenStatus, setTokenStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

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
    if (!canViewQr) {
      setTokenStatus(null);
      return;
    }
    try {
      const response = await tableService.getQRTokenStatus(table.id);
      if (response.success) {
        setTokenStatus(response.data);
      }
    } catch (error) {
      logger.error("Failed to load token status:", error);
    }
  }, [canViewQr, table.id]);

  useEffect(() => {
    setImageError(false);
    setTableState({
      ...table,
      qrCode: withTenantQueryParams(table?.qrCode),
    });
    loadTokenStatus();
  }, [loadTokenStatus, table]);

  const handleRegenerateQR = async () => {
    if (!canRegenerateQr) return;
    setLoading(true);
    try {
      const response = await tableService.regenerateQRCode(table.id);
      if (response.success) {
        setImageError(false);
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
    if (!canDownloadQr) return;
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
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background: #fff;
            }
            .container {
              text-align: center;
              max-width: 480px;
              width: 100%;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
            }
            .qr-container {
              margin: 20px 0;
              padding: 20px;
              border: 2px dashed #cbd5e1;
              border-radius: 12px;
              display: flex;
              justify-content: center;
              background: #fafafa;
            }
            img, svg { max-width: 100%; height: auto; }
            .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 6px 0; }
            .subtitle { color: #64748b; font-size: 14px; margin: 4px 0; }
            .instructions {
              margin-top: 20px;
              padding: 16px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              text-align: left;
              font-size: 13px;
              color: #334155;
            }
            .instructions ol { margin-top: 8px; padding-left: 20px; }
            .instructions li { margin-bottom: 4px; }
            .footer { margin-top: 24px; color: #94a3b8; font-size: 11px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            ${includeLogo ? `<div style="font-[10px]; font-weight:800; letter-spacing:2px; color:#0284c7; text-transform:uppercase;">Tableloom Workspace</div>` : ""}
            <div class="title">Table ${table.number}</div>
            <div class="subtitle">${table.tableName || "Dining Table"}</div>
            <div class="qr-container">
              ${
                tableState.qrCode && !imageError
                  ? `<img src="${tableState.qrCode}" alt="QR Code for Table ${table.number}" />`
                  : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tableState.qrUrl || "")}" alt="QR Code" />`
              }
            </div>
            <div class="subtitle" style="font-weight:600; color:#334155;">Scan with your phone camera to view menu & order</div>
            ${
              includeInstructions
                ? `
              <div class="instructions">
                <strong>Quick Instructions:</strong>
                <ol>
                  <li>Open your smartphone camera app</li>
                  <li>Point your camera at the QR code above</li>
                  <li>Tap the link notification that appears on screen</li>
                  <li>Browse restaurant menu and place order directly</li>
                </ol>
              </div>
            `
                : ""
            }
            <div class="footer">
              ${tableState.qrUrl ? `Route: ${tableState.qrUrl}<br />` : ""}
              Valid until: ${new Date(tableState.tokenExpiry || Date.now()).toLocaleDateString()}
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
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
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
    if (!canRefreshQrToken) return;
    setLoading(true);
    try {
      const response = await tableService.refreshQRToken(table.id);
      if (response.success) {
        setImageError(false);
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
        wrapper: "border-rose-200/80 bg-rose-50/70",
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
        wrapper: "border-amber-200/80 bg-amber-50/70",
        icon: Clock,
        iconClass: "text-amber-600",
        titleClass: "text-amber-900",
        textClass: "text-amber-700",
        label: "Expiring soon",
        description: `Expires in ${effectiveDaysRemaining} day${effectiveDaysRemaining === 1 ? "" : "s"}.`,
      };
    }
    return {
      wrapper: "border-emerald-200/80 bg-emerald-50/70",
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
    <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl sm:max-h-[88vh]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur-md sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl tracking-tight">
                QR Code Management
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                Table {table.number}
                {table.tableName ? ` • ${table.tableName}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100/80 p-1">
          {[
            { id: "preview", label: "Preview", icon: Eye },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 px-4 text-xs font-semibold transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-5">
          {/* Token Status Banner */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 ${tokenStatusMeta.wrapper}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <TokenStatusIcon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${tokenStatusMeta.iconClass}`}
                />
                <div>
                  <p className={`font-semibold text-sm sm:text-base ${tokenStatusMeta.titleClass}`}>
                    Token status: {tokenStatusMeta.label}
                  </p>
                  <p className={`mt-0.5 text-xs sm:text-sm ${tokenStatusMeta.textClass}`}>
                    {tokenStatusMeta.description}
                    {tableState.tokenExpiry
                      ? ` Valid until ${new Date(tableState.tokenExpiry).toLocaleDateString()}.`
                      : ""}
                  </p>
                </div>
              </div>

              {canRefreshQrToken ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                  disabled={loading}
                  onClick={handleRefreshToken}
                  type="button"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh Token
                </button>
              ) : null}
            </div>
          </div>

          {activeTab === "preview" ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              {/* QR Preview Column */}
              <section className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">QR Preview</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Optimized for mobile scanning and table-side access.
                  </p>
                </div>

                {/* QR Display Canvas */}
                <div className="mt-4 flex min-h-[260px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                  {tableState.qrCode && !imageError ? (
                    <img
                      alt={`QR Code for Table ${table.number}`}
                      className="h-auto max-w-full rounded-lg"
                      src={tableState.qrCode}
                      onError={() => setImageError(true)}
                      style={{
                        width: getQrPreviewWidth(qrSize),
                      }}
                    />
                  ) : tableState.qrUrl ? (
                    <div className="flex flex-col items-center justify-center p-2">
                      <QRCodeSVG
                        value={tableState.qrUrl}
                        size={getQrSizePx(qrSize)}
                        level="H"
                        includeMargin={true}
                        className="mx-auto rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <QrCode className="mx-auto mb-3 h-14 w-14 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No QR code available
                      </p>
                    </div>
                  )}
                </div>

                {/* QR Size selector ONLY */}
                <div className="mt-4">
                  <Select
                    label="QR Code Size"
                    onChange={setQrSize}
                    options={QR_SIZE_OPTIONS}
                    value={qrSize}
                  />
                </div>
              </section>

              {/* QR Details Column */}
              <section className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
                  <h3 className="font-bold text-slate-900 text-base">QR Details</h3>

                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Table Number", value: `TABLE ${table.number}` },
                      { label: "Table Name", value: table.tableName || "—" },
                      { label: "Location", value: table.location || "—" },
                      {
                        label: "Capacity",
                        value: table.capacity ? `${table.capacity} people` : "—",
                      },
                      {
                        label: "Tenant Route",
                        value: qrRouteDetails.tenantPath || "Not available",
                        mono: true,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-xs font-medium text-slate-500">
                          {item.label}
                        </span>
                        <span
                          className={`text-xs font-semibold text-slate-900 ${item.mono ? "break-all font-mono text-slate-700" : ""}`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* QR URL Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
                  <h3 className="font-bold text-slate-900 text-base">QR URL</h3>
                  <div className="mt-3 rounded-xl bg-slate-900 p-3.5 text-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                      Customer Entry Link
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-emerald-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                      {tableState.qrUrl || "Not available"}
                    </p>
                  </div>

                  <button
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-sky-700 disabled:opacity-50 shadow-2xs"
                    disabled={!tableState.qrUrl}
                    onClick={handleCopyQRUrl}
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied to Clipboard!" : "Copy QR URL"}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  {canDownloadQr ? (
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-2xs"
                      onClick={handleDownloadQR}
                      type="button"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  ) : null}
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
                    onClick={handlePrintQR}
                    type="button"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 shadow-2xs"
                    disabled={!tableState.qrUrl}
                    onClick={handleEmailQR}
                    type="button"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 shadow-2xs"
                    disabled={!tableState.qrUrl}
                    onClick={handleCopyQRUrl}
                    type="button"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                </div>
              </section>
            </div>
          ) : (
            /* Settings Tab */
            <div className="space-y-5">
              {/* Section 1: Print & Media Preferences */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                      <Printer className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Print & Layout Settings</h3>
                      <p className="text-xs text-slate-500">
                        Customize how table QR codes are formatted for printing.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handlePrintQR}
                    className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    type="button"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-500" />
                    <span>Test Print</span>
                  </button>
                </div>

                <div className="mt-2">
                  <Select
                    label="Print Layout"
                    onChange={setPrintLayout}
                    options={PRINT_LAYOUT_OPTIONS}
                    value={printLayout}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  {/* Interactive Toggle Card 1 */}
                  <div
                    onClick={() => setIncludeInstructions((prev) => !prev)}
                    className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition ${
                      includeInstructions
                        ? "border-sky-300 bg-sky-50/50 shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        includeInstructions ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"
                      }`}>
                        {includeInstructions && <CheckCircle className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Include Quick Scanning Instructions
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                          Prints a 4-step guest guide (Camera &rarr; Point &rarr; Tap Link &rarr; Order) on exported print cards.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Toggle Card 2 */}
                  <div
                    onClick={() => setIncludeLogo((prev) => !prev)}
                    className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition ${
                      includeLogo
                        ? "border-sky-300 bg-sky-50/50 shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        includeLogo ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"
                      }`}>
                        {includeLogo && <CheckCircle className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Include Restaurant Branding Header
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                          Embeds restaurant workspace branding header on printable tent cards and stickers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Regenerate QR Danger Card */}
              <section className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/80 to-amber-100/30 p-5 shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0 border border-amber-200">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-950 text-base">
                      Regenerate Table QR Code
                    </h3>
                    <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                      Regenerating creates a brand-new security token and URL. Any existing printed QR table tents or stickers for Table {table.number} will stop working instantly and must be replaced.
                    </p>

                    {canRegenerateQr && !showRegenerateConfirm ? (
                      <button
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700 shadow-2xs"
                        onClick={() => setShowRegenerateConfirm(true)}
                        type="button"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Regenerate QR Code
                      </button>
                    ) : canRegenerateQr ? (
                      <div className="mt-4 rounded-xl border border-amber-300 bg-white p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                          <Info className="h-4 w-4 text-amber-600" />
                          <span>Are you sure you want to replace this table&apos;s QR code?</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          <button
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50 shadow-2xs"
                            disabled={loading}
                            onClick={handleRegenerateQR}
                            type="button"
                          >
                            {loading ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                Yes, Replace QR Code
                              </>
                            )}
                          </button>
                          <button
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            onClick={() => setShowRegenerateConfirm(false)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t border-slate-200/80 bg-slate-50/90 px-5 py-3.5 backdrop-blur-md sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Table {table.number} • Status: <strong className="text-slate-800 capitalize">{table.status}</strong>
          </span>
          <button
            className="w-full rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 shadow-2xs sm:w-auto"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
