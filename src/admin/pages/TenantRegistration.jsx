import React, { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSettings } from "../../common/context/SettingsContext";
import { tenantService } from "../../common/services";
import { buildAdminPath } from "../../common/utils/routes";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";

const initialForm = {
  restaurantName: "",
  slug: "",
  key: "",
  adminName: "",
  adminEmail: "",
  phone: "",
  subscriptionPlan: "starter",
};

const normalizeSlugInput = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeKeyInput = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export function TenantRegistration() {
  const { settings } = useSettings();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputClassName =
    "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
  const labelClassName = "block text-sm font-semibold text-slate-800";
  const hintClassName = "mt-2 text-xs leading-5 text-slate-500";
  const routePreview = form.slug && form.key
    ? `/${normalizeSlugInput(form.slug)}/${normalizeKeyInput(form.key)}`
    : "/your-slug/yourkey";

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]:
        field === "slug"
          ? normalizeSlugInput(value)
          : field === "key"
            ? normalizeKeyInput(value)
            : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await tenantService.registerTenant(form);
      setSuccess(
        response?.message || "Tenant registration submitted successfully",
      );
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError?.message || "Failed to submit registration");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminAuthShell
      contentScrollable
      mobileAuthMode="formOnly"
      settings={settings}
      eyebrow="Platform Onboarding"
      title="Register Your Restaurant Workspace"
      description="Submit your restaurant details and the platform team will verify your workspace before admin access is activated."
      sideTitle="Launch your workspace with a verified setup."
      sideDescription="Once approved, your tenant admin credentials will be provisioned and you can sign in from the same admin portal."
      highlights={[
        {
          title: "One admin experience",
          description:
            "Tenant admins and platform admins use the same admin panel, with different capabilities.",
        },
        {
          title: "Verification first",
          description:
            "New self-registrations stay pending until the platform team reviews them.",
        },
      ]}
    >
      <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <label className={labelClassName}>
            Restaurant Name
            <input
              className={inputClassName}
              placeholder="Example: Tableloom Restaurant"
              value={form.restaurantName}
              onChange={(event) =>
                handleChange("restaurantName", event.target.value)
              }
            />
          </label>

          <label className={labelClassName}>
            Contact Phone Number
            <input
              className={inputClassName}
              placeholder="Example: +91 98765 43210"
              value={form.phone}
              onChange={(event) => handleChange("phone", event.target.value)}
            />
          </label>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Tenant Route Setup
              </p>
              <p className="text-xs leading-5 text-slate-500">
                These values become the workspace path used for admin login,
                customer links, and table QR scans.
              </p>
            </div>
            <div className="w-full rounded-2xl bg-slate-900 px-3 py-3 text-left text-xs font-medium text-white">
              <span className="block text-[10px] uppercase tracking-[0.2em] text-sky-200">
                Route Preview
              </span>
              <span className="mt-1 block break-all font-mono text-[13px]">
                {routePreview}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
            <label className={labelClassName}>
              Preferred Workspace Slug
              <input
                className={inputClassName}
                placeholder="Example: tableloom-restaurant"
                value={form.slug}
                onChange={(event) => handleChange("slug", event.target.value)}
              />
              <p className={hintClassName}>
                Lowercase letters, numbers, and hyphens only.
              </p>
            </label>

            <label className={labelClassName}>
              Preferred Workspace Key
              <input
                className={inputClassName}
                placeholder="Example: main01"
                value={form.key}
                onChange={(event) => handleChange("key", event.target.value)}
              />
              <p className={hintClassName}>
                Short unique key without spaces. This pairs with the slug in the
                QR URL.
              </p>
            </label>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClassName}>
            Admin Full Name
            <input
              className={inputClassName}
              placeholder="Example: Ayesha Khan"
              value={form.adminName}
              onChange={(event) =>
                handleChange("adminName", event.target.value)
              }
            />
          </label>

          <label className={labelClassName}>
            Admin Email Address
            <input
              className={inputClassName}
              placeholder="Example: admin@yourrestaurant.com"
              type="email"
              value={form.adminEmail}
              onChange={(event) =>
                handleChange("adminEmail", event.target.value)
              }
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold text-slate-900">
            Future Admin Contact
          </p>
          <p className="mt-1 text-sm text-slate-600">
            These details will be used for the first admin account after
            approval.
          </p>

          <div className="mt-4 rounded-2xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-700">
            Approved QR links will open under{" "}
            <span className="font-mono font-semibold text-slate-900">
              {routePreview}/table/:tableNumber
            </span>
            .
          </div>
        </div>

        <label className={labelClassName}>
          Subscription Plan
          <select
            className={inputClassName}
            value={form.subscriptionPlan}
            onChange={(event) =>
              handleChange("subscriptionPlan", event.target.value)
            }
          >
            <option value="starter">
              Starter - small restaurants or trial setup
            </option>
            <option value="growth">
              Growth - growing teams and daily operations
            </option>
            <option value="enterprise">
              Enterprise - advanced or multi-location operations
            </option>
          </select>
          <p className={hintClassName}>
            Choose the plan you expect to start with. It can be reviewed later
            during onboarding.
          </p>
        </label>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          After submission, the platform team reviews your request. Once
          approved, your admin credentials are created and you can sign in from
          the same admin portal.
        </div>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          {submitting ? "Submitting..." : "Submit Registration Request"}
        </button>

        <div className="pb-1 text-center text-sm text-slate-500">
          Already have admin credentials?{" "}
          <Link
            className="font-medium text-sky-700 hover:text-sky-800"
            to={buildAdminPath("/login")}
          >
            Sign in
          </Link>
        </div>
      </form>
    </AdminAuthShell>
  );
}
