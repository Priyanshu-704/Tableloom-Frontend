import { logger } from "../../../common/utils/logger.js";
import React, { useCallback, useState, useEffect } from "react";
import { Shield, Check, X, RefreshCw, Save, Lock } from "lucide-react";
import permissionService from "../../../common/services/permissionService";
import { useAdmin } from "../../context/AdminContext";
import { AdminModal } from "../common/AdminModal";
import { AdminListSkeleton } from "../common/AdminSkeleton";
export function PermissionManager({
  userId,
  userName,
  userRole,
  currentPermissions = [],
  onPermissionsUpdate,
  onClose
}) {
  const {
    addNotification,
    confirmAction
  } = useAdmin();
  const [allPermissions, setAllPermissions] = useState([]);
  const [permissionCategories, setPermissionCategories] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [displayNames, setDisplayNames] = useState({});
  const loadPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      await permissionService.fetchAllPermissions();
      const categories = await permissionService.getPermissionsByCategory();
      setPermissionCategories(categories);
      const allPerms = await permissionService.getAllPermissionsList();
      setAllPermissions(allPerms);
      const displayNameEntries = await Promise.all(allPerms.map(async perm => [perm, await permissionService.getPermissionDisplayName(perm)]));
      const displayNamesData = Object.fromEntries(displayNameEntries);
      setDisplayNames(displayNamesData);
      if (currentPermissions?.length) {
        setSelectedPermissions([...currentPermissions]);
      } else {
        const defaultPerms = await permissionService.getDefaultPermissionsForRole(userRole);
        setSelectedPermissions(defaultPerms);
      }
    } catch {
      setError("Failed to load permissions.");
      addNotification("Failed to load permissions.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, currentPermissions, userRole]);
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);
  const togglePermission = permission => {
    setSelectedPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };
  const toggleCategory = categoryPermissions => {
    const allCategorySelected = categoryPermissions.every(p => selectedPermissions.includes(p));
    setSelectedPermissions(prev => {
      if (allCategorySelected) {
        return prev.filter(p => !categoryPermissions.includes(p));
      } else {
        const toAdd = categoryPermissions.filter(p => !prev.includes(p));
        return [...prev, ...toAdd];
      }
    });
  };
  const selectAll = () => {
    setSelectedPermissions([...allPermissions]);
  };
  const deselectAll = () => {
    setSelectedPermissions([]);
  };
  const resetToRoleDefaults = async () => {
    try {
      setIsLoading(true);
      const data = await permissionService.fetchAllPermissions();
      const rolePermissions = data.rolePermissions || {};
      const defaultPermissions = rolePermissions[userRole] || [];
      setSelectedPermissions(defaultPermissions);
      setSuccess("Reset to role default permissions");
      addNotification("Loaded role default permissions.", "success");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      logger.error("Error resetting permissions:", error);
      setError("Failed to reset permissions");
      addNotification("Failed to reset permissions.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const savePermissions = async () => {
    try {
      setIsSaving(true);
      setError("");
      setSuccess("");
      const result = await permissionService.updateUserPermissions(userId, selectedPermissions);
      if (result && result.success) {
        if (onPermissionsUpdate) {
          onPermissionsUpdate(userId, selectedPermissions);
        }
        addNotification(result?.message || "Permissions updated successfully.", "success");
        if (onClose) {
          onClose();
        }
      } else {
        setError(result?.message || "Failed to update permissions");
        addNotification(result?.message || "Failed to update permissions.", "error");
      }
    } catch (error) {
      logger.error("Error saving permissions:", error);
      setError(error.message || "Failed to save permissions. Please try again.");
      addNotification(error.message || "Failed to save permissions. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };
  const resetPermissions = async () => {
    const confirmed = await confirmAction({
      title: "Reset Permissions",
      message: "Reset this user's permissions to role defaults?",
      confirmLabel: "Reset",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");
      const result = await permissionService.resetUserPermissions(userId);
      if (result && result.success) {
        const updatedPermissions = result.data?.permissions || [];
        setSelectedPermissions(updatedPermissions);
        if (onPermissionsUpdate) {
          onPermissionsUpdate(userId, updatedPermissions);
        }
        setSuccess("Permissions reset to role defaults!");
        addNotification(result?.message || "Permissions reset to role defaults.", "success");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result?.message || "Failed to reset permissions");
        addNotification(result?.message || "Failed to reset permissions.", "error");
      }
    } catch (error) {
      logger.error("Error resetting permissions:", error);
      setError(error.message || "Failed to reset permissions");
      addNotification(error.message || "Failed to reset permissions", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const isCategoryFullySelected = categoryPermissions => {
    if (categoryPermissions.length === 0) return false;
    return categoryPermissions.every(p => selectedPermissions.includes(p));
  };
  const isCategoryPartiallySelected = categoryPermissions => {
    if (categoryPermissions.length === 0) return false;
    const selectedCount = categoryPermissions.filter(p => selectedPermissions.includes(p)).length;
    return selectedCount > 0 && selectedCount < categoryPermissions.length;
  };
  const getDisplayName = permission => {
    return displayNames[permission] || permissionService.getPermissionDisplayName(permission) || permission;
  };
  if (isLoading) {
    return <AdminModal isOpen={true} title="Permission Manager" subtitle={`Loading permissions for ${userName}.`} onClose={onClose} maxWidth="max-w-4xl">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AdminModal>;
  }
  const footer = <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button onClick={resetToRoleDefaults} disabled={isLoading || isSaving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50 sm:w-auto">
          <RefreshCw className="h-4 w-4" />
          Load Role Defaults
        </button>
        <button onClick={resetPermissions} disabled={isLoading || isSaving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50 sm:w-auto">
          <Lock className="h-4 w-4" />
          Reset to Defaults
        </button>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <button onClick={onClose} disabled={isSaving} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto">
          Cancel
        </button>
        <button onClick={savePermissions} disabled={isSaving || isLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:bg-gray-400 disabled:opacity-50 sm:w-auto">
          {isSaving ? <>
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              <span>Saving...</span>
            </> : <>
              <Save className="h-4 w-4" />
              <span>Save Permissions</span>
            </>}
        </button>
      </div>
    </div>;
  return <AdminModal isOpen={true} title="Permission Manager" subtitle={`Managing permissions for ${userName} (${userRole}).`} onClose={onClose} maxWidth="max-w-4xl" footer={footer}>
      <div className="border-b bg-gray-50 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <div className="text-sm">
              <span className="text-gray-600">Selected: </span>
              <span className="font-semibold text-primary-600">
                {selectedPermissions.length} / {allPermissions.length}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Categories: </span>
              <span className="font-semibold text-gray-900">
                {permissionCategories.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button onClick={selectAll} disabled={isLoading || isSaving} className="rounded-md bg-blue-100 px-3 py-2 text-xs text-blue-700 hover:bg-blue-200 disabled:opacity-50">
              Select All
            </button>
            <button onClick={deselectAll} disabled={isLoading || isSaving} className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:mx-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>}

      {success && <div className="mx-4 mt-4 rounded-lg border border-green-200 bg-green-50 p-3 sm:mx-6">
          <p className="text-green-700 text-sm">{success}</p>
        </div>}

      <div className="overflow-y-auto p-4 sm:p-6" style={{
      maxHeight: "calc(85vh - 200px)"
    }}>
        {permissionCategories.length === 0 ? <AdminListSkeleton rows={4} /> : permissionCategories.map(category => {
        const isFullySelected = isCategoryFullySelected(category.permissions);
        const isPartiallySelected = isCategoryPartiallySelected(category.permissions);
        return <div key={category.name} className="mb-6 last:mb-0">
                
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category.name}
                  </h3>
                  <button onClick={() => toggleCategory(category.permissions)} disabled={isLoading || isSaving} className={`flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm sm:w-auto ${isFullySelected ? "bg-primary-100 text-primary-700 hover:bg-primary-200" : isPartiallySelected ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} disabled:opacity-50`}>
                    {isFullySelected ? <>
                        <Check className="h-4 w-4" />
                        <span>Deselect All</span>
                      </> : <>
                        <span>
                          {isPartiallySelected ? "Select All" : "Select All"}
                        </span>
                      </>}
                  </button>
                </div>

                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.permissions.map(permission => {
              const isSelected = selectedPermissions.includes(permission);
              return <div key={permission} onClick={() => togglePermission(permission)} className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"} ${isLoading || isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? "bg-primary-500 border-primary-500" : "bg-white border-gray-300"}`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {getDisplayName(permission)}
                            </span>
                          </div>
                        </div>
                      </div>;
            })}
                </div>
              </div>;
      })}
      </div>
    </AdminModal>;
}
