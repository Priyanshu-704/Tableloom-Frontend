import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  CheckCircle,
  CreditCard,
  GitBranch,
  History,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { tenantService } from "../../common/services";
import { useSettings } from "../../common/context/SettingsContext";
import loadRazorpayCheckout from "../../common/utils/loadRazorpayCheckout";

/* ─── helpers ─── */
const fmt = (v, cur = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(v || 0));

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const calcPrice = (plan, billingPeriod) => {
  if (!plan) return 0;
  const mp = Number(plan.monthlyPrice || 0);
  const periods = { monthly: 1, half_yearly: 5.5, annually: 10 };
  return Math.round(mp * (periods[billingPeriod] ?? 1));
};

const STATUS_CONFIG = {
  active:    { label: "Active",    cls: "bg-green-100 text-green-700",  Icon: CheckCircle },
  trialing:  { label: "Trial",     cls: "bg-sky-100 text-sky-700",      Icon: Sparkles },
  trial:     { label: "Trial",     cls: "bg-sky-100 text-sky-700",      Icon: Sparkles },
  past_due:  { label: "Past Due",  cls: "bg-amber-100 text-amber-700",  Icon: AlertTriangle },
  expired:   { label: "Expired",   cls: "bg-red-100 text-red-700",      Icon: AlertTriangle },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-600",    Icon: AlertTriangle },
};

const PLAN_ICONS = { starter: Star, growth: Zap, enterprise: Sparkles };
const PLAN_COLORS = {
  starter: "from-slate-500 to-slate-600",
  growth:  "from-violet-500 to-violet-700",
  enterprise: "from-amber-400 to-orange-500",
};

const BILLING_LABELS = {
  monthly: "Monthly", half_yearly: "Half-Yearly", annually: "Annually", trial: "Trial",
};

/* ─── Status badge ─── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.expired;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.cls}`}>
      <cfg.Icon className="h-3.5 w-3.5" /> {cfg.label}
    </span>
  );
}

/* ─── Days remaining pill ─── */
function DaysRemaining({ days }) {
  if (days === null || days === undefined) return null;
  const urgency = days <= 0 ? "red" : days <= 3 ? "amber" : days <= 7 ? "yellow" : "green";
  const colors = { red: "bg-red-100 text-red-700", amber: "bg-amber-100 text-amber-700", yellow: "bg-yellow-100 text-yellow-700", green: "bg-green-100 text-green-700" };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[urgency]}`}>
      {days <= 0 ? "Expired" : `${days} day${days === 1 ? "" : "s"} remaining`}
    </span>
  );
}

/* ─── helpers for plan comparison ─── */
const PLAN_RANK = { starter: 0, growth: 1, enterprise: 2 };
const PERIOD_RANK = { monthly: 0, half_yearly: 1, annually: 2 };
const PERIOD_SAVINGS = { monthly: null, half_yearly: "Save ~8%", annually: "Save ~17%" };

/* ─── Plan picker card (for renewal) ─── */
function PlanOption({ plan, selected, billingPeriod, isCurrent, onSelect }) {
  const Icon = PLAN_ICONS[plan.key] || Star;
  const price = calcPrice(plan, billingPeriod);
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.key)}
      className={`relative w-full rounded-xl border-2 p-4 text-left transition-all ${
        selected ? "border-sky-400 bg-sky-50 shadow" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-2.5 left-3 rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-bold text-white">
          Current
        </span>
      )}
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${PLAN_COLORS[plan.key]}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900">{plan.name}</p>
          <p className="text-xs text-gray-400">
            {plan.branchLimit === null ? "Unlimited branches" : `${plan.branchLimit} branch${plan.branchLimit === 1 ? "" : "es"}`}
          </p>
        </div>
        {selected && <CheckCircle className="ml-auto h-4 w-4 text-sky-600" />}
      </div>
      <p className="text-lg font-extrabold text-gray-900">{fmt(price)}</p>
      <p className="text-xs text-gray-400">per {billingPeriod === "half_yearly" ? "6 months" : billingPeriod === "annually" ? "year" : "month"}</p>
    </button>
  );
}

/* ─── Renewal modal ─── */
function RenewalModal({ plans, billingPeriods, currentPlanKey, currentBillingPeriod, onClose, onRenew }) {
  const [planKey, setPlanKey] = useState(currentPlanKey || "growth");
  const [period, setPeriod] = useState(
    currentBillingPeriod && currentBillingPeriod !== "trial" ? currentBillingPeriod : "monthly"
  );
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* trial is always excluded from renewal */
  const PERIOD_OPTS = billingPeriods.filter(p => p.key !== "trial");

  const selectedPlan = plans.find(p => p.key === planKey);
  const price = calcPrice(selectedPlan, period);

  /* upgrade / downgrade label */
  const planDiff = (PLAN_RANK[planKey] ?? 0) - (PLAN_RANK[currentPlanKey] ?? 0);
  const periodDiff = (PERIOD_RANK[period] ?? 0) - (PERIOD_RANK[currentBillingPeriod] ?? 0);
  const changeLabel = (() => {
    if (planDiff > 0) return { text: "Upgrade", cls: "bg-emerald-100 text-emerald-700" };
    if (planDiff < 0) return { text: "Downgrade", cls: "bg-amber-100 text-amber-700" };
    if (periodDiff > 0) return { text: "Longer Billing", cls: "bg-violet-100 text-violet-700" };
    if (periodDiff < 0) return { text: "Shorter Billing", cls: "bg-orange-100 text-orange-700" };
    return { text: "Same Plan", cls: "bg-gray-100 text-gray-600" };
  })();

  const handleRenew = async () => {
    try {
      setSubmitting(true);
      setError("");
      await onRenew({ planKey, billingPeriod: period, paymentMethod });
    } catch (err) {
      setError(err?.message || "Renewal failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <RefreshCw className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Renew / Change Plan</h2>
              <p className="text-sm text-gray-500">Upgrade, downgrade, or change billing period</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${changeLabel.cls}`}>
            {changeLabel.text}
          </span>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {/* Note: trial blocked */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              <strong>7-day trial is not available for renewals.</strong> Once a trial has been used,
              it cannot be selected again. Choose a paid plan below.
            </span>
          </div>

          {/* Plans */}
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700">Select Plan</p>
            <div className="grid grid-cols-3 gap-2">
              {plans.map(p => (
                <PlanOption
                  key={p.key}
                  plan={p}
                  selected={planKey === p.key}
                  billingPeriod={period}
                  isCurrent={p.key === currentPlanKey}
                  onSelect={setPlanKey}
                />
              ))}
            </div>
          </div>

          {/* Billing period */}
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700">Billing Period</p>
            <div className="grid grid-cols-3 gap-2">
              {PERIOD_OPTS.map(bp => {
                const isCurPeriod = bp.key === currentBillingPeriod;
                const savings = PERIOD_SAVINGS[bp.key];
                return (
                  <button
                    key={bp.key}
                    type="button"
                    onClick={() => setPeriod(bp.key)}
                    className={`relative rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                      period === bp.key ? "border-sky-500 bg-sky-50 text-sky-800" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {isCurPeriod && (
                      <span className="absolute -top-2 right-2 rounded-full bg-gray-600 px-1.5 py-px text-[9px] font-bold text-white">
                        Now
                      </span>
                    )}
                    <p className="font-semibold">{BILLING_LABELS[bp.key] ?? bp.name}</p>
                    <p className="mt-0.5 font-extrabold text-sm">{fmt(calcPrice(selectedPlan, bp.key))}</p>
                    {savings && <p className="mt-0.5 text-[10px] text-emerald-600 font-semibold">{savings}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {["online", "manual"].map(m => (
                <label key={m} className={`cursor-pointer rounded-xl border p-3 ${paymentMethod === m ? "border-sky-500 bg-sky-50" : "border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="renewal-pm" value={m} checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                    <span className="text-sm font-semibold text-gray-800">
                      {m === "online" ? "Online (Razorpay)" : "Manual / Testing"}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray-400">Total due now</p>
              <p className="text-2xl font-extrabold text-gray-900">{fmt(price)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${changeLabel.cls}`}>{changeLabel.text}</span>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 p-6">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleRenew} disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {paymentMethod === "online" ? "Pay & Renew" : "Request Manual Renewal"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export function MySubscription() {
  const { settings } = useSettings();
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [notice, setNotice] = useState({ type: "", msg: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        tenantService.getMySubscription(),
        tenantService.getSubscriptionPlans(),
      ]);
      setData(subRes?.data || null);
      setPlans(Array.isArray(plansRes?.data?.plans) ? plansRes.data.plans : []);
      setBillingPeriods(Array.isArray(plansRes?.data?.billingPeriods) ? plansRes.data.billingPeriods : []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRenew = useCallback(async ({ planKey, billingPeriod, paymentMethod }) => {
    const res = await tenantService.createMyRenewalOrder({ planKey, billingPeriod, paymentMethod });
    const order = res?.data?.order;
    const razorpayKey = res?.data?.keyId || "";

    if (paymentMethod === "manual") {
      setRenewalOpen(false);
      setNotice({ type: "success", msg: "Manual renewal request submitted. Super admin will review and approve." });
      await load();
      return;
    }

    if (!order?.id || !razorpayKey) throw new Error("Razorpay not configured — use manual renewal.");

    const RazorpayCheckout = await loadRazorpayCheckout();
    const rzp = new RazorpayCheckout({
      key: razorpayKey,
      amount: Number(order.amount || 0),
      currency: order.currency || "INR",
      name: settings?.restaurant?.name || "Tableloom Platform",
      description: `Subscription renewal — ${data?.tenant?.name || ""}`,
      order_id: order.id,
      prefill: { name: data?.tenant?.adminName || "", email: data?.tenant?.adminEmail || "" },
      theme: { color: "#0f172a" },
      modal: { ondismiss: () => {} },
      handler: async (result) => {
        const verRes = await tenantService.verifyMyRenewalPayment({
          planKey, billingPeriod,
          razorpayOrderId: result.razorpay_order_id || order.id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        });
        if (!verRes?.success) {
          setNotice({ type: "error", msg: verRes?.message || "Payment verified but renewal failed." });
          return;
        }
        setRenewalOpen(false);
        setNotice({ type: "success", msg: `✅ Subscription renewed successfully!` });
        await load();
      },
    });
    rzp.on("payment.failed", ev => {
      setNotice({ type: "error", msg: ev?.error?.description || "Payment failed." });
    });
    rzp.open();
    setRenewalOpen(false);
  }, [data, settings, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <p>Subscription data unavailable.</p>
      </div>
    );
  }

  const { subscription, payment, history, totals } = data;
  const currentPlan = plans.find(p => p.key === subscription?.planKey) || null;
  const PlanIcon = PLAN_ICONS[subscription?.planKey] || Shield;
  const canRenew = ["expired", "past_due", "trialing", "trial", "active"].includes(subscription?.status);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Subscription</h1>
          <p className="text-gray-500">Manage your plan, billing, and renewal</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          {canRenew && (
            <button onClick={() => setRenewalOpen(true)} className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              <CreditCard className="h-4 w-4" /> Renew / Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {notice.msg && (
        <div className={`rounded-xl border p-4 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {notice.msg}
        </div>
      )}

      {/* Expiry warning */}
      {subscription?.daysRemaining !== null && subscription?.daysRemaining <= 7 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Subscription expiring soon!</p>
            <p>Your plan expires on <strong>{fmtDate(subscription?.currentPeriodEnd)}</strong>. Renew now to avoid service disruption.</p>
          </div>
          <button onClick={() => setRenewalOpen(true)} className="ml-auto rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700">
            Renew Now
          </button>
        </div>
      )}

      {/* Subscription card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${PLAN_COLORS[subscription?.planKey] || "from-slate-500 to-slate-600"}`}>
              <PlanIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{subscription?.planName || "—"}</h2>
                <StatusBadge status={subscription?.status} />
                <DaysRemaining days={subscription?.daysRemaining} />
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{BILLING_LABELS[subscription?.billingPeriod] ?? subscription?.billingPeriod} · {subscription?.periodName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total paid</p>
            <p className="text-2xl font-extrabold text-gray-900">{fmt(totals?.paidAmount, totals?.currency)}</p>
            <p className="text-xs text-gray-400">{totals?.purchaseCount} payment{totals?.purchaseCount === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-4">
          {[
            { label: "Current Period", value: `${fmtDate(subscription?.currentPeriodStart)} – ${fmtDate(subscription?.currentPeriodEnd)}`, Icon: Calendar },
            { label: "Trial Ends", value: subscription?.trialEndsAt ? fmtDate(subscription.trialEndsAt) : "—", Icon: Sparkles },
            { label: "Branch Limit", value: currentPlan ? (currentPlan.branchLimit === null ? "Unlimited" : currentPlan.branchLimit) : "—", Icon: GitBranch },
            { label: "Payment Status", value: payment?.status || "—", Icon: BadgeCheck },
          ].map(({ label, value, Icon: I }) => (
            <div key={label}>
              <p className="flex items-center gap-1 text-xs text-gray-400"><I className="h-3.5 w-3.5" /> {label}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment history */}
      {history?.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 p-5">
            <History className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Payment History</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map((entry, i) => (
              <div key={entry._id || i} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-800">{entry.planName} — {BILLING_LABELS[entry.billingPeriod] ?? entry.billingPeriod}</p>
                  <p className="text-xs text-gray-400">{fmtDate(entry.purchasedAt)} · {entry.source}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{fmt(entry.amount, entry.currency)}</p>
                  <p className="text-xs text-gray-400">{entry.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renewal modal */}
      {renewalOpen && (
        <RenewalModal
          plans={plans}
          billingPeriods={billingPeriods}
          currentPlanKey={subscription?.planKey}
          currentBillingPeriod={subscription?.billingPeriod}
          onClose={() => setRenewalOpen(false)}
          onRenew={handleRenew}
        />
      )}
    </div>
  );
}

export default MySubscription;
