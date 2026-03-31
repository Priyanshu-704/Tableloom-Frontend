import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useEffect, useState } from "react";
import { QrCode, Download, RefreshCw, AlertTriangle, CheckCircle, Clock, Copy, Printer, Mail, Share2, X, Eye, Settings } from "lucide-react";
import tableService from "../../common/services/TableService";
import Select from "../components/common/Select";
import { useAdmin } from "../context/AdminContext";
const QR_SIZE_OPTIONS = [{
  value: "small",
  label: "Small (150x150)"
}, {
  value: "medium",
  label: "Medium (250x250)"
}, {
  value: "large",
  label: "Large (350x350)"
}, {
  value: "xlarge",
  label: "Extra Large (500x500)"
}];
const QR_FORMAT_OPTIONS = [{
  value: "png",
  label: "PNG - High Quality"
}, {
  value: "svg",
  label: "SVG - Vector"
}, {
  value: "pdf",
  label: "PDF - Printable"
}];
const PRINT_LAYOUT_OPTIONS = [{
  value: "single",
  label: "Single per page"
}, {
  value: "multiple",
  label: "Multiple per page"
}, {
  value: "table-tent",
  label: "Table Tent Style"
}, {
  value: "sticker",
  label: "Sticker Sheet"
}];
export function QRManagement({
  table,
  onClose,
  onSuccess
}) {
  const {
    addNotification
  } = useAdmin();
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
  const [tableState, setTableState] = useState(table);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
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
  React.useEffect(() => {
    setTableState(table);
    loadTokenStatus();
  }, [loadTokenStatus, table]);
  const handleRegenerateQR = async () => {
    setLoading(true);
    try {
      const response = await tableService.regenerateQRCode(table.id);
      if (response.success) {
        setTableState(current => ({
          ...current,
          ...response.data
        }));
        await loadTokenStatus();
        onSuccess?.("QR code regenerated successfully");
        setShowRegenerateConfirm(false);
      }
    } catch (error) {
      logger.error("Failed to regenerate QR:", error);
      addNotification(error.response?.data?.message || "Failed to regenerate QR code", "error");
    } finally {
      setLoading(false);
    }
  };
  const handleDownloadQR = async () => {
    try {
      await tableService.downloadQRCode(table.id);
    } catch (error) {
      logger.error("Failed to download QR:", error);
      addNotification(error.response?.data?.message || "Failed to download QR code", "error");
    }
  };
  const handlePrintQR = () => {
    const printWindow = window.open("", "_blank");
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
            .footer { margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="title">Table ${table.number}</div>
            <div class="subtitle">${table.tableName || ""}</div>
            <div class="qr-container">
              <img src="${table.qrCode}" alt="QR Code for Table ${table.number}" />
            </div>
            <div class="subtitle">Scan to view menu & place order</div>
            ${includeInstructions ? `
              <div class="instructions">
                <strong>📱 Instructions:</strong>
                <ol style="margin-top: 5px; padding-left: 20px;">
                  <li>Open your phone's camera app</li>
                  <li>Point at the QR code above</li>
                  <li>Tap the notification that appears</li>
                  <li>Browse menu and place order</li>
                </ol>
              </div>
            ` : ""}
            <div class="footer">
              QR Code valid until: ${new Date(table.tokenExpiry).toLocaleDateString()}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };
  const handleCopyQRUrl = () => {
    if (!tableState.qrUrl) return;
    navigator.clipboard.writeText(tableState.qrUrl);
    setCopied(true);
    addNotification("QR URL copied to clipboard.", "success");
    setTimeout(() => setCopied(false), 2000);
  };
  const handleEmailQR = () => {
    const subject = `QR Code for Table ${table.number}`;
    const body = `Here is the QR code URL for Table ${table.number}:\n\n${tableState.qrUrl || ""}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const handleRefreshToken = async () => {
    setLoading(true);
    try {
      const response = await tableService.refreshQRToken(table.id);
      if (response.success) {
        setTableState(current => ({
          ...current,
          ...response.data
        }));
        await loadTokenStatus();
        onSuccess?.("Token refreshed successfully");
      }
    } catch (error) {
      logger.error("Failed to refresh token:", error);
      addNotification(error.response?.data?.message || "Failed to refresh token", "error");
    } finally {
      setLoading(false);
    }
  };
  const getTokenStatusColor = () => {
    const days = tokenStatus?.daysRemaining ?? tableState.tokenDaysRemaining ?? 0;
    const tokenValid = tokenStatus?.tokenValid ?? !tableState.tokenExpired;
    if (!tableState.tokenExpiry || !tokenValid || days <= 0) {
      return {
        wrapper: "bg-red-50 border-red-200",
        icon: "text-red-600",
        title: "text-red-800",
        text: "text-red-600"
      };
    }
    if (days <= 7) {
      return {
        wrapper: "bg-orange-50 border-orange-200",
        icon: "text-orange-600",
        title: "text-orange-800",
        text: "text-orange-600"
      };
    }
    return {
      wrapper: "bg-green-50 border-green-200",
      icon: "text-green-600",
      title: "text-green-800",
      text: "text-green-600"
    };
  };
  const getTokenStatusIcon = () => {
    const days = tokenStatus?.daysRemaining ?? tableState.tokenDaysRemaining ?? 0;
    const tokenValid = tokenStatus?.tokenValid ?? !tableState.tokenExpired;
    if (!tokenValid || days <= 0) return AlertTriangle;
    if (days <= 7) return Clock;
    return CheckCircle;
  };
  const effectiveDaysRemaining = tokenStatus?.daysRemaining ?? tableState.tokenDaysRemaining ?? 0;
  const effectiveTokenValid = tokenStatus?.tokenValid ?? !tableState.tokenExpired;
  const TokenStatusIcon = getTokenStatusIcon();
  const tokenStatusColor = getTokenStatusColor();
  return <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      {}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <QrCode className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              QR Code Management - Table {table.number}
            </h2>
            {table.tableName && <p className="text-sm text-gray-600">{table.tableName}</p>}
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {}
      <div className="border-b border-gray-200 px-6">
        <div className="flex space-x-6">
          {[{
          id: "preview",
          label: "Preview & Download",
          icon: Eye
        }, {
          id: "settings",
          label: "Settings",
          icon: Settings
        }].map(tab => {
          const Icon = tab.icon;
          return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${activeTab === tab.id ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>;
        })}
        </div>
      </div>

      <div className="p-6">
        {}
        <div className={`mb-6 rounded-lg border p-4 ${tokenStatusColor.wrapper}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TokenStatusIcon className={`h-5 w-5 ${tokenStatusColor.icon}`} />
              <div>
                <p className={`font-medium ${tokenStatusColor.title}`}>
                  Token Status:{" "}
                  {effectiveTokenValid && effectiveDaysRemaining > 0 ? "Valid" : "Expired"}
                </p>
                <p className={`text-sm ${tokenStatusColor.text}`}>
                  {effectiveTokenValid && effectiveDaysRemaining > 0 ? `Expires in ${effectiveDaysRemaining} days (${new Date(tableState.tokenExpiry).toLocaleDateString()})` : "Token has expired - Regenerate to continue"}
                </p>
              </div>
            </div>
            <button onClick={handleRefreshToken} disabled={loading} className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Token</span>
            </button>
          </div>
        </div>

        {}
        {activeTab === "preview" && <div className="space-y-6">
            {}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">QR Code Preview</h3>
                <div className="border-2 border-gray-200 rounded-lg p-6 flex justify-center bg-gray-50">
                  {tableState.qrCode ? <img src={tableState.qrCode} alt={`QR Code for Table ${table.number}`} className="max-w-full h-auto" style={{
                width: qrSize === "small" ? "150px" : qrSize === "medium" ? "250px" : qrSize === "large" ? "350px" : "500px"
              }} /> : <div className="text-center py-12">
                      <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No QR code available</p>
                    </div>}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">QR Code Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Table Number</span>
                    <span className="text-sm font-medium text-gray-900">
                      {table.number}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Table Name</span>
                    <span className="text-sm font-medium text-gray-900">
                      {table.tableName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Location</span>
                    <span className="text-sm font-medium text-gray-900">
                      {table.location}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Capacity</span>
                    <span className="text-sm font-medium text-gray-900">
                      {table.capacity} people
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-gray-600">QR URL</span>
                    <span className="flex items-center gap-2">
                      <span className="max-w-[180px] truncate text-sm font-medium text-gray-900">
                        {tableState.qrUrl || "Not available"}
                      </span>
                      <button onClick={handleCopyQRUrl} disabled={!tableState.qrUrl} className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 disabled:text-gray-400">
                        <Copy className="h-4 w-4" />
                        <span className="text-sm">
                          {copied ? "Copied!" : "Copy"}
                        </span>
                      </button>
                    </span>
                  </div>
                </div>

                {}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleDownloadQR} className="flex items-center justify-center space-x-2 p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button onClick={handlePrintQR} className="flex items-center justify-center space-x-2 p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                  <button onClick={handleEmailQR} disabled={!tableState.qrUrl} className="flex items-center justify-center space-x-2 p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </button>
                  <button onClick={handleCopyQRUrl} disabled={!tableState.qrUrl} className="flex items-center justify-center space-x-2 p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>

            {}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Preview Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Select label="QR Code Size" value={qrSize} onChange={setQrSize} options={QR_SIZE_OPTIONS} />
                <Select label="Format" value={qrFormat} onChange={setQrFormat} options={QR_FORMAT_OPTIONS} />
              </div>
            </div>
          </div>}

        {activeTab === "settings" && <div className="space-y-6">
            {}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Print Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Print Layout" value={printLayout} onChange={setPrintLayout} options={PRINT_LAYOUT_OPTIONS} />
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" checked={includeInstructions} onChange={e => setIncludeInstructions(e.target.checked)} className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">
                    Include usage instructions
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" checked={includeLogo} onChange={e => setIncludeLogo(e.target.checked)} className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">
                    Include restaurant logo
                  </span>
                </label>
              </div>
            </div>

            {}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Regenerate QR Code
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Warning: Regenerating will invalidate the existing QR code
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      All existing printed QR codes for this table will stop
                      working. Customers will need to scan the new QR code to
                      access the menu.
                    </p>
                    {!showRegenerateConfirm ? <button onClick={() => setShowRegenerateConfirm(true)} className="mt-3 flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                        <RefreshCw className="h-4 w-4" />
                        <span>Regenerate QR Code</span>
                      </button> : <div className="mt-3 space-y-3">
                        <p className="text-sm font-medium text-yellow-800">
                          Are you absolutely sure?
                        </p>
                        <div className="flex space-x-3">
                          <button onClick={handleRegenerateQR} disabled={loading} className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                            {loading ? <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <span>Regenerating...</span>
                              </> : <>
                                <CheckCircle className="h-4 w-4" />
                                <span>Yes, Regenerate</span>
                              </>}
                          </button>
                          <button onClick={() => setShowRegenerateConfirm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>}
                  </div>
                </div>
              </div>
            </div>
          </div>}

      </div>

      {}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
          Close
        </button>
      </div>
    </div>;
}
