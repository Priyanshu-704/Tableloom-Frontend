import React from "react";
import { QRManagement } from "../../pages/QRManagement";
export function QrManagementOverlay({
  table,
  onClose,
  onSuccess
}) {
  if (!table) {
    return null;
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <QRManagement table={table} onClose={onClose} onSuccess={onSuccess} />
    </div>;
}
export default QrManagementOverlay;
