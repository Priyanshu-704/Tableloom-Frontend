import React, { useEffect, useRef } from "react";
import {
  Mail,
  Phone,
  Shield,
  ChefHat,
  Users,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { useState } from "react";
const roleIcons = {
  admin: Shield,
  manager: Users,
  chef: ChefHat,
  waiter: Users,
};
const roleColors = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-orange-100 text-orange-800",
  chef: "bg-red-100 text-red-800",
  waiter: "bg-blue-100 text-blue-800",
};
export function StaffCard({
  staff,
  onToggleStatus,
  onDelete,
  onUpdateRole,
  canManage,
  canUpdateRoles,
  currentUserId,
  onManagePermissions,
  canManagePermissions,
  isReadOnly = false,
}) {
  const menuRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const RoleIcon = roleIcons[staff.role] || Users;
  const isCurrentUser =
    String(staff?._id || "") === String(currentUserId || "");
  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };
  const handleToggleStatus = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    onToggleStatus(staff._id, !staff.isActive);
  };
  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete(staff._id);
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);
  return (
    <div
      className={`rounded-lg border bg-white shadow ${!staff.isActive ? "opacity-60" : ""}`}
    >
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${staff.isActive ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-gray-400"}`}
            >
              <RoleIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-gray-900">
                {staff.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleColors[staff.role]}`}
                >
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {staff.role?.charAt(0).toUpperCase() + staff.role?.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {canManage && !isReadOnly && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleMenuToggle}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border z-10">
                  {!isCurrentUser ? (
                    <button
                      onClick={handleToggleStatus}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      {staff.isActive ? (
                        <>
                          <UserX className="h-4 w-4" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                  ) : null}

                  {canManagePermissions && !isCurrentUser && (
                    <button
                      onClick={() => onManagePermissions(staff)}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Manage Permissions</span>
                    </button>
                  )}
                  {!isCurrentUser ? (
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  ) : null}
                  {canUpdateRoles && onUpdateRole && !isCurrentUser && (
                    <button
                      onClick={() => onUpdateRole(staff)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Update Role</span>
                    </button>
                  )}
                  {isCurrentUser ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      You cannot deactivate or delete your own account.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Mail className="h-4 w-4" />
          <span className="truncate">{staff.email}</span>
        </div>

        {staff.phone && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{staff.phone}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-b-lg bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          {staff.isActive ? (
            <div className="flex items-center space-x-1 text-green-600">
              <UserCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Active</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-gray-500">
              <UserX className="h-4 w-4" />
              <span className="text-sm font-medium">Inactive</span>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 sm:text-right">
          Joined {new Date(staff.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
