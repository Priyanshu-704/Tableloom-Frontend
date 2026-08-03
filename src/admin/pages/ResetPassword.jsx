import { logger } from "../../common/utils/logger.js";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, X } from "lucide-react";
import userService from "../../common/services/userService";
import { useSettings } from "../../common/context/SettingsContext";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";
import { buildAdminPath } from "../../common/utils/routes";
export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("No reset token provided.");
        setTokenValid(false);
        setIsVerifying(false);
        return;
      }
      try {
        const response = await userService.validateResetToken(token);
        if (response && response.success === false && response.valid === false) {
          setError(response?.message || "Invalid or expired reset link. Please request a new one.");
          setTokenValid(false);
        } else {
          setTokenValid(true);
          setError("");
        }
      } catch (err) {
        // Keep form accessible if token exists in URL
        setTokenValid(true);
        setError("");
      } finally {
        setIsVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData((prev) => ({
      ...prev,
      password: newPassword,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.password || !formData.confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await userService.resetPassword(
        token,
        formData.password,
      );
      if (response && (response.success || response.status === "success")) {
        setSuccess(true);
        setTimeout(() => {
          navigate(buildAdminPath("/login"));
        }, 2500);
      } else {
        setError(
          response?.error || response?.message || "Failed to reset password. The link may have expired.",
        );
      }
    } catch (err) {
      logger.error("Password reset error:", err);
      setError(err?.message || "An error occurred during reset. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center bg-slate-900/80 border border-slate-800 p-8 rounded-3xl backdrop-blur shadow-2xl">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-400 mx-auto"></div>
          <p className="mt-4 text-sm font-semibold text-slate-300">Verifying security reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid && !isVerifying) {
    return (
      <AdminAuthShell
        hideSidePanel
        settings={settings}
        eyebrow="Security Link"
        title="Reset Link Invalid or Expired"
        description="This password reset link is no longer valid or has already been used."
        mobileAuthMode="formOnly"
      >
        <div className="text-center py-4 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Expired Reset Token
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              For security, password reset links expire automatically after single use or timeout. Please request a new link.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <Link
              to={buildAdminPath("/forgot-password")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-md transition hover:bg-sky-500"
            >
              Request New Reset Link
            </Link>
            <Link
              to={buildAdminPath("/login")}
              className="inline-block text-xs font-semibold text-slate-500 hover:text-slate-700 pt-1"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </AdminAuthShell>
    );
  }

  if (success) {
    return (
      <AdminAuthShell
        hideSidePanel
        settings={settings}
        eyebrow="Password Updated"
        title="Password Successfully Reset!"
        description="Your workspace credentials have been updated cleanly."
        mobileAuthMode="formOnly"
      >
        <div className="text-center py-4 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              New Password Active
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              You will be automatically redirected to the admin sign in page...
            </p>
          </div>
          <button
            onClick={() => navigate(buildAdminPath("/login"))}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-md transition hover:bg-slate-800"
          >
            Sign In Now
          </button>
        </div>
      </AdminAuthShell>
    );
  }

  return (
    <AdminAuthShell
      settings={settings}
      eyebrow="Create Password"
      title="Set a new password"
      description="Enter your new password below to complete your reset."
      sideLabel="Security Update"
      sideTitle="Make recovery deliberate & secure."
      sideDescription="Once your new password is saved, you will be redirected straight back into the admin login flow."
      highlights={[
        {
          title: "🔐 Encrypted Protection",
          description: "Your new password is stored securely using enterprise bcrypt encryption.",
        },
        {
          title: "⚡ Seamless Sign-In",
          description: "Instant session clearing forces a clean login with your new credentials.",
        },
      ]}
      mobileAuthMode="formOnly"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tokenValid && !error && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Reset link is valid. You can now set your new password.</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handlePasswordChange}
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-sm font-medium text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15"
              placeholder="Enter new password (min. 6 chars)"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }));
                if (error) setError("");
              }}
              className={`w-full pl-10 pr-10 py-2.5 border rounded-xl bg-slate-50/70 text-sm font-medium text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? "border-rose-300 bg-rose-50/20" : "border-slate-200"}`}
              placeholder="Confirm new password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {formData.confirmPassword &&
            formData.password !== formData.confirmPassword && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center">
                <X className="h-3.5 w-3.5 mr-1" />
                Passwords do not match
              </p>
            )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={
              isLoading ||
              formData.password !== formData.confirmPassword ||
              formData.password.length === 0
            }
            className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating Password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(buildAdminPath("/login"))}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </AdminAuthShell>
  );
}
