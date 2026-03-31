import React from "react";
import { AdminModal } from "../common/AdminModal";
export function StaffRoleUpdateModal({
  staff,
  staffMembers,
  isLoading,
  onClose,
  onRoleChange,
  onSubmit
}) {
  if (!staff) {
    return null;
  }
  const originalRole = staffMembers.find(member => member._id === staff._id)?.role;
  return <AdminModal isOpen={true} title="Update Staff Role" subtitle="Adjust the role assignment for this staff member." onClose={onClose} maxWidth="max-w-md" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button onClick={onClose} disabled={isLoading} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto">
            Cancel
          </button>
          <button onClick={() => onSubmit(staff.role)} disabled={isLoading || staff.role === originalRole} className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:bg-gray-400 sm:w-auto">
            {isLoading ? "Updating..." : "Update Role"}
          </button>
        </div>}>
      <div className="p-4 sm:p-6">
          <p className="text-gray-600 mb-2">
            Update role for <span className="font-semibold">{staff.name}</span>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Current role: <span className="font-medium capitalize">{originalRole}</span>
          </p>

          <div className="space-y-3">
            {["admin", "manager", "chef", "waiter"].map(role => <label key={role} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${staff.role === role ? "bg-primary-50 border-primary-500" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="radio" name="role" value={role} checked={staff.role === role} onChange={() => onRoleChange(role)} className="h-4 w-4 text-primary-600 focus:ring-primary-500" />
                <span className="ml-3 font-medium capitalize">{role}</span>
              </label>)}
          </div>
      </div>
    </AdminModal>;
}
export default StaffRoleUpdateModal;
