import React, { useState } from "react";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../common/context/AuthContext";
import { useSettings } from "../../common/context/SettingsContext";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";
import {
  buildAdminPath,
  extractTenantFromPath,
  withAppBasePath,
} from "../../common/utils/routes";
import { resolveAccessibleAdminHomePath } from "../utils/accessControl";
export function AdminLogin() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [renewalLink, setRenewalLink] = useState("");
  const navigate = useNavigate();
  const { login, permissions } = useAuth();
  const { settings } = useSettings();
  const tenantContext =
    typeof window !== "undefined"
      ? extractTenantFromPath(window.location.pathname)
      : null;
  const isPlatformLogin = !tenantContext;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError("Please enter both email and password");
      return;
    }
    setIsLoading(true);
    setError("");
    setRenewalLink("");
    try {
      const response = await login(credentials.email, credentials.password);
      if (response.success) {
        const role = response.data.role;
        const mustUpdatePassword = Boolean(response?.data?.forcePasswordChange);
        if (mustUpdatePassword) {
          navigate(buildAdminPath("/force-password-update"));
          return;
        }
        if (
          !["super_admin", "admin", "manager", "waiter", "chef"].includes(role)
        ) {
          setError("You don't have permission to access admin portal");
          return;
        }
        if (isPlatformLogin && role !== "super_admin") {
          setError(
            "Only the super admin can sign in at this URL. Restaurant staff must use their tenant admin panel login URL.",
          );
          return;
        }
        navigate(
          resolveAccessibleAdminHomePath(
            {
              role,
            },
            response?.data?.permissions || permissions || [],
          ),
        );
      } else {
        setError(response.message || "Login failed");
      }
    } catch (error) {
      if (error.code === "SUBSCRIPTION_INACTIVE" && error.renewalToken && error.tenantSlug && error.tenantKey) {
        setError(error.message || "This restaurant subscription has expired.");
        setRenewalLink(withAppBasePath(`/${error.tenantSlug}/${error.tenantKey}/subscription-renewal?token=${error.renewalToken}`));
      } else {
        setError(error.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AdminAuthShell
      settings={settings}
      eyebrow={isPlatformLogin ? "Super Admin Access" : "Admin Portal"}
      title={
        isPlatformLogin
          ? "Platform Admin Sign In"
          : "Sign in to your workspace"
      }
      description={
        isPlatformLogin
          ? "This portal is reserved for super admin access. Restaurant staff should log in via their workspace URL."
          : "Enter your staff credentials to manage live orders, table status, and restaurant operations."
      }
      sideLabel="Admin Access"
      sideTitle={
        isPlatformLogin
          ? "Platform oversight & tenant workspace governance."
          : "Manage live service with speed & total control."
      }
      sideDescription={
        isPlatformLogin
          ? "Centralized super admin control panel for provisioning tenants, infrastructure monitoring, and global platform settings."
          : "Streamline table management, order routing, kitchen stations, and billing from one unified admin workspace."
      }
      highlights={[
        {
          title: "⚡ Live Operations",
          description: isPlatformLogin
            ? "Super admin access is isolated from tenant staff sign-ins for safer platform control."
            : "Track live orders, table occupancy, and kitchen updates without leaving the flow.",
        },
        {
          title: "🔒 Role-Aware Access",
          description: isPlatformLogin
            ? "Tenant admins and staff log in via their unique restaurant workspace URLs."
            : "Role-tailored dashboards for admins, managers, waiters, and kitchen staff.",
        },
      ]}
      contentScrollable
      mobileAuthMode="formOnly"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 shadow-2xs flex flex-col gap-2">
            <div>{error}</div>
            {renewalLink && (
              <Link
                to={renewalLink}
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 transition shadow-sm"
              >
                Renew Subscription Now
              </Link>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="email"
              value={credentials.email}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15"
              placeholder="admin@restaurant.com"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Password
            </label>
            <Link
              to={buildAdminPath("/forgot-password")}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type={showPassword ? "text" : "password"}
              value={credentials.password}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15"
              placeholder="••••••••"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isPlatformLogin ? (
          <div className="text-center text-xs font-medium text-slate-500 pt-1">
            New restaurant?{" "}
            <Link
              to={buildAdminPath("/tenant-registration")}
              className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
            >
              Register your workspace
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3 text-xs font-medium text-sky-900 shadow-2xs">
            💡 Sign in using your restaurant's custom admin URL.
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition-all hover:from-sky-500 hover:to-indigo-500 disabled:opacity-60 active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing In...
            </>
          ) : (
            "Sign In to Admin Portal"
          )}
        </button>
      </form>
    </AdminAuthShell>
  );
}
