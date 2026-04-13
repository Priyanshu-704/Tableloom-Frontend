import React from "react";
import { AdminModal } from "../common/AdminModal";
export function AssignWaiterCallModal({
  isOpen,
  callId,
  staffId,
  availableStaff,
  activeId,
  onClose,
  onStaffChange,
  onSubmit,
}) {
  return (
    <AdminModal
      isOpen={isOpen}
      title="Assign Waiter Call"
      subtitle="Choose a staff member to handle this request."
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={activeId === callId}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
          >
            Assign Call
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-5">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Staff Member
        </label>
        <select
          value={staffId}
          onChange={(event) => onStaffChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="">Select staff member</option>
          {availableStaff.map((staff) => (
            <option key={staff._id} value={staff._id}>
              {staff.name} ({staff.role})
            </option>
          ))}
        </select>
      </div>
    </AdminModal>
  );
}
export default AssignWaiterCallModal;
