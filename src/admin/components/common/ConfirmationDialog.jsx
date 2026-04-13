import React from "react";
import { AlertTriangle, X } from "lucide-react";
const toneClasses = {
  danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  warning: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500",
  primary: "bg-primary-600 hover:bg-primary-700 focus:ring-primary-500",
};
export function ConfirmationDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-50 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close confirmation dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 ${toneClasses[tone] || toneClasses.danger}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
