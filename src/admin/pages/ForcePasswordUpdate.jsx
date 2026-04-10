import React, { useState } from "react";
import { Shield, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "../../common/components/ui/button";
import { Input } from "../../common/components/ui/input";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../../common/context/AuthContext";
import { userService } from "../../common/services";
import { useSettings } from "../../common/context/SettingsContext";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";
export function ForcePasswordUpdate() {
  const {
    addNotification
  } = useAdmin();
  const {
    user,
    logout
  } = useAuth();
  const {
    settings
  } = useSettings();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const handleChange = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: value
    }));
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      addNotification("Please fill all password fields", "error");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      addNotification("New password and confirm password do not match", "error");
      return;
    }
    if (form.newPassword.length < 8) {
      addNotification("Password must be at least 8 characters long", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await userService.updatePassword(form.currentPassword, form.newPassword);
      if (!response?.success) {
        addNotification(response?.message || "Failed to update password", "error");
        return;
      }
      addNotification("Password updated successfully. Please sign in again.", "success");
      await logout();
    } catch {
      addNotification("Failed to update password", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <AdminAuthShell settings={settings} eyebrow="First Login Required" title="Update your temporary password" description={`${user?.name || "Staff member"}, replace the temporary password before entering ${settings?.restaurant?.name || "the admin panel"}.`} mobileAuthMode="formOnly" sideTitle="Temporary passwords should lead into a confident first-use experience." sideDescription="This first-login step now matches the rest of the auth flow so new staff do not hit an abrupt or confusing screen." highlights={[{
    title: "Safer onboarding",
    description: "Temporary credentials are replaced before staff continue into the dashboard."
  }, {
    title: "Clear next step",
    description: "Once the password is saved, the user is sent straight into the admin area."
  }]}>
        <div className="mb-6 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">
          Use a strong password that includes uppercase, lowercase, numbers, and special characters.
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input type={showCurrentPassword ? "text" : "password"} value={form.currentPassword} onChange={event => handleChange("currentPassword", event.target.value)} className="h-12 rounded-xl pl-10 pr-11" placeholder="Enter temporary password" />
              <button type="button" onClick={() => setShowCurrentPassword(current => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-slate-900">
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input type={showNewPassword ? "text" : "password"} value={form.newPassword} onChange={event => handleChange("newPassword", event.target.value)} className="h-12 rounded-xl pl-10 pr-11" placeholder="Enter new password" />
              <button type="button" onClick={() => setShowNewPassword(current => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-slate-900">
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={event => handleChange("confirmPassword", event.target.value)} className="h-12 rounded-xl pl-10 pr-11" placeholder="Confirm new password" />
              <button type="button" onClick={() => setShowConfirmPassword(current => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-slate-900">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="h-12 w-full rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Save New Password
          </Button>
        </form>
      </AdminAuthShell>;
}
