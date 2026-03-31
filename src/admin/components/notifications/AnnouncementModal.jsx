import React from "react";
import { AdminModal } from "../common/AdminModal";
export function AnnouncementModal({
  isOpen,
  announcement,
  priorityOptions,
  sendingAnnouncement,
  onClose,
  onSubmit,
  onChange
}) {
  return <AdminModal isOpen={isOpen} title="Send Announcement" subtitle="Share an update with all active staff members." onClose={() => {
    if (!sendingAnnouncement) {
      onClose();
    }
  }} maxWidth="max-w-2xl" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={sendingAnnouncement} className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 disabled:opacity-60 sm:w-auto">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={sendingAnnouncement} className="w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60 sm:w-auto">
            {sendingAnnouncement ? "Sending..." : "Send Announcement"}
          </button>
        </div>}>
      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Title</label>
          <input type="text" value={announcement.title} onChange={event => onChange("title", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Shift update, service note, or urgent alert" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Message</label>
          <textarea rows={6} value={announcement.message} onChange={event => onChange("message", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Write the announcement message for staff." />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Priority</label>
            <select value={announcement.priority} onChange={event => onChange("priority", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              {priorityOptions.map(item => <option key={item.value} value={item.value}>
                  {item.label}
                </option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Expires At
            </label>
            <input type="datetime-local" value={announcement.expiresAt} onChange={event => onChange("expiresAt", event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-700">
          <input type="checkbox" checked={announcement.important} onChange={event => onChange("important", event.target.checked)} className="rounded border-gray-300" />
          Mark as important
        </label>
      </div>
    </AdminModal>;
}
export default AnnouncementModal;
