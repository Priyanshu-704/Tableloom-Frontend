import React from "react";
import { AdminModal } from "../common/AdminModal";
export function CompleteWaiterCallModal({
  isOpen,
  callId,
  resolutionNotes,
  activeId,
  onClose,
  onNotesChange,
  onSubmit
}) {
  return <AdminModal isOpen={isOpen} title="Complete Waiter Call" subtitle="Add optional notes before closing the request." onClose={onClose} maxWidth="max-w-xl" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={activeId === callId} className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 sm:w-auto">
            Complete Call
          </button>
        </div>}>
      <div className="p-4 sm:p-5">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Resolution Notes
        </label>
        <textarea rows={5} value={resolutionNotes} onChange={event => onNotesChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Optional notes about how this guest request was resolved." />
      </div>
    </AdminModal>;
}
export default CompleteWaiterCallModal;
