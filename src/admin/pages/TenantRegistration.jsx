import React, { useState } from "react";
import {
  Building2,
  CreditCard,
  IndianRupee,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSettings } from "../../common/context/SettingsContext";
import { tenantService } from "../../common/services";
import { buildAdminPath } from "../../common/utils/routes";
import {
  buildTenantWorkspacePath,
  normalizeTenantKeyInput,
  normalizeTenantSlugInput,
} from "../../common/utils/tenantWorkspace";
import loadRazorpayCheckout from "../../common/utils/loadRazorpayCheckout";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";

const REGISTRATION_AMOUNT = 10000;
const initialForm = {
  restaurantName: "",
  slug: "",
  key: "",
  adminName: "",
  adminEmail: "",
  phone: "",
  subscriptionPlan: "starter",
  paymentMethod: "online",
  paymentReference: "",
};

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export function TenantRegistration() {
  const { settings } = useSettings();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentContext, setPaymentContext] = useState(null);

  const inputClassName =
    "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
  const labelClassName = "block text-sm font-semibold text-slate-800";


  const routePreview =
    form.slug && form.key
      ? buildTenantWorkspacePath({
          slug: normalizeTenantSlugInput(form.slug),
          key: normalizeTenantKeyInput(form.key),
        })
      : "/your-slug/yourkey";

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]:
        field === "slug"
          ? normalizeTenantSlugInput(value)
          : field === "key"
            ? normalizeTenantKeyInput(value)
            : value,
    }));
  };

  const launchOnlinePayment = async (registrationContext) => {
    try {
      setSubmitting(true);
      setError("");
      const orderResponse = await tenantService.createRegistrationPaymentOrder(
        registrationContext.tenantId,
      );
      const orderPayload = orderResponse?.data?.order || null;
      const tenantPayload = orderResponse?.data?.tenant || null;
      const paymentPayload = orderResponse?.data?.payment || null;
      const razorpayKey = orderResponse?.data?.keyId || "";

      if (!orderPayload?.id || !razorpayKey) {
        throw new Error(
          "Razorpay is not configured yet. Add the Razorpay test key before retrying.",
        );
      }

      const RazorpayCheckout = await loadRazorpayCheckout();
      const checkout = new RazorpayCheckout({
        key: razorpayKey,
        amount: Number(orderPayload.amount || 0),
        currency: orderPayload.currency || "INR",
        name:
          settings?.restaurantName ||
          settings?.restaurantInfo?.name ||
          "TableLoom Platform",
        description: `Tenant registration for ${tenantPayload?.name || registrationContext.restaurantName}`,
        order_id: orderPayload.id,
        prefill: {
          name: tenantPayload?.adminName || registrationContext.adminName || "",
          email:
            tenantPayload?.adminEmail || registrationContext.adminEmail || "",
          contact: tenantPayload?.phone || registrationContext.phone || "",
        },
        notes: {
          tenantId: registrationContext.tenantId,
          tenantName: tenantPayload?.name || registrationContext.restaurantName,
        },
        theme: {
          color: "#0f172a",
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setSuccess(
              "Registration request was saved, but the online payment is still pending. You can retry the payment below.",
            );
          },
        },
        handler: async (paymentResult) => {
          const verificationResponse =
            await tenantService.verifyRegistrationPayment(
              registrationContext.tenantId,
              {
                razorpayOrderId:
                  paymentResult?.razorpay_order_id || orderPayload.id,
                razorpayPaymentId: paymentResult?.razorpay_payment_id || "",
                razorpaySignature: paymentResult?.razorpay_signature || "",
              },
            );

          if (!verificationResponse?.success) {
            setSubmitting(false);
            setError(
              verificationResponse?.message ||
                "Payment verification failed. Please retry.",
            );
            return;
          }

          setSubmitting(false);
          setPaymentContext(null);
          setForm(initialForm);
          setSuccess(
            `Registration submitted and ${formatCurrency(paymentPayload?.amount || REGISTRATION_AMOUNT)} payment received. Super admin approval is now pending, and credentials will be emailed to ${registrationContext.adminEmail} after approval.`,
          );
        },
      });

      checkout.on("payment.failed", (event) => {
        setSubmitting(false);
        setError(
          event?.error?.description ||
            "Payment failed. The registration request is saved and you can retry the payment.",
        );
      });

      checkout.open();
    } catch (submitError) {
      setSubmitting(false);
      setError(
        submitError?.message ||
          "Registration was saved but the payment step could not be started.",
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await tenantService.registerTenant(form);
      const tenantId = response?.data?.tenantId || "";

      if (!tenantId) {
        throw new Error("Tenant registration was created without an ID");
      }

      const nextPaymentContext = {
        tenantId,
        restaurantName: form.restaurantName,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        phone: form.phone,
      };
      setPaymentContext(nextPaymentContext);

      if (form.paymentMethod === "manual") {
        setSubmitting(false);
        setPaymentContext(null);
        setForm(initialForm);
        setSuccess(
          response?.message ||
            `Registration submitted successfully. The ${formatCurrency(REGISTRATION_AMOUNT)} manual/testing payment request is now waiting for super admin approval.`,
        );
        return;
      }

      await launchOnlinePayment(nextPaymentContext);
    } catch (submitError) {
      setSubmitting(false);
      setError(submitError?.message || "Failed to submit registration");
    }
  };

  return (
    <AdminAuthShell
      contentScrollable
      mobileAuthMode="formOnly"
      settings={settings}
      eyebrow="Platform Onboarding"
      title="Register Your Restaurant Workspace"
      description="Submit your restaurant details."
      sideTitle="Launch your workspace with payment-first onboarding."
      sideDescription="Online payments are captured through Razorpay, while manual/testing requests stay pending for super admin review. Credentials are emailed only after approval."
      highlights={[
        {
          title: "₹10,000 registration fee",
          description:
            "Every self-service tenant request now includes a fixed onboarding payment amount.",
        },
        {
          title: "Approval before credentials",
          description:
            "The platform team approves the registration and then the admin email receives a secure password setup link.",
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
        {paymentContext ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">
            Registration reference: <strong>{paymentContext.tenantId}</strong>
            <br />
            If the online payment was interrupted, you can retry it below
            without creating another registration request.
            <div className="mt-3">
              <button
                type="button"
                onClick={() => launchOnlinePayment(paymentContext)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Retry Online Payment
              </button>
            </div>
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
            </label>

            <label className={labelClassName}>
              Preferred Workspace Key
              <input
                className={inputClassName}
                placeholder="Example: main-01"
                value={form.key}
                onChange={(event) => handleChange("key", event.target.value)}
              />
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
        </label>

        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <IndianRupee className="mt-0.5 h-5 w-5 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                Registration Payment
              </p>
             
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-2xl border px-4 py-4 ${form.paymentMethod === "online" ? "border-slate-900 bg-white" : "border-emerald-200 bg-white/70"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="tenant-payment-method"
                  value="online"
                  checked={form.paymentMethod === "online"}
                  onChange={(event) =>
                    handleChange("paymentMethod", event.target.value)
                  }
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-slate-900">Online Payment</p>
                </div>
              </div>
            </label>

            <label
              className={`cursor-pointer rounded-2xl border px-4 py-4 ${form.paymentMethod === "manual" ? "border-slate-900 bg-white" : "border-emerald-200 bg-white/70"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="tenant-payment-method"
                  value="manual"
                  checked={form.paymentMethod === "manual"}
                  onChange={(event) =>
                    handleChange("paymentMethod", event.target.value)
                  }
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-slate-900">
                    Manual / Testing Approval
                  </p>
                </div>
              </div>
            </label>
          </div>

          {form.paymentMethod === "manual" ? (
            <label className={`${labelClassName} mt-4`}>
              Manual Payment Reference
              <input
                className={inputClassName}
                placeholder="Optional: bank transfer ref, cash note, testing note"
                value={form.paymentReference}
                onChange={(event) =>
                  handleChange("paymentReference", event.target.value)
                }
              />
            </label>
          ) : null}
        </div>

        

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : form.paymentMethod === "online" ? (
            <CreditCard className="h-4 w-4" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          {submitting
            ? "Processing..."
            : form.paymentMethod === "online"
              ? "Submit & Pay Registration Fee"
              : "Submit & Request Manual Approval"}
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
