import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, CheckCircle } from "lucide-react";
import userService from "../../common/services/userService";
import { useSettings } from "../../common/context/SettingsContext";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";
import { buildAdminPath } from "../../common/utils/routes";
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const { settings } = useSettings();
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccess(false);
    setSuccessMessage("");
    try {
      const response = await userService.forgotPassword(email);
      if (response.success) {
        setSuccess(true);
        setSuccessMessage("Password reset link has been sent to your email.");
        setTimeout(() => {
          navigate(buildAdminPath("/login"));
        }, 10000);
      } else {
        setError(response.message || "Failed to send reset link");
      }
    } catch (error) {
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleTryAnotherEmail = () => {
    setSuccess(false);
    setSuccessMessage("");
    setEmail("");
    setError("");
  };
  return (
    <AdminAuthShell
      settings={settings}
      eyebrow={success ? "Email Sent" : "Password Reset"}
      title={success ? "Check your inbox" : "Reset your password"}
      description={
        success
          ? "A reset link has been generated for your account. You can head back to login after opening the email."
          : "Enter the email address linked to your staff account and we’ll send you a secure password reset link."
      }
      mobileAuthMode="formOnly"
      sideTitle="Recovery should feel reassuring, not confusing."
      sideDescription="These screens guide staff back into the system quickly while keeping password recovery clear and secure."
      highlights={[
        {
          title: "Secure links",
          description:
            "Reset links are short-lived so temporary emails do not stay valid for long.",
        },
        {
          title: "Fast recovery",
          description:
            "Staff can return to service without needing manual admin intervention.",
        },
      ]}
    >
      {success ? (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-10 w-10" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Email Sent Successfully!
            </h3>

            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4">
              {successMessage}
            </div>

            <p className="text-gray-600 mb-2">
              We've sent password reset instructions to:
            </p>
            <p className="font-medium text-primary-600 text-lg mb-4">{email}</p>
          </div>

          <div className="space-y-4 pt-4">
            <button
              onClick={() => navigate(buildAdminPath("/login"))}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Return to Login
            </button>

            <button
              onClick={handleTryAnotherEmail}
              className="w-full border border-primary-600 text-primary-600 hover:bg-primary-50 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Send to Another Email
            </button>

            <div className="text-sm text-gray-500 pt-2">
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={handleTryAnotherEmail}
                className="text-primary-600 hover:text-primary-800 font-medium"
              >
                try another email address
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Enter your registered email"
                required
                disabled={isLoading}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              We'll send a reset link to this email
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending Reset Link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>

          <div className="text-center">
            <Link
              to={buildAdminPath("/login")}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Remember your password? Sign in
            </Link>
          </div>
        </form>
      )}
      {!success && (
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>You'll receive an email with a password reset link.</p>
          <p>The link will expire in 1 hour for security.</p>
        </div>
      )}
    </AdminAuthShell>
  );
}
