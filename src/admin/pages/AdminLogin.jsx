import React, { useState } from "react";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../common/context/AuthContext";
import { useSettings } from "../../common/context/SettingsContext";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";
import {
  buildAdminPath,
  extractTenantFromPath,
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
  const navigate = useNavigate();
  const { login } = useAuth();
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
        navigate(resolveAccessibleAdminHomePath({ role }));
      } else {
        setError(response.message || "Login failed");
      }
    } catch (error) {
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AdminAuthShell
      settings={settings}
      eyebrow={isPlatformLogin ? "Platform Admin" : "Admin Portal"}
      title={
        isPlatformLogin
          ? "Sign in to the platform admin panel"
          : "Sign in to your restaurant workspace"
      }
      description={
        isPlatformLogin
          ? "This login is reserved for the super admin. Restaurant admins and staff should sign in from their tenant workspace admin URL."
          : "Use your staff credentials to manage orders, tables, kitchen flow, and day-to-day operations."
      }
      mobileAuthMode="preview"
      mobilePrimaryActionLabel="Login To Admin Panel"
      mobileBackActionLabel="Back to overview"
      sideTitle={
        isPlatformLogin
          ? "Platform oversight starts from a separate, protected admin login."
          : "A cleaner service dashboard starts with a calmer sign-in flow."
      }
      sideDescription={
        isPlatformLogin
          ? "Use this page only for super admin access. Tenant admins, managers, chefs, and waiters should use their own restaurant workspace admin panel."
          : "This admin space is designed for staff speed: quick access, clearer focus, and fewer distractions during service."
      }
      highlights={[
        {
          title: "Live operations",
          description: isPlatformLogin
            ? "Super admin access is separated from tenant staff sign-in for safer workspace control."
            : "Track orders, table status, and kitchen updates without leaving the workflow.",
        },
        {
          title: "Role-aware access",
          description: isPlatformLogin
            ? "Tenant users should log in only from their own workspace admin URL."
            : "Admins, managers, waiters, and chefs land in the right area after sign in.",
        },
      ]}
    >
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
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="email"
              value={credentials.email}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="Enter email address"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type={showPassword ? "text" : "password"}
              value={credentials.password}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="Enter password"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-slate-900"
            >
              {showPassword ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="text-right">
          <Link
            to={buildAdminPath("/forgot-password")}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            Forgot your password?
          </Link>
        </div>

        {isPlatformLogin ? (
          <div className="text-center text-sm text-slate-500">
            New restaurant?{" "}
            <Link
              to={buildAdminPath("/tenant-registration")}
              className="font-medium text-sky-700 hover:text-sky-800"
            >
              Register your tenant
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Use your restaurant-specific admin URL to sign in. Platform admin
            login is only for the super admin.
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </AdminAuthShell>
  );
}
