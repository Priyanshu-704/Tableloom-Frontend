import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle,
  CreditCard,
  GitBranch,
  Loader2,
  Sparkles,
  Star,
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
  new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(v || 0));

const calcPrice = (plan, billingPeriod) => {
  if (!plan) return 0;
  const mp = Number(plan.monthlyPrice || 0);
  const period = { monthly: 1, half_yearly: 5.5, annually: 10 }[billingPeriod] ?? 1;
  return Math.round(mp * period);
};

const PLAN_ICONS = { starter: Star, growth: Zap, enterprise: Sparkles };
const PLAN_COLORS = {
  starter: "from-slate-600 to-slate-700",
  growth:  "from-violet-600 to-violet-700",
  enterprise: "from-amber-500 to-orange-600",
};
const PLAN_BORDER = {
  starter: "border-slate-300",
  growth:  "border-violet-400",
  enterprise: "border-amber-400",
};

/* ─── Step indicator ─── */
function StepIndicator({ step }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      {[1, 2].map((s) => (
        <React.Fragment key={s}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
            step === s ? "bg-sky-600 text-white shadow-lg" :
            step > s  ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
          }`}>
            {step > s ? <CheckCircle className="h-4 w-4" /> : s}
          </div>
          <span className={`text-sm font-medium ${step === s ? "text-slate-900" : "text-slate-400"}`}>
            {s === 1 ? "Restaurant Details" : "Choose Plan"}
          </span>
          {s < 2 && <div className={`h-px flex-1 ${step > 1 ? "bg-emerald-400" : "bg-slate-200"}`} />}
        </React.Fragment>
      ))}
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
      className={`relative w-full rounded-2xl border-2 p-5 text-left transition-all ${
        selected ? `${PLAN_BORDER[plan.key]} bg-white shadow-lg ring-2 ring-sky-200` : "border-slate-200 bg-white/60 hover:border-slate-300"
      }`}
    >
      {isGrowth && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
          Most Popular
        </span>
      )}
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${PLAN_COLORS[plan.key]}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900">{plan.name}</p>
          <p className="text-xs text-slate-500">
            {plan.branchLimit === null ? "Unlimited branches" : plan.branchLimit === 1 ? "1 branch" : `Up to ${plan.branchLimit} branches`}
          </p>
        </div>
      </div>

      {billingPeriod === "trial" ? (
        <div className="mb-2">
          <p className="text-2xl font-extrabold text-emerald-600">FREE</p>
          <p className="text-xs text-slate-500">{trialDays}-day trial · No payment required</p>
        </div>
      ) : (
        <div className="mb-2">
          <p className="text-2xl font-extrabold text-slate-900">{fmt(price)}</p>
          <p className="text-xs text-slate-500">
            per {billingPeriod === "half_yearly" ? "6 months" : billingPeriod === "annually" ? "year" : "month"}
          </p>
        </div>
      )}

      <ul className="space-y-1">
        {plan.allowSubBranches && (
          <li className="flex items-center gap-1.5 text-xs text-slate-600">
            <GitBranch className="h-3.5 w-3.5 text-violet-500" /> Multi-branch support
          </li>
        )}
        <li className="flex items-center gap-1.5 text-xs text-slate-600">
          <BadgeCheck className="h-3.5 w-3.5 text-sky-500" /> Full admin panel
        </li>
      </ul>

      {selected && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600">
          <CheckCircle className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </button>
  );
}

/* ─── Billing period selector ─── */
function BillingSelector({ value, onChange, billingPeriods, plans, selectedPlan, trialBlocked }) {
  const plan = plans.find(p => p.key === selectedPlan);
  const LABELS = {
    trial: "7-Day Trial",
    monthly: "Monthly",
    half_yearly: "Half-Yearly (Save ~8%)",
    annually: "Annually (Save ~17%)",
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">Billing Period</p>
      <div className="grid grid-cols-2 gap-2">
        {billingPeriods.map(period => {
          const isTrial = period.key === "trial";
          const blocked = isTrial && trialBlocked;
          const price = isTrial ? 0 : calcPrice(plan, period.key);
          return (
            <button
              key={period.key}
              type="button"
              disabled={blocked}
              onClick={() => !blocked && onChange(period.key)}
              title={blocked ? "This email has already used the 7-day trial and cannot use it again." : undefined}
              className={`relative rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                blocked
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50"
                  : value === period.key
                  ? "border-sky-500 bg-sky-50 font-semibold text-sky-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <p className="font-medium">
                {LABELS[period.key] ?? period.name}
                {blocked && <span className="ml-1 text-xs">🔒 Used</span>}
              </p>
              <p className="text-xs text-slate-400">
                {isTrial
                  ? blocked
                    ? "Already used — one-time only"
                    : "Free · One-time only"
                  : fmt(price)}
              </p>
            </button>
          );
        })}
      </div>
      {trialBlocked && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <span>⚠️</span> This email has already used the free trial. Please select a paid billing period.
        </p>
      )}
    </div>
  );
}

/* ─── Main component ─── */
const initialStep1 = {
  restaurantName: "", slug: "", key: "",
  adminName: "", adminEmail: "", phone: "",
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

  const inputCls = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
  const labelCls = "block text-sm font-semibold text-slate-800";

  const routePreview = form1.slug && form1.key
    ? buildTenantWorkspacePath({ slug: normalizeTenantSlugInput(form1.slug), key: normalizeTenantKeyInput(form1.key) })
    : "/your-slug/your-key";

  /* Load plans on mount */
  useEffect(() => {
    setLoadingPlans(true);
    tenantService.getSubscriptionPlans()
      .then(res => {
        const data = res?.data || {};
        setPlans(Array.isArray(data.plans) ? data.plans : []);
        setBillingPeriods(Array.isArray(data.billingPeriods) ? data.billingPeriods : []);
        setTrialDays(Number(data.trialDays || 7));
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  /* Step 1 field change */
  const handleChange1 = (field, value) => {
    setForm1(prev => ({
      ...prev,
      [field]: field === "slug" ? normalizeTenantSlugInput(value) : field === "key" ? normalizeTenantKeyInput(value) : value,
    }));
    setErr1(prev => ({ ...prev, [field]: "" }));
  };

  /* Step 1 validation */
  const validateStep1 = () => {
    const e = {};
    if (!form1.restaurantName.trim()) e.restaurantName = "Restaurant name is required";
    if (!form1.slug.trim()) e.slug = "Workspace slug is required";
    if (!form1.key.trim()) e.key = "Workspace key is required";
    if (!form1.adminName.trim()) e.adminName = "Admin name is required";
    if (!form1.adminEmail.trim()) e.adminEmail = "Admin email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form1.adminEmail)) e.adminEmail = "Enter a valid email";
    return e;
  };

  const goToStep2 = () => {
    const e = validateStep1();
    if (Object.keys(e).length) { setErr1(e); return; }
    setStep(2);
    setGlobalError("");
  };

  /* Calculate price */
  const selectedPlanObj = plans.find(p => p.key === selectedPlan);
  const amount = billingPeriod === "trial" ? 0 : calcPrice(selectedPlanObj, billingPeriod);
  const isTrial = billingPeriod === "trial";

  /* Razorpay handler */
  const launchOnlinePayment = useCallback(async (ctx) => {
    try {
      setSubmitting(true);
      setGlobalError("");
      const orderRes = await tenantService.createRegistrationPaymentOrder(ctx.tenantId, ctx.paymentAccessToken);
      const order = orderRes?.data?.order;
      const razorpayKey = orderRes?.data?.keyId || "";
      if (!order?.id || !razorpayKey) throw new Error("Razorpay not configured. Please use manual payment.");

      const RazorpayCheckout = await loadRazorpayCheckout();
      const rzp = new RazorpayCheckout({
        key: razorpayKey,
        amount: Number(order.amount || 0),
        currency: order.currency || "INR",
        name: settings?.restaurant?.name || "Tableloom Platform",
        description: `Registration — ${ctx.restaurantName}`,
        order_id: order.id,
        prefill: { name: ctx.adminName, email: ctx.adminEmail, contact: ctx.phone },
        theme: { color: "#0f172a" },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setSuccess("Registration saved. You can retry the payment below.");
          },
        },
        handler: async (result) => {
          const verRes = await tenantService.verifyRegistrationPayment(ctx.tenantId, {
            paymentAccessToken: ctx.paymentAccessToken,
            razorpayOrderId: result.razorpay_order_id || order.id,
            razorpayPaymentId: result.razorpay_payment_id || "",
            razorpaySignature: result.razorpay_signature || "",
          });
          if (!verRes?.success) {
            setSubmitting(false);
            setGlobalError(verRes?.message || "Payment verification failed. Retry.");
            return;
          }
          setSubmitting(false);
          setPaymentContext(null);
          setSuccess(`✅ Payment received (${fmt(order.amount / 100)}). Super admin approval pending. Credentials will be emailed to ${ctx.adminEmail}.`);
        },
      });
      rzp.on("payment.failed", (ev) => {
        setSubmitting(false);
        setGlobalError(ev?.error?.description || "Payment failed. Registration is saved — retry below.");
      });
      rzp.open();
    } catch (err) {
      setSubmitting(false);
      setGlobalError(err?.message || "Could not start payment.");
    }
  }, [settings]);

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

      if (!tenantId) throw new Error("Registration failed — no tenant ID returned.");

      if (isTrial) {
        setSubmitting(false);
        setSuccess(`🎉 ${trialDays}-day free trial started! Your credentials will be emailed to ${form1.adminEmail} after super admin approval. An expiry reminder will be sent automatically.`);
        return;
      }

      if (paymentMethod === "manual") {
        setSubmitting(false);
        setSuccess(res?.message || `Registration submitted. Manual payment request pending super admin approval.`);
        return;
      }

      const ctx = { tenantId, paymentAccessToken, restaurantName: form1.restaurantName, adminName: form1.adminName, adminEmail: form1.adminEmail, phone: form1.phone };
      setPaymentContext(ctx);
      await launchOnlinePayment(ctx);
    } catch (err) {
      setSubmitting(false);
      const msg = err?.message || "Failed to submit registration.";
      // If the backend says the email already used a trial, lock the trial option
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
          <input className={`${inputCls} ${err1.restaurantName ? "border-rose-400" : ""}`} placeholder="e.g. Spice Garden" value={form1.restaurantName} onChange={e => handleChange1("restaurantName", e.target.value)} />
          {err1.restaurantName && <p className="mt-1 text-xs text-rose-500">{err1.restaurantName}</p>}
        </label>
        <label className={labelCls}>
          Contact Phone
          <input className={inputCls} placeholder="+91 98765 43210" value={form1.phone} onChange={e => handleChange1("phone", e.target.value)} />
        </label>
      </div>

      <label className={labelCls}>
        Organization Type
        <select className={inputCls} value={form1.organizationType} onChange={e => handleChange1("organizationType", e.target.value)}>
          {["restaurant","cafe","cloud_kitchen","food_court","hotel","other"].map(t => (
            <option key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>
          ))}
        </select>
      </label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Workspace Route</p>
        <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-mono text-sky-200 break-all">{routePreview}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Slug <span className="text-rose-500">*</span>
            <input className={`${inputCls} ${err1.slug ? "border-rose-400" : ""}`} placeholder="spice-garden" value={form1.slug} onChange={e => handleChange1("slug", e.target.value)} />
            {err1.slug && <p className="mt-1 text-xs text-rose-500">{err1.slug}</p>}
          </label>
          <label className={labelCls}>
            Key <span className="text-rose-500">*</span>
            <input className={`${inputCls} ${err1.key ? "border-rose-400" : ""}`} placeholder="main-01" value={form1.key} onChange={e => handleChange1("key", e.target.value)} />
            {err1.key && <p className="mt-1 text-xs text-rose-500">{err1.key}</p>}
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Admin Full Name <span className="text-rose-500">*</span>
          <input className={`${inputCls} ${err1.adminName ? "border-rose-400" : ""}`} placeholder="Ayesha Khan" value={form1.adminName} onChange={e => handleChange1("adminName", e.target.value)} />
          {err1.adminName && <p className="mt-1 text-xs text-rose-500">{err1.adminName}</p>}
        </label>
        <label className={labelCls}>
          Admin Email <span className="text-rose-500">*</span>
          <input type="email" className={`${inputCls} ${err1.adminEmail ? "border-rose-400" : ""}`} placeholder="admin@restaurant.com" value={form1.adminEmail} onChange={e => handleChange1("adminEmail", e.target.value)} />
          {err1.adminEmail && <p className="mt-1 text-xs text-rose-500">{err1.adminEmail}</p>}
        </label>
      </div>

      <button type="button" onClick={goToStep2} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700">
        Continue to Plan Selection <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );

  /* ─── Step 2 UI ─── */
  const renderStep2 = () => (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {globalError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{globalError}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {paymentContext && !success && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Registration saved (ID: <strong>{paymentContext.tenantId}</strong>). Payment pending.
          <button type="button" onClick={() => launchOnlinePayment(paymentContext)} disabled={submitting} className="ml-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />} Retry Payment
          </button>
        </div>
      )}

      {/* Plan cards */}
      {loadingPlans ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-sky-400" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map(plan => (
            <PlanCard key={plan.key} plan={plan} selected={selectedPlan === plan.key} billingPeriod={billingPeriod} trialDays={trialDays} onSelect={setSelectedPlan} />
          ))}
        </div>
      )}

      {/* Billing period */}
      {!loadingPlans && billingPeriods.length > 0 && (
        <BillingSelector value={billingPeriod} onChange={setBillingPeriod} billingPeriods={billingPeriods} plans={plans} selectedPlan={selectedPlan} trialBlocked={trialBlocked} />

      )}

      {/* Summary card */}
      {!isTrial && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-900">Registration Total</p>
            <p className="text-xl font-extrabold text-emerald-700">{fmt(amount)}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`cursor-pointer rounded-xl border p-3 ${paymentMethod === "online" ? "border-slate-900 bg-white" : "border-emerald-200 bg-white/60"}`}>
              <div className="flex items-center gap-2">
                <input type="radio" name="pm" value="online" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} />
                <p className="text-sm font-semibold text-slate-900">Online (Razorpay)</p>
              </div>
            </label>
            <label className={`cursor-pointer rounded-xl border p-3 ${paymentMethod === "manual" ? "border-slate-900 bg-white" : "border-emerald-200 bg-white/60"}`}>
              <div className="flex items-center gap-2">
                <input type="radio" name="pm" value="manual" checked={paymentMethod === "manual"} onChange={() => setPaymentMethod("manual")} />
                <p className="text-sm font-semibold text-slate-900">Manual / Testing</p>
              </div>
            </label>
          </div>
          {paymentMethod === "manual" && (
            <label className={labelCls}>
              Payment Reference
              <input className={inputCls} placeholder="Bank ref, cash note…" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} />
            </label>
          )}
        </div>
      )}

      {/* Trial info */}
      {isTrial && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 space-y-1">
          <p className="font-semibold">🎉 {trialDays}-day free trial included</p>
          <p className="text-xs text-sky-600">No payment required now. An expiry reminder email is sent automatically before the trial ends. You can upgrade at any time.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="submit" disabled={submitting || !!success} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isTrial ? <Building2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
          {submitting ? "Processing…" : isTrial ? `Start ${trialDays}-Day Free Trial` : paymentMethod === "online" ? "Submit & Pay" : "Submit & Request Approval"}
        </button>
      </div>

      <p className="text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link className="font-medium text-sky-700 hover:text-sky-800" to={buildAdminPath("/login")}>Sign in</Link>
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
      description={step === 1 ? "Fill in your restaurant details to get started." : "Select the plan that best fits your operations."}
      sideTitle="Launch with flexible pricing."
      sideDescription={`Start with a ${trialDays}-day free trial, or pick a paid plan. Branch access, feature controls, and expiry reminders are all managed automatically.`}
      highlights={[
        { title: `${trialDays}-day free trial`, description: "No payment needed. Auto expiry email sent before trial ends." },
        { title: "Plan-based branch control", description: "Starter = 1 branch. Growth = up to 5. Enterprise = unlimited." },
        { title: "Approval before credentials", description: "Admin email receives a secure password setup link after super admin approval." },
      ]}
    >
      <StepIndicator step={step} />
      {step === 1 ? renderStep1() : renderStep2()}
    </AdminAuthShell>
  );
}
