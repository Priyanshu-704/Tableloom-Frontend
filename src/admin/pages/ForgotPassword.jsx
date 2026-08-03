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
      eyebrow={success ? "Email Sent" : "Password Recovery"}
      title={success ? "Check your inbox" : "Reset your password"}
      description={
        success
          ? "A reset link has been sent to your email address. Follow the instructions to reset your password."
          : "Enter your registered email address and we'll send you a secure password reset link."
      }
      sideLabel="Security Recovery"
      sideTitle="Recovery should feel reassuring & safe."
      sideDescription="These screens guide staff back into the system quickly while keeping password recovery clear and secure."
      highlights={[
        {
          title: "🛡️ Time-Sensitive Links",
          description: "Reset links expire automatically so temporary tokens do not remain valid.",
        },
        {
          title: "🚀 Fast Recovery",
          description: "Staff can return to active service quickly without manual admin intervention.",
        },
      ]}
      mobileAuthMode="formOnly"
    >
      {success ? (
        <div className="text-center py-2 space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
            <CheckCircle className="h-7 w-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Reset Link Sent
            </h3>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs font-semibold text-emerald-800 shadow-2xs mb-2">
              {successMessage}
            </div>

            <p className="font-bold text-sky-700 text-sm">{email}</p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => navigate(buildAdminPath("/login"))}
              className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-3.5 text-xs font-bold text-white shadow-md transition hover:from-sky-500 hover:to-blue-500 active:scale-[0.99]"
            >
              Return to Login
            </button>

            <button
              onClick={handleTryAnotherEmail}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Send to Another Email
            </button>

            <p className="text-xs text-slate-500 pt-2">
              Didn't receive the email? Check spam or{" "}
              <button
                onClick={handleTryAnotherEmail}
                className="font-bold text-sky-600 hover:underline"
              >
                try another address
              </button>
            </p>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 shadow-2xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15"
                placeholder="admin@restaurant.com"
                required
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              A single-use security reset link will be dispatched immediately.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition-all hover:from-sky-500 hover:to-indigo-500 disabled:opacity-60 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Reset Link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>

          <div className="text-center pt-1">
            <Link
              to={buildAdminPath("/login")}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline"
            >
              Remember your password? Sign in
            </Link>
          </div>
        </form>
      )}
    </AdminAuthShell>
  );
}
