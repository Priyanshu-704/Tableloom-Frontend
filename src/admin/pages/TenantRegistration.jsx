import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  GitBranch,
  Globe,
  Key,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tag,
  User,
  Zap,
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

/* ─── helpers ─── */
const fmt = (v, cur = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const calcPrice = (plan, billingPeriod) => {
  if (!plan) return 0;
  const mp = Number(plan.monthlyPrice || 0);
  const period =
    { monthly: 1, half_yearly: 5.5, annually: 10 }[billingPeriod] ?? 1;
  return Math.round(mp * period);
};

const PLAN_ICONS = { starter: Star, growth: Zap, enterprise: Sparkles };
const PLAN_COLORS = {
  starter: "from-slate-700 to-slate-800 text-white",
  growth: "from-sky-600 to-indigo-600 text-white",
  enterprise: "from-amber-500 to-orange-600 text-white",
};
const PLAN_BORDER = {
  starter: "border-slate-300 ring-2 ring-slate-200",
  growth: "border-sky-500 ring-4 ring-sky-500/15",
  enterprise: "border-amber-400 ring-4 ring-amber-400/15",
};

/* ─── Step indicator ─── */
function StepIndicator({ step }) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        {[
          { s: 1, label: "Restaurant & Admin Details", icon: Building2 },
          { s: 2, label: "Plan & Billing", icon: CreditCard },
        ].map(({ s, label, icon: Icon }) => (
          <React.Fragment key={s}>
            <div className="flex flex-1 items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold transition-all ${
                  step === s
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 ring-4 ring-slate-900/10"
                    : step > s
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {step > s ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step 0{s}
                </p>
                <p
                  className={`truncate text-xs font-bold ${
                    step === s ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {label}
                </p>
              </div>
            </div>
            {s < 2 && (
              <div
                className={`h-0.5 w-8 shrink-0 rounded-full sm:w-12 ${
                  step > 1 ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Plan card ─── */
function PlanCard({ plan, selected, billingPeriod, trialDays, onSelect }) {
  if (!plan) return null;
  const Icon = PLAN_ICONS[plan.key] || Star;
  const price = calcPrice(plan, billingPeriod);
  const isGrowth = plan.key === "growth";

  return (
    <button
      type="button"
      onClick={() => onSelect(plan.key)}
      className={`relative flex w-full flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all hover:scale-[1.01] ${
        selected
          ? `${PLAN_BORDER[plan.key]} bg-white shadow-xl`
          : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
      }`}
    >
      {isGrowth && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
          Most Popular
        </span>
      )}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${PLAN_COLORS[plan.key]} shadow-sm`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{plan.name}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <GitBranch className="h-3 w-3 text-sky-500" />
                {plan.branchLimit === null
                  ? "Unlimited branches"
                  : plan.branchLimit === 1
                    ? "1 Branch"
                    : `Up to ${plan.branchLimit} Branches`}
              </span>
            </div>
          </div>
          {selected && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        {billingPeriod === "trial" ? (
          <div className="my-2 rounded-xl bg-emerald-50 p-2.5 text-center border border-emerald-100">
            <p className="text-lg font-extrabold text-emerald-700">FREE</p>
            <p className="text-[11px] font-medium text-emerald-800">
              {trialDays}-Day Free Trial · No card required
            </p>
          </div>
        ) : (
          <div className="my-2 rounded-xl bg-slate-50 p-2.5 text-center border border-slate-100">
            <p className="text-lg font-extrabold text-slate-900">{fmt(price)}</p>
            <p className="text-[11px] text-slate-500">
              per{" "}
              {billingPeriod === "half_yearly"
                ? "6 months"
                : billingPeriod === "annually"
                  ? "year"
                  : "month"}
            </p>
          </div>
        )}

        <ul className="space-y-1.5 pt-1">
          {plan.allowSubBranches && (
            <li className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" /> Multi-branch architecture
            </li>
          )}
          <li className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <BadgeCheck className="h-3.5 w-3.5 text-sky-500" /> Full management panel
          </li>
        </ul>
      </div>
    </button>
  );
}

/* ─── Billing period selector ─── */
function BillingSelector({
  value,
  onChange,
  billingPeriods,
  plans,
  selectedPlan,
  trialBlocked,
}) {
  const plan = plans.find((p) => p.key === selectedPlan);
  const LABELS = {
    trial: "7-Day Free Trial",
    monthly: "Monthly",
    half_yearly: "Half-Yearly (Save 8%)",
    annually: "Annually (Save 17%)",
  };

  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
        Choose Billing Cycle
      </label>
      <div className="grid grid-cols-2 gap-2">
        {billingPeriods.map((period) => {
          const isTrial = period.key === "trial";
          const blocked = isTrial && trialBlocked;
          const price = isTrial ? 0 : calcPrice(plan, period.key);
          return (
            <button
              key={period.key}
              type="button"
              disabled={blocked}
              onClick={() => !blocked && onChange(period.key)}
              title={
                blocked
                  ? "This email has already used the 7-day trial and cannot use it again."
                  : undefined
              }
              className={`relative rounded-xl border p-3 text-left transition-all ${
                blocked
                  ? "cursor-not-allowed border-slate-200 bg-slate-100/60 opacity-50"
                  : value === period.key
                    ? "border-sky-500 bg-sky-50/80 font-bold text-sky-900 ring-2 ring-sky-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <p className="text-xs font-bold">
                {LABELS[period.key] ?? period.name}
                {blocked && <span className="ml-1 text-[10px] text-amber-600">🔒 Used</span>}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                {isTrial
                  ? blocked
                    ? "Trial already claimed"
                    : "₹0 · No payment needed"
                  : fmt(price)}
              </p>
            </button>
          );
        })}
      </div>
      {trialBlocked && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold rounded-xl bg-amber-50 p-2.5 border border-amber-200">
          <span>⚠️</span> This email has already used the 7-day free trial. Please select a paid billing period.
        </p>
      )}
    </div>
  );
}

/* ─── Main component ─── */
const initialStep1 = {
  restaurantName: "",
  slug: "",
  key: "",
  adminName: "",
  adminEmail: "",
  phone: "",
  organizationType: "restaurant",
};

export function TenantRegistration() {
  const { settings } = useSettings();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [form1, setForm1] = useState(initialStep1);
  const [err1, setErr1] = useState({});

  // Step 2 state
  const [plans, setPlans] = useState([]);
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [trialDays, setTrialDays] = useState(7);
  const [selectedPlan, setSelectedPlan] = useState("growth");
  const [billingPeriod, setBillingPeriod] = useState("trial");
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [paymentReference, setPaymentReference] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentContext, setPaymentContext] = useState(null);
  const [trialBlocked, setTrialBlocked] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 transition-all focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/15";
  const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-700";

  const routePreview =
    form1.slug && form1.key
      ? buildTenantWorkspacePath({
          slug: normalizeTenantSlugInput(form1.slug),
          key: normalizeTenantKeyInput(form1.key),
        })
      : "/your-slug/your-key";

  /* Load plans on mount */
  useEffect(() => {
    setLoadingPlans(true);
    tenantService
      .getSubscriptionPlans()
      .then((res) => {
        const data = res?.data || {};
        setPlans(Array.isArray(data.plans) ? data.plans : []);
        setBillingPeriods(
          Array.isArray(data.billingPeriods) ? data.billingPeriods : [],
        );
        setTrialDays(Number(data.trialDays || 7));
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  /* Step 1 field change */
  const handleChange1 = (field, value) => {
    const nextValue =
      field === "slug"
        ? normalizeTenantSlugInput(value)
        : field === "key"
          ? normalizeTenantKeyInput(value)
          : field === "phone"
            ? String(value || "").replace(/\D/g, "").slice(0, 10)
            : value;

    setForm1((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
    setErr1((prev) => ({ ...prev, [field]: "" }));
  };

  /* Step 1 validation */
  const validateStep1 = () => {
    const e = {};
    if (!form1.restaurantName.trim())
      e.restaurantName = "Restaurant name is required";
    if (!form1.slug.trim()) e.slug = "Workspace slug is required";
    if (!form1.key.trim()) e.key = "Workspace key is required";
    if (!form1.adminName.trim()) e.adminName = "Admin name is required";
    if (!form1.adminEmail.trim()) e.adminEmail = "Admin email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form1.adminEmail))
      e.adminEmail = "Enter a valid email address";
    if (form1.phone?.trim() && form1.phone.trim().length !== 10) {
      e.phone = "Phone number must be exactly 10 digits";
    }
    return e;
  };

  const goToStep2 = () => {
    const e = validateStep1();
    if (Object.keys(e).length) {
      setErr1(e);
      return;
    }
    setStep(2);
    setGlobalError("");
  };

  /* Calculate price */
  const selectedPlanObj = plans.find((p) => p.key === selectedPlan);
  const amount =
    billingPeriod === "trial" ? 0 : calcPrice(selectedPlanObj, billingPeriod);
  const isTrial = billingPeriod === "trial";

  /* Razorpay handler */
  const launchOnlinePayment = useCallback(
    async (ctx) => {
      try {
        setSubmitting(true);
        setGlobalError("");
        const orderRes =
          await tenantService.createRegistrationPaymentOrder(
            ctx.tenantId,
            ctx.paymentAccessToken,
          );
        const order = orderRes?.data?.order;
        const razorpayKey = orderRes?.data?.keyId || "";
        if (!order?.id || !razorpayKey)
          throw new Error("Razorpay not configured. Please use Manual / Testing payment option.");

        const RazorpayCheckout = await loadRazorpayCheckout();
        const rzp = new RazorpayCheckout({
          key: razorpayKey,
          amount: Number(order.amount || 0),
          currency: order.currency || "INR",
          name: settings?.restaurant?.name || "Tableloom Platform",
          description: `Registration — ${ctx.restaurantName}`,
          order_id: order.id,
          prefill: {
            name: ctx.adminName,
            email: ctx.adminEmail,
            contact: ctx.phone,
          },
          theme: { color: "#0f172a" },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              setGlobalError(
                "Payment was cancelled or incomplete. Tenant registration will not be finalized until Razorpay payment is completed or Manual Testing is selected.",
              );
            },
          },
          handler: async (result) => {
            const verRes = await tenantService.verifyRegistrationPayment(
              ctx.tenantId,
              {
                paymentAccessToken: ctx.paymentAccessToken,
                razorpayOrderId: result.razorpay_order_id || order.id,
                razorpayPaymentId: result.razorpay_payment_id || "",
                razorpaySignature: result.razorpay_signature || "",
              },
            );
            if (!verRes?.success) {
              setSubmitting(false);
              setGlobalError(
                verRes?.message || "Payment verification failed. Registration was not finalized.",
              );
              return;
            }
            setSubmitting(false);
            setPaymentContext(null);
            setSuccess(
              `✅ Payment received (${fmt(order.amount / 100)}). Super admin approval pending. Credentials will be emailed to ${ctx.adminEmail}.`,
            );
          },
        });
        rzp.on("payment.failed", (ev) => {
          setSubmitting(false);
          setGlobalError(
            ev?.error?.description ||
              "Payment failed. Registration was not finalized. Please complete payment or select Manual / Testing option.",
          );
        });
        rzp.open();
      } catch (err) {
        setSubmitting(false);
        setGlobalError(err?.message || "Could not start payment.");
      }
    },
    [settings],
  );

  /* Final submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setGlobalError("");
    setSuccess("");

    const payload = {
      ...form1,
      subscriptionPlan: selectedPlan,
      billingPeriod,
      paymentMethod: isTrial ? "manual" : paymentMethod,
      paymentReference,
    };

    try {
      const res = await tenantService.registerTenant(payload);
      const tenantId = res?.data?.tenantId || "";
      const paymentAccessToken = res?.data?.paymentAccessToken || "";

      if (!tenantId)
        throw new Error("Registration failed — no tenant ID returned.");

      if (isTrial) {
        setSubmitting(false);
        setSuccess(
          `🎉 ${trialDays}-day free trial started! Your credentials will be emailed to ${form1.adminEmail} after super admin approval. An expiry reminder will be sent automatically.`,
        );
        return;
      }

      if (paymentMethod === "manual") {
        setSubmitting(false);
        setSuccess(
          res?.message ||
            `Registration submitted. Manual payment request pending super admin approval.`,
        );
        return;
      }

      const ctx = {
        tenantId,
        paymentAccessToken,
        restaurantName: form1.restaurantName,
        adminName: form1.adminName,
        adminEmail: form1.adminEmail,
        phone: form1.phone,
      };
      setPaymentContext(ctx);
      await launchOnlinePayment(ctx);
    } catch (err) {
      setSubmitting(false);
      const msg = err?.message || "Failed to submit registration.";
      if (msg.toLowerCase().includes("trial")) {
        setTrialBlocked(true);
        if (billingPeriod === "trial") setBillingPeriod("monthly");
      }
      setGlobalError(msg);
    }
  };

  /* ─── Step 1 UI ─── */
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Restaurant Name <span className="text-rose-500">*</span>
          <div className="relative mt-1.5">
            <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} ${err1.restaurantName ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : ""}`}
              placeholder="e.g. Spice Garden"
              value={form1.restaurantName}
              onChange={(e) => handleChange1("restaurantName", e.target.value)}
            />
          </div>
          {err1.restaurantName && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600 normal-case">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {err1.restaurantName}
            </p>
          )}
        </label>

        <label className={labelCls}>
          Contact Phone Number
          <div className="relative mt-1.5">
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className={`${inputCls} ${err1.phone ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : ""}`}
              placeholder="e.g. 9876543210"
              value={form1.phone}
              onChange={(e) => handleChange1("phone", e.target.value)}
            />
          </div>
          {err1.phone && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600 normal-case">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {err1.phone}
            </p>
          )}
        </label>
      </div>

      <label className={labelCls}>
        Organization Type
        <div className="relative mt-1.5">
          <Store className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            className={inputCls}
            value={form1.organizationType}
            onChange={(e) => handleChange1("organizationType", e.target.value)}
          >
            {[
              "restaurant",
              "cafe",
              "cloud_kitchen",
              "food_court",
              "hotel",
              "other",
            ].map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </label>

      {/* Workspace Route Box */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-sky-600" /> Workspace Route Preview
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
            Live Preview
          </span>
        </div>
        <div className="rounded-xl bg-slate-900 px-3.5 py-3 font-mono text-xs text-sky-200 break-all shadow-inner border border-slate-800">
          {routePreview}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Slug <span className="text-rose-500">*</span>
            <div className="relative mt-1.5">
              <Tag className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputCls} ${err1.slug ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                placeholder="spice-garden"
                value={form1.slug}
                onChange={(e) => handleChange1("slug", e.target.value)}
              />
            </div>
            {err1.slug && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600 normal-case">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {err1.slug}
              </p>
            )}
          </label>

          <label className={labelCls}>
            Key <span className="text-rose-500">*</span>
            <div className="relative mt-1.5">
              <Key className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputCls} ${err1.key ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                placeholder="main-01"
                value={form1.key}
                onChange={(e) => handleChange1("key", e.target.value)}
              />
            </div>
            {err1.key && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600 normal-case">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {err1.key}
              </p>
            )}
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Admin Full Name <span className="text-rose-500">*</span>
          <div className="relative mt-1.5">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} ${err1.adminName ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : ""}`}
              placeholder="Ayesha Khan"
              value={form1.adminName}
              onChange={(e) => handleChange1("adminName", e.target.value)}
            />
          </div>
          {err1.adminName && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600 normal-case">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {err1.adminName}
            </p>
          )}
        </label>

        <label className={labelCls}>
          Admin Email Address <span className="text-rose-500">*</span>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              className={`${inputCls} ${err1.adminEmail ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : ""}`}
              placeholder="admin@restaurant.com"
              value={form1.adminEmail}
              onChange={(e) => handleChange1("adminEmail", e.target.value)}
            />
          </div>
          {err1.adminEmail && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600 normal-case">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {err1.adminEmail}
            </p>
          )}
        </label>
      </div>

      <button
        type="button"
        onClick={goToStep2}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition-all hover:from-sky-500 hover:to-indigo-500 active:scale-[0.99]"
      >
        Continue to Plan Selection <ArrowRight className="h-4 w-4" />
      </button>

      <p className="text-center text-xs font-medium text-slate-500 pt-2">
        Already registered?{" "}
        <Link
          className="font-bold text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-1"
          to={buildAdminPath("/login")}
        >
          Back to Sign In
        </Link>
      </p>
    </div>
  );

  /* ─── Step 2 UI ─── */
  const renderStep2 = () => (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {globalError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 shadow-2xs">
          {globalError}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-2xs">
          {success}
        </div>
      )}

      {paymentContext && !success && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2 shadow-2xs">
          <p className="font-bold text-amber-950">
            ⚠️ Razorpay Payment Required
          </p>
          <p className="text-amber-800">
            Your registration will only be finalized once Razorpay payment is completed & verified, or if you select the Manual / Testing option.
          </p>
          <button
            type="button"
            onClick={() => launchOnlinePayment(paymentContext)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs disabled:opacity-60 hover:bg-slate-800"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            Complete Razorpay Payment Now
          </button>
        </div>
      )}

      {/* Plan cards */}
      {loadingPlans ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              selected={selectedPlan === plan.key}
              billingPeriod={billingPeriod}
              trialDays={trialDays}
              onSelect={setSelectedPlan}
            />
          ))}
        </div>
      )}

      {/* Billing period */}
      {!loadingPlans && billingPeriods.length > 0 && (
        <BillingSelector
          value={billingPeriod}
          onChange={setBillingPeriod}
          billingPeriods={billingPeriods}
          plans={plans}
          selectedPlan={selectedPlan}
          trialBlocked={trialBlocked}
        />
      )}

      {/* Summary card */}
      {!isTrial && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Total Due Today
              </p>
              <p className="text-xs text-emerald-700">Plan: {selectedPlanObj?.name || selectedPlan}</p>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700">{fmt(amount)}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-xl border p-3 transition-all ${
                paymentMethod === "online"
                  ? "border-slate-900 bg-white ring-2 ring-slate-900/10"
                  : "border-emerald-200 bg-white/70 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pm"
                  value="online"
                  checked={paymentMethod === "online"}
                  onChange={() => setPaymentMethod("online")}
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Online (Razorpay)</p>
                  <p className="text-[10px] text-slate-500">Cards, UPI, Netbanking</p>
                </div>
              </div>
            </label>
            <label
              className={`cursor-pointer rounded-xl border p-3 transition-all ${
                paymentMethod === "manual"
                  ? "border-slate-900 bg-white ring-2 ring-slate-900/10"
                  : "border-emerald-200 bg-white/70 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pm"
                  value="manual"
                  checked={paymentMethod === "manual"}
                  onChange={() => setPaymentMethod("manual")}
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Manual / Testing</p>
                  <p className="text-[10px] text-slate-500">Super admin verification</p>
                </div>
              </div>
            </label>
          </div>
          {paymentMethod === "manual" && (
            <label className={labelCls}>
              Payment Reference Note
              <input
                className={`${inputCls} mt-1.5`}
                placeholder="Bank ref, transaction ID, or offline cash note..."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </label>
          )}
        </div>
      )}

      {/* Trial info */}
      {isTrial && (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50/60 p-4 text-xs text-sky-900 space-y-1 shadow-2xs">
          <p className="font-bold text-sky-950 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-sky-600" /> {trialDays}-Day Free Trial Included
          </p>
          <p className="text-sky-800 leading-relaxed">
            No payment required now. Automatic email notification will be sent before trial expiry. Upgrade anytime.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="submit"
          disabled={submitting || !!success}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:from-slate-800 hover:to-slate-700 disabled:opacity-60 active:scale-[0.99]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isTrial ? (
            <Building2 className="h-4 w-4" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {submitting
            ? "Processing…"
            : isTrial
              ? `Start ${trialDays}-Day Free Trial`
              : paymentMethod === "online"
                ? "Submit & Pay Now"
                : "Submit & Request Approval"}
        </button>
      </div>

      <p className="text-center text-xs font-medium text-slate-500 pt-2">
        Already registered?{" "}
        <Link
          className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
          to={buildAdminPath("/login")}
        >
          Back to Sign In
        </Link>
      </p>
    </form>
  );

  return (
    <AdminAuthShell
      contentScrollable
      mobileAuthMode="formOnly"
      settings={settings}
      eyebrow="Platform Onboarding"
      title={step === 1 ? "Register Your Restaurant" : "Choose Your Plan"}
      description={
        step === 1
          ? "Fill in your restaurant details to provision your dedicated cloud workspace."
          : "Select the subscription plan that best matches your operational scaling requirements."
      }
      sideLabel="Platform Access"
      sideTitle="Launch with flexible pricing & auto setup."
      sideDescription={`Start with a ${trialDays}-day free trial, or pick a paid plan. Multi-branch access, feature controls, and automated email setup are managed seamlessly.`}
      highlights={[
        {
          title: `🎉 ${trialDays}-Day Free Trial`,
          description: "No credit card required today. Automatic expiry email reminder sent before trial end.",
        },
        {
          title: "⚡ Multi-Branch Scaling",
          description: "Starter = 1 branch. Growth = up to 5. Enterprise = unlimited outlets.",
        },
        {
          title: "🔒 Instant Provisioning",
          description: "Admin email receives password setup link immediately after super admin approval.",
        },
      ]}
    >
      <StepIndicator step={step} />
      {step === 1 ? renderStep1() : renderStep2()}
    </AdminAuthShell>
  );
}
