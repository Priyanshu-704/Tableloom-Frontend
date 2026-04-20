import { logger } from "../../../common/utils/logger.js";
import React, { useEffect, useMemo, useState } from "react";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import permissionService from "../../../common/services/permissionService";
import { userService } from "../../../common/services";
import { useAuth } from "../../../common/context/AuthContext";
import { AdminModal } from "../common/AdminModal";
import { AdminFormSkeleton } from "../common/AdminSkeleton";
const roleOptions = [
  {
    value: "waiter",
    label: "Waiter",
    description: "Can take orders and serve customers",
  },
  {
    value: "chef",
    label: "Chef",
    description: "Can manage kitchen and prepare orders",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Can manage staff, menu, and tables",
  },
  {
    value: "admin",
    label: "Administrator",
    description: "Full system access and staff management",
  },
];
const STEP = {
  BASIC: 1,
  PERMISSIONS: 2,
};
export function StaffForm({ onSubmit, onClose, editingUser = null }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "waiter",
    permissions: [],
  });
  const [step, setStep] = useState(STEP.BASIC);
  const [stepErrors, setStepErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPermissions, setShowPermissions] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [allPermissions, setAllPermissions] = useState([]);
  const [permissionCategories, setPermissionCategories] = useState([]);
  const [permissionDisplayNames, setPermissionDisplayNames] = useState({});
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [rolePermissionsMap, setRolePermissionsMap] = useState({});
  const currentUser = userService.getCurrentUser();
  const { hasPermission } = useAuth();
  const isAdmin =
    hasPermission("user_create") &&
    hasPermission("user_edit") &&
    hasPermission("user_change_role");
  const isManager = currentUser?.role === "manager";
  const canManagePermissions = hasPermission("user_manage_permissions");
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        setLoadingPermissions(true);
        const permissionsList = await permissionService.getAllPermissionsList();
        const categories = await permissionService.getPermissionsByCategory();
        const rolePermissions = await permissionService.getRolePermissions();
        setAllPermissions(permissionsList);
        setPermissionCategories(categories);
        setRolePermissionsMap(rolePermissions);
        const displayNames = {};
        for (const perm of permissionsList) {
          displayNames[perm] =
            await permissionService.getPermissionDisplayName(perm);
        }
        setPermissionDisplayNames(displayNames);
      } catch (error) {
        logger.error("Failed to load permissions:", error);
        setAllPermissions([]);
        setPermissionCategories([]);
        setPermissionDisplayNames({});
      } finally {
        setLoadingPermissions(false);
      }
    };
    loadPermissions();
  }, []);
  useEffect(() => {
    if (!editingUser && rolePermissionsMap[formData.role]) {
      setFormData((prev) => ({
        ...prev,
        permissions: rolePermissionsMap[prev.role] || [],
      }));
    }
  }, [formData.role, rolePermissionsMap, editingUser]);
  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || "",
        email: editingUser.email || "",
        phone: editingUser.phone || "",
        role: editingUser.role || "waiter",
        permissions: editingUser.permissions || [],
      });
    }
  }, [editingUser]);
  const handleRoleChange = async (role) => {
    const defaultPermissions = rolePermissionsMap[role] || [];
    setFormData((prev) => ({
      ...prev,
      role,
      permissions: defaultPermissions,
    }));
    setStepErrors((prev) => ({
      ...prev,
      role: "",
    }));
  };
  const availableRoles = useMemo(() => {
    if (isAdmin) return roleOptions;
    if (isManager) {
      const canChangeRoles = hasPermission("user_change_role");
      return roleOptions.filter((role) => {
        if (role.value === "admin") return false;
        if (role.value === "manager" && !canChangeRoles) return false;
        return true;
      });
    }
    const canCreateUsers = hasPermission("user_create");
    if (canCreateUsers) {
      return roleOptions.filter(
        (role) => role.value === "waiter" || role.value === "chef",
      );
    }
    return [];
  }, [hasPermission, isAdmin, isManager]);
  const validateBasicStep = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Full name is required.";
    }
    if (!formData.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (!formData.role) {
      errors.role = "Please select a role.";
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleOpenPermissionsStep = () => {
    setStep(STEP.PERMISSIONS);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateBasicStep()) {
      setStep(STEP.BASIC);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch { /* empty */ } finally {
      setIsSubmitting(false);
    }
  };
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setStepErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };
  const togglePermission = (permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));
  };
  const toggleCategory = (categoryName) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };
  const selectAllInCategory = (category) => {
    setFormData((prev) => {
      const hasAllPermissions = category.permissions.every((permission) =>
        prev.permissions.includes(permission),
      );
      if (hasAllPermissions) {
        return {
          ...prev,
          permissions: prev.permissions.filter(
            (permission) => !category.permissions.includes(permission),
          ),
        };
      }
      return {
        ...prev,
        permissions: [
          ...new Set([...prev.permissions, ...category.permissions]),
        ],
      };
    });
  };
  const selectAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions:
        prev.permissions.length === allPermissions.length ? [] : allPermissions,
    }));
  };
  if (loadingPermissions) {
    return (
      <AdminModal
        isOpen={true}
        title="Loading Staff Form"
        subtitle="Fetching permissions and role defaults."
        onClose={onClose}
        maxWidth="max-w-2xl"
      >
        <div className="p-6">
          <AdminFormSkeleton fields={8} />
        </div>
      </AdminModal>
    );
  }
  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() =>
          setStep((currentStep) =>
            currentStep === STEP.BASIC ? STEP.PERMISSIONS : STEP.BASIC,
          )
        }
        className="flex-1 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-primary-700 hover:bg-primary-100"
      >
        {step === STEP.BASIC ? "Open Permissions" : "Back To Details"}
      </button>
      <button
        type="submit"
        form="staff-form"
        disabled={isSubmitting || availableRoles.length === 0}
        className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:bg-gray-400 flex items-center justify-center"
      >
        {isSubmitting ? (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
        ) : editingUser ? (
          "Update Staff"
        ) : (
          "Register Staff"
        )}
      </button>
    </div>
  );
  return (
    <AdminModal
      isOpen={true}
      title={editingUser ? "Edit Staff Member" : "Register Staff Member"}
      subtitle="Step through basic details first, then review permissions."
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <form
        id="staff-form"
        onSubmit={handleSubmit}
        className="space-y-6 p-4 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setStep(STEP.BASIC)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${step === STEP.BASIC ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Step 1
            </p>
            <p className="mt-1 font-medium text-gray-900">Basic Details</p>
          </button>
          <button
            type="button"
            onClick={handleOpenPermissionsStep}
            className={`rounded-2xl border px-4 py-4 text-left transition ${step === STEP.PERMISSIONS ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Step 2
            </p>
            <p className="mt-1 font-medium text-gray-900">Permissions</p>
          </button>
        </div>

        {step === STEP.BASIC ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Staff Details
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add the basic profile information before assigning access.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${stepErrors.name ? "border-red-300" : "border-gray-300"}`}
                    placeholder="Enter staff member's full name"
                  />
                  {stepErrors.name ? (
                    <p className="mt-1 text-sm text-red-600">
                      {stepErrors.name}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${stepErrors.email ? "border-red-300" : "border-gray-300"}`}
                    placeholder="Enter email address"
                  />
                  {stepErrors.email ? (
                    <p className="mt-1 text-sm text-red-600">
                      {stepErrors.email}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Staff Role
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a role now. You can review or customize permissions in
                  the next tab.
                </p>
              </div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Role *
              </label>
              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <label
                    key={role.value}
                    className={`flex cursor-pointer items-start rounded-lg border p-3 ${formData.role === role.value ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:border-gray-400"}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={(event) => handleRoleChange(event.target.value)}
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">
                        {role.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {role.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {stepErrors.role ? (
                <p className="mt-1 text-sm text-red-600">{stepErrors.role}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                {editingUser
                  ? "Basic details will update immediately after submission."
                  : "After basic details, you can review and customize permissions in the next step."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Name
                  </p>
                  <p className="font-medium text-gray-900">{formData.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Email
                  </p>
                  <p className="font-medium text-gray-900">{formData.email}</p>
                </div>
              </div>
            </div>

            {canManagePermissions && allPermissions.length > 0 ? (
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowPermissions((value) => !value)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Custom Permissions</span>
                    {showPermissions ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {showPermissions ? (
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      {formData.permissions.length === allPermissions.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  ) : null}
                </div>

                {showPermissions ? (
                  <div className="space-y-2">
                    <p className="mb-3 text-sm text-gray-600">
                      Default permissions for <strong>{formData.role}</strong>{" "}
                      are selected. You can customize them below.
                    </p>

                    {permissionCategories.map((category) => (
                      <div
                        key={category.name}
                        className="overflow-hidden rounded-lg border"
                      >
                        <div
                          className="flex cursor-pointer items-center justify-between bg-gray-50 p-3 hover:bg-gray-100"
                          onClick={() => toggleCategory(category.name)}
                        >
                          <div className="font-medium text-gray-900">
                            {category.name}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                selectAllInCategory(category);
                              }}
                              className="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 hover:text-primary-800"
                            >
                              {category.permissions.every((permission) =>
                                formData.permissions.includes(permission),
                              )
                                ? "Deselect All"
                                : "Select All"}
                            </button>
                            {expandedCategories[category.name] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>

                        {expandedCategories[category.name] ? (
                          <div className="grid grid-cols-1 gap-2 border-t p-3 md:grid-cols-2">
                            {category.permissions.map((permission) => (
                              <label
                                key={permission}
                                className={`flex items-center space-x-2 rounded p-2 ${rolePermissionsMap[formData.role]?.includes(permission) ? "border border-blue-100 bg-blue-50" : "hover:bg-gray-50"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(
                                    permission,
                                  )}
                                  onChange={() => togglePermission(permission)}
                                  className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700">
                                  {permissionDisplayNames[permission] ||
                                    permission}
                                  {rolePermissionsMap[formData.role]?.includes(
                                    permission,
                                  ) ? (
                                    <span className="ml-2 text-xs text-blue-600">
                                      (Default)
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}

                    <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                      <div>
                        Selected: {formData.permissions.length} of{" "}
                        {allPermissions.length} permissions
                      </div>
                      <div className="text-blue-600">
                        Default for {formData.role}:{" "}
                        {rolePermissionsMap[formData.role]?.length || 0}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                Custom permission management is not available for your account,
                so the selected role defaults will be used.
              </div>
            )}

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-700">
                {editingUser
                  ? "Review permissions and submit when you're ready."
                  : "A secure password setup email will be sent after registration so the staff member can choose their own password."}
              </p>
            </div>
          </div>
        )}
      </form>
    </AdminModal>
  );
}
