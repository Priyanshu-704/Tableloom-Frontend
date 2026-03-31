import React from "react";
import { AdminModal } from "../common/AdminModal";
import { QRBatchOperations } from "../../pages/QRBatchOperations";
export function QrBatchOperationsModal({
  isOpen,
  tables,
  title = "Batch QR Operations",
  subtitle = "Perform operations on multiple QR codes.",
  onClose,
  onSuccess
}) {
  return <AdminModal isOpen={isOpen} title={title} subtitle={subtitle} onClose={onClose} maxWidth="max-w-2xl">
      <QRBatchOperations tables={tables} onClose={onClose} onSuccess={onSuccess} />
    </AdminModal>;
}
export default QrBatchOperationsModal;
