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
  return <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-900/15 px-0 py-0 backdrop-blur-[2px] sm:p-4" onClick={onClose}>
      <div className="flex min-h-full items-end justify-center sm:items-center">
        <div className="w-full" onClick={event => event.stopPropagation()}>
          <QRManagement table={table} onClose={onClose} onSuccess={onSuccess} />
        </div>
      </div>
    </div>;
}
export default QrManagementOverlay;
