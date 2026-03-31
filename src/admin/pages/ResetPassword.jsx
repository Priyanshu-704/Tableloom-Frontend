import { logger } from "../../common/utils/logger.js";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, X } from "lucide-react";
import userService from "../../common/services/userService";
import { useSettings } from "../../common/context/SettingsContext";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";
import { buildAdminPath } from "../../common/utils/routes";
export function ResetPassword() {
  const {
    token
  } = useParams();
  const navigate = useNavigate();
  const {
    settings
  } = useSettings();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [allRequirementsMet, setAllRequirementsMet] = useState(false);
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("No reset token provided");
        setIsVerifying(false);
        return;
      }
      try {
        const response = await userService.validateResetToken(token);
        if (response && response.success === true) {
          setTokenValid(true);
          setError("");
        } else {
          setError(response?.message || "Invalid or expired token");
          setTokenValid(false);
        }
      } catch (error) {
        setError(error.message || "Failed to verify token. Please try again.");
        setTokenValid(false);
      } finally {
        setIsVerifying(false);
      }
    };
    verifyToken();
  }, [token]);
  const checkPasswordRequirements = password => {
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
    const lowercaseCount = (password.match(/[a-z]/g) || []).length;
    const numberCount = (password.match(/\d/g) || []).length;
    const specialCharCount = (password.match(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g) || []).length;
    const requirements = {
      length: password.length >= 8,
      uppercase: {
        valid: uppercaseCount >= 2,
        count: uppercaseCount,
        required: 2
      },
      lowercase: {
        valid: lowercaseCount >= 2,
        count: lowercaseCount,
        required: 2
      },
      numbers: {
        valid: numberCount >= 2,
        count: numberCount,
        required: 2
      },
      special: {
        valid: specialCharCount >= 2,
        count: specialCharCount,
        required: 2
      }
    };
    const allValid = requirements.length && requirements.uppercase.valid && requirements.lowercase.valid && requirements.numbers.valid && requirements.special.valid;
    setAllRequirementsMet(allValid);
  };
  const handlePasswordChange = e => {
    const newPassword = e.target.value;
    setFormData(prev => ({
      ...prev,
      password: newPassword
    }));
    setError("");
    checkPasswordRequirements(newPassword);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      const response = await userService.resetPassword(token, formData.password);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(buildAdminPath("/login"));
        }, 3000);
      } else {
        setError(response.error || response.message || "Failed to reset password");
      }
    } catch (error) {
      logger.error("Password reset error:", error);
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  if (isVerifying) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-slate-300">Verifying reset link...</p>
        </div>
      </div>;
  }
  if (!tokenValid && !isVerifying) {
    return <AdminAuthShell settings={settings} eyebrow="Reset Link" title="This reset link is no longer valid" description="Request a fresh password reset email to continue. Expired or already-used links are blocked for security." sideTitle="Short-lived links keep account recovery safer." sideDescription="If a link expires or has already been used, we guide staff back into a clean reset flow instead of leaving them stuck.">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid or Expired Link
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Please request a new password reset link.
            </p>
            <Link to={buildAdminPath("/forgot-password")} className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
              Get New Reset Link
            </Link>
            <div className="mt-4">
              <Link to={buildAdminPath("/login")} className="text-sm text-primary-600 hover:text-primary-800">
                Back to Login
              </Link>
            </div>
          </div>
      </AdminAuthShell>;
  }
  if (success) {
    return <AdminAuthShell settings={settings} eyebrow="Password Updated" title="Your new password is ready" description="The password change was successful. You can sign in again with the updated credentials." sideTitle="A short reset flow helps staff get back to work quickly." sideDescription="Once the password is changed, the user is redirected back into the login flow with a clean session.">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Password Reset Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              Your password has been updated successfully.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Redirecting to login page...
            </p>
            <button onClick={() => navigate(buildAdminPath("/login"))} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              Go to Login Now
            </button>
          </div>
      </AdminAuthShell>;
  }
  return <AdminAuthShell settings={settings} eyebrow="Create Password" title="Set a new password" description="Choose a strong password that meets the system rules, then confirm it to finish the reset." sideTitle="Make recovery feel deliberate and secure." sideDescription="The reset screen now gives clearer feedback while a user types, so they know exactly what still needs attention.">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>}

            {tokenValid && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>
                  Reset link is valid. You can now set a new password.
                </span>
              </div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={handlePasswordChange} className={`w-full pl-10 pr-12 py-3 border rounded-xl bg-white shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 ${formData.password && !allRequirementsMet ? "border-red-300" : "border-slate-300"}`} placeholder="Enter new password" required disabled={isLoading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700" disabled={isLoading}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className={formData.password.length >= 8 ? "text-emerald-600" : ""}>At least 8 characters</p>
                <p className={/[A-Z].*[A-Z]/.test(formData.password) ? "text-emerald-600" : ""}>At least 2 uppercase letters</p>
                <p className={/[a-z].*[a-z]/.test(formData.password) ? "text-emerald-600" : ""}>At least 2 lowercase letters</p>
                <p className={/\d.*\d/.test(formData.password) ? "text-emerald-600" : ""}>At least 2 numbers</p>
                <p className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?].*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? "text-emerald-600" : ""}>At least 2 special characters</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={e => {
                setFormData(prev => ({
                  ...prev,
                  confirmPassword: e.target.value
                }));
                setError("");
              }} className={`w-full pl-10 pr-12 py-3 border rounded-xl bg-white shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? "border-red-300" : "border-slate-300"}`} placeholder="Confirm new password" required disabled={isLoading} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700" disabled={isLoading}>
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {formData.confirmPassword && formData.password !== formData.confirmPassword && <p className="mt-2 text-sm text-red-600 flex items-center">
                    <X className="h-4 w-4 mr-1" />
                    Passwords do not match
                  </p>}
            </div>

            <div className="flex gap-5">
              <button type="submit" disabled={isLoading || formData.password !== formData.confirmPassword || formData.password.length === 0} className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                {isLoading ? <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Updating Password...
                  </> : "Reset Password"}
              </button>
              <button type="button" onClick={() => navigate(buildAdminPath("/login"))} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
      </AdminAuthShell>;
}
