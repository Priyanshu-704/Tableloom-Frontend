import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useState, useEffect } from "react";
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  Shield,
  ChefHat,
  RefreshCw,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../../common/context/AuthContext";
import { userService } from "../../common/services";
import { StaffCard } from "../components/staff/StaffCard";
import { StaffForm } from "../components/staff/StaffForm";
import { PermissionManager } from "../components/staff/PermissionManager";
import AdminPagination from "../components/common/AdminPagination";
import { AdminPageSkeleton } from "../components/common/AdminSkeleton";
import { Button } from "../../common/components/ui/button";
import { Input } from "../../common/components/ui/input";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
export function StaffManagement() {
  const PAGE_SIZE = 10;
  const {
    addNotification,
    isLoading: contextLoading,
    confirmAction,
  } = useAdmin();
  const { user, hasPermission } = useAuth();
  const isMonitoringMode = useMonitoringMode();
  const [staffMembers, setStaffMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedStaffForRoleUpdate, setSelectedStaffForRoleUpdate] =
    useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [
    selectedStaffForPermissionUpdate,
    setSelectedStaffForPermissionUpdate,
  ] = useState(null);
  const loadStaffMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await userService.getAllStaff({
        page: currentPage,
        limit: PAGE_SIZE,
        search: searchTerm.trim() || undefined,
        role: filterRole !== "all" ? filterRole : undefined,
        isActive:
          filterStatus === "all" ? undefined : filterStatus === "active",
      });
      if (result.success) {
        setStaffMembers(result.data || []);
        setPagination({
          page: result.pagination?.page || currentPage,
          pages: result.pagination?.pages || 1,
          total: result.total || 0,
        });
      } else {
        addNotification(
          result.message || "Failed to load staff members",
          "error",
        );
      }
    } catch (error) {
      logger.error("Error loading staff members:", error);
      addNotification(error.message || "Failed to load staff members", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, currentPage, filterRole, filterStatus, searchTerm]);
  useEffect(() => {
    loadStaffMembers();
  }, [loadStaffMembers]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole, filterStatus, searchTerm]);
  const registerStaff = async (staffData) => {
    if (isMonitoringMode) {
      return;
    }
    try {
      setIsLoading(true);
      const result = await userService.registerStaff(staffData);
      if (result.success) {
        await loadStaffMembers();
        addNotification(
          result.message ||
            `Staff member ${staffData.name} registered successfully`,
          "success",
        );
        return result;
      } else {
        addNotification(
          result.message || "Failed to register staff member",
          "error",
        );
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error("Error registering staff:", error);
      addNotification(
        error.message || "Failed to register staff member",
        "error",
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  const updateStaffRole = async (staffId, newRole) => {
    if (isMonitoringMode) {
      return;
    }
    try {
      setIsLoading(true);
      const result = await userService.updateUserRole(staffId, newRole);
      if (result.success) {
        setStaffMembers((prev) =>
          prev.map((staff) => (staff._id === staffId ? result.data : staff)),
        );
        if (
          selectedStaffForRoleUpdate &&
          selectedStaffForRoleUpdate._id === staffId
        ) {
          setSelectedStaffForRoleUpdate(result.data);
        }
        addNotification(
          `Staff role updated to ${newRole} successfully`,
          "success",
        );
        return result;
      } else {
        addNotification(
          result.message || "Failed to update staff role",
          "error",
        );
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error("Error updating staff role:", error);
      addNotification(error.message || "Failed to update staff role", "error");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  const toggleStaffStatus = async (staffId, isActive) => {
    if (isMonitoringMode) {
      return;
    }
    if (String(staffId) === String(user?._id)) {
      addNotification("You cannot change your own account status.", "warning");
      return;
    }
    const confirmed = await confirmAction({
      title: `${isActive ? "Activate" : "Deactivate"} Staff Member`,
      message: `Are you sure you want to ${isActive ? "activate" : "deactivate"} this staff member?`,
      confirmLabel: isActive ? "Activate" : "Deactivate",
      tone: "warning",
    });
    if (!confirmed) {
      return;
    }
    try {
      const result = await userService.toggleStaffStatus(staffId, isActive);
      if (result.success) {
        setStaffMembers((prev) =>
          prev.map((staff) => (staff._id === staffId ? result.data : staff)),
        );
        addNotification(
          `Staff member ${isActive ? "activated" : "deactivated"} successfully`,
          "success",
        );
        return result;
      } else {
        addNotification(
          result.message || "Failed to update staff status",
          "error",
        );
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error("Error toggling staff status:", error);
      addNotification(
        error.message || "Failed to update staff status",
        "error",
      );
      throw error;
    }
  };
  const handleManagePermissions = (staff) => {
    if (isMonitoringMode) {
      return;
    }
    setSelectedStaffForPermissionUpdate(staff);
  };
  const handleClosePermissionManager = () => {
    setSelectedStaffForPermissionUpdate(null);
  };
  const handlePermissionsUpdate = async (userId, newPermissions) => {
    try {
      setStaffMembers((prev) =>
        prev.map((staff) =>
          staff._id === userId
            ? {
                ...staff,
                permissions: newPermissions,
              }
            : staff,
        ),
      );
    } catch (error) {
      logger.error("Failed to update permissions locally:", error);
    }
  };
  const canManagePermissions = hasPermission("user_manage_permissions");
  const deleteStaff = async (staffId) => {
    if (isMonitoringMode) {
      return;
    }
    if (String(staffId) === String(user?._id)) {
      addNotification("You cannot delete your own account.", "warning");
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete Staff Member",
      message:
        "Are you sure you want to delete this staff member? This action cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }
    try {
      const result = await userService.deleteStaff(staffId);
      if (result.success) {
        setStaffMembers((prev) =>
          prev.filter((staff) => staff._id !== staffId),
        );
        addNotification("Staff member deleted successfully", "success");
        return result;
      } else {
        addNotification(
          result.message || "Failed to delete staff member",
          "error",
        );
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error("Error deleting staff:", error);
      addNotification(
        error.message || "Failed to delete staff member",
        "error",
      );
      throw error;
    }
  };
  const handleAddStaff = () => {
    if (isMonitoringMode) {
      return;
    }
    setShowStaffForm(true);
  };
  const handleCloseForm = () => {
    setShowStaffForm(false);
  };
  const handleSubmitStaff = async (staffData) => {
    try {
      await registerStaff(staffData);
      handleCloseForm();
    } catch {
      return;
    }
  };
  const handleToggleStatus = async (staffId, isActive) => {
    try {
      await toggleStaffStatus(staffId, isActive);
    } catch {
      return;
    }
  };
  const handleDeleteStaff = async (staffId) => {
    try {
      await deleteStaff(staffId);
    } catch {
      return;
    }
  };
  const handleUpdateRole = async (staffId, newRole) => {
    try {
      await updateStaffRole(staffId, newRole);
    } catch {
      return;
    }
  };
  const handleOpenRoleUpdate = (staff) => {
    if (isMonitoringMode) {
      return;
    }
    setSelectedStaffForRoleUpdate(staff);
  };
  const handleCloseRoleUpdate = () => {
    setSelectedStaffForRoleUpdate(null);
  };
  const handleRoleUpdateSubmit = async (newRole) => {
    if (!selectedStaffForRoleUpdate) return;
    try {
      await handleUpdateRole(selectedStaffForRoleUpdate._id, newRole);
      handleCloseRoleUpdate();
    } catch {
      return;
    }
  };
  const canRegisterStaff = () => {
    return !isMonitoringMode && hasPermission("user_create");
  };
  const canManageStaff = () => {
    return (
      !isMonitoringMode &&
      (hasPermission("user_edit") ||
        hasPermission("user_delete") ||
        hasPermission("user_change_status") ||
        hasPermission("user_change_role"))
    );
  };
  const canUpdateRoles = () => {
    return !isMonitoringMode && hasPermission("user_change_role");
  };
  const stats = {
    total: staffMembers.length,
    active: staffMembers.filter((s) => s.isActive).length,
    admins: staffMembers.filter((s) => s.role === "admin").length,
    managers: staffMembers.filter((s) => s.role === "manager").length,
    chefs: staffMembers.filter((s) => s.role === "chef").length,
    waiters: staffMembers.filter((s) => s.role === "waiter").length,
  };
  if (isLoading || contextLoading) {
    return (
      <AdminPageSkeleton stats={3} filters={1} cards={6} cardHeight="h-48" />
    );
  }
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">
            Manage restaurant staff members and their permissions
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          <Button
            onClick={loadStaffMembers}
            disabled={isLoading}
            variant="outline"
            title="Refresh staff list"
          >
            <RefreshCw
              className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          {canRegisterStaff() && (
            <Button onClick={handleAddStaff} disabled={isLoading}>
              <UserPlus className="h-5 w-5" />
              <span>Add Staff</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.active}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.admins}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Managers</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.managers}
              </p>
            </div>
            <Users className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Chefs</p>
              <p className="text-2xl font-bold text-red-600">{stats.chefs}</p>
            </div>
            <ChefHat className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Waiters</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.waiters}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search staff by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
              disabled={isLoading}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="chef">Chef</option>
              <option value="waiter">Waiter</option>
            </select>
          </div>

          <div className="w-full md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
              disabled={isLoading}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {staffMembers.map((staff) => (
          <StaffCard
            key={staff._id}
            staff={staff}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteStaff}
            onUpdateRole={handleOpenRoleUpdate}
            canManage={canManageStaff()}
            canUpdateRoles={canUpdateRoles()}
            currentUserId={user?._id}
            onManagePermissions={handleManagePermissions}
            canManagePermissions={!isMonitoringMode && canManagePermissions}
            isReadOnly={isMonitoringMode}
            I
          />
        ))}
      </div>

      <AdminPagination
        page={pagination.page}
        totalPages={pagination.pages}
        totalItems={pagination.total}
        pageSize={PAGE_SIZE}
        itemLabel="staff members"
        onPageChange={setCurrentPage}
      />

      {staffMembers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No staff members found
          </h3>
          <p className="mt-2 text-gray-600">
            {searchTerm || filterRole !== "all" || filterStatus !== "all"
              ? "Try adjusting your search or filters"
              : "Get started by adding your first staff member"}
          </p>
          {canRegisterStaff() &&
            !searchTerm &&
            filterRole === "all" &&
            filterStatus === "all" && (
              <button
                onClick={handleAddStaff}
                disabled={isLoading}
                className="mt-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
              >
                Add Staff Member
              </button>
            )}
        </div>
      )}

      {!isMonitoringMode && showStaffForm && (
        <StaffForm
          onSubmit={handleSubmitStaff}
          onClose={handleCloseForm}
          isLoading={isLoading}
          currentUserRole={user?.role}
        />
      )}

      {!isMonitoringMode && selectedStaffForRoleUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Update Staff Role
              </h3>
              <button
                onClick={handleCloseRoleUpdate}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Update role for{" "}
                <span className="font-semibold">
                  {selectedStaffForRoleUpdate.name}
                </span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Current role:{" "}
                <span className="font-medium capitalize">
                  {selectedStaffForRoleUpdate.role}
                </span>
              </p>

              <div className="space-y-3">
                {["admin", "manager", "chef", "waiter"].map((role) => (
                  <label
                    key={role}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedStaffForRoleUpdate.role === role ? "bg-primary-50 border-primary-500" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedStaffForRoleUpdate.role === role}
                      onChange={() => {
                        setSelectedStaffForRoleUpdate({
                          ...selectedStaffForRoleUpdate,
                          role: role,
                        });
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-3 font-medium capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseRoleUpdate}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleRoleUpdateSubmit(selectedStaffForRoleUpdate.role)
                }
                disabled={
                  isLoading ||
                  selectedStaffForRoleUpdate.role ===
                    staffMembers.find(
                      (s) => s._id === selectedStaffForRoleUpdate._id,
                    )?.role
                }
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
              >
                {isLoading ? "Updating..." : "Update Role"}
              </button>
            </div>
          </div>
        </div>
      )}
      {!isMonitoringMode && selectedStaffForPermissionUpdate && (
        <PermissionManager
          userId={selectedStaffForPermissionUpdate._id}
          userName={selectedStaffForPermissionUpdate.name}
          userRole={selectedStaffForPermissionUpdate.role}
          currentPermissions={
            selectedStaffForPermissionUpdate.permissions || []
          }
          onPermissionsUpdate={handlePermissionsUpdate}
          onClose={handleClosePermissionManager}
        />
      )}
    </div>
  );
}
