import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, Calendar, CheckCircle, CreditCard,
  Loader2, RefreshCw, Shield, Sparkles, Star, Zap,
} from "lucide-react";
import { tenantService } from "../../common/services";
import { useSettings } from "../../common/context/SettingsContext";
import { AdminAuthShell } from "../components/layout/AdminAuthShell";
import loadRazorpayCheckout from "../../common/utils/loadRazorpayCheckout";


/* ─── helpers ─── */
const fmt = (v, cur = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(v || 0));
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const calcPrice = (plan, billingPeriod) => {
  if (!plan) return 0;
  const mp = Number(plan.monthlyPrice || 0);
  const mult = { monthly: 1, half_yearly: 5.5, annually: 10 }[billingPeriod] ?? 1;
  return Math.round(mp * mult);
};

const PLAN_ICONS = { starter: Star, growth: Zap, enterprise: Sparkles };
const PLAN_COLORS = {
  starter: "from-slate-500 to-slate-600",
  growth: "from-violet-500 to-violet-700",
  enterprise: "from-amber-400 to-orange-500",
};
const BILLING_LABELS = { monthly: "Monthly", half_yearly: "Half-Yearly", annually: "Annually" };

/* ─── Plan card ─── */
function PlanCard({ plan, selected, billingPeriod, onSelect }) {
  const Icon = PLAN_ICONS[plan.key] || Shield;
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.key)}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
        selected ? "border-sky-400 bg-sky-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${PLAN_COLORS[plan.key]}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{plan.name}</p>
          <p className="text-xs text-gray-400">
            {plan.branchLimit === null ? "Unlimited branches" : `${plan.branchLimit} branch${plan.branchLimit === 1 ? "" : "es"}`}
          </p>
        </div>
        {selected && <CheckCircle className="ml-auto h-4 w-4 text-sky-600" />}
      </div>
      <p className="text-xl font-extrabold text-gray-900">{fmt(calcPrice(plan, billingPeriod))}</p>
      <p className="text-xs text-gray-400">
        per {billingPeriod === "half_yearly" ? "6 months" : billingPeriod === "annually" ? "year" : "month"}
      </p>
    </button>
  );
}

export function SubscriptionRenewal() {
  const { settings } = useSettings();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  // Extract tenantSlug/tenantKey from pathname: /:slug/:key/subscription-renewal
  const pathParts = location.pathname.replace(/^\//, "").split("/");
  const tenantSlug = pathParts[0] || "";
  const tenantKey  = pathParts[1] || "";


  const [renewalData, setRenewalData] = useState(null);
  const [plans, setPlans]             = useState([]);
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState("");

  const [selectedPlan, setSelectedPlan]   = useState("growth");
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState("online");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  /* Load renewal details + plans */
  useEffect(() => {
    const load = async () => {
      try {
        const [renRes, plansRes] = await Promise.all([
          tenantService.getSubscriptionRenewal(tenantSlug, tenantKey, token),
          tenantService.getSubscriptionPlans(),
        ]);
        const rd = renRes?.data || null;
        setRenewalData(rd);
        setSelectedPlan(rd?.subscription?.planKey || "growth");

        const pls = Array.isArray(plansRes?.data?.plans) ? plansRes.data.plans : [];
        const bps = Array.isArray(plansRes?.data?.billingPeriods) ? plansRes.data.billingPeriods : [];
        setPlans(pls);
        setBillingPeriods(bps.filter(bp => bp.key !== "trial"));
      } catch (err) {
        setLoadError(err?.message || "Could not load renewal details. The link may have expired.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantSlug, tenantKey, token]);

  const selectedPlanObj = plans.find(p => p.key === selectedPlan);
  const price = calcPrice(selectedPlanObj, billingPeriod);

  const handleRenew = useCallback(async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        planKey: selectedPlan,
        billingPeriod,
        paymentMethod,
        token, // renewal token from email link
      };
      const res = await tenantService.createRenewalOrder(renewalData?.tenant?._id, payload);
      const order = res?.data?.order;
      const razorpayKey = res?.data?.keyId || "";

      if (paymentMethod === "manual") {
        setSuccess("Manual renewal request submitted. The platform team will review and activate your subscription.");
        setSubmitting(false);
        return;
      }

      if (!order?.id || !razorpayKey) throw new Error("Razorpay not configured. Please contact support or use manual renewal.");

      const RazorpayCheckout = await loadRazorpayCheckout();
      const rzp = new RazorpayCheckout({
        key: razorpayKey,
        amount: Number(order.amount || 0),
        currency: order.currency || "INR",
        name: settings?.restaurant?.name || "Tableloom Platform",
        description: `Subscription renewal — ${renewalData?.tenant?.name || ""}`,
        order_id: order.id,
        prefill: {
          name:    renewalData?.tenant?.adminName || "",
          email:   renewalData?.tenant?.adminEmail || "",
          contact: renewalData?.tenant?.phone || "",
        },
        theme: { color: "#0f172a" },
        modal: { ondismiss: () => { setSubmitting(false); } },
        handler: async (result) => {
          const verRes = await tenantService.verifyRenewalPayment(renewalData.tenant._id, {
            token,
            planKey: selectedPlan,
            billingPeriod,
            razorpayOrderId:  result.razorpay_order_id || order.id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
          });
          if (!verRes?.success) {
            setError(verRes?.message || "Payment verified but renewal failed. Contact support.");
            setSubmitting(false);
            return;
          }
          setSuccess(`✅ Subscription renewed! Your ${selectedPlanObj?.name || ""} plan is now active.`);
          setSubmitting(false);
        },
      });
      rzp.on("payment.failed", ev => {
        setError(ev?.error?.description || "Payment failed. Try again.");
        setSubmitting(false);
      });
      rzp.open();
    } catch (err) {
      setError(err?.message || "Renewal failed.");
      setSubmitting(false);
    }
  }, [selectedPlan, billingPeriod, paymentMethod, token, renewalData, selectedPlanObj, settings]);

  return (
    <AdminAuthShell
      contentScrollable
      mobileAuthMode="formOnly"
      settings={settings}
      eyebrow="Subscription Renewal"
      title="Renew Your Plan"
      description="Keep your restaurant operations running without interruption."
      sideTitle="Flexible billing, instant activation."
      sideDescription="Choose any plan and billing period. Online payments are activated instantly via Razorpay. Manual requests are approved by the platform team."
      highlights={[
        { title: "Plan upgrade available", description: "You can change your plan during renewal — upgrade for more branches and features." },
        { title: "Instant activation", description: "Online payments activate your subscription immediately after payment." },
        { title: "Auto expiry emails", description: "Reminders are sent 7, 3, and 1 day before expiry, plus on the day it expires." },
      ]}
    >
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-700">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-rose-400" />
          <p className="font-semibold">Could not load renewal</p>
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && renewalData && (
        <form onSubmit={handleRenew} className="space-y-5">
          {error   && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {/* Current subscription info */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-900 mb-2">{renewalData.tenant?.name}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> Current Period Ends</p>
                <p className="font-semibold text-gray-800">{fmtDate(renewalData.subscription?.currentPeriodEnd)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p className={`font-semibold ${renewalData.subscription?.daysRemaining <= 0 ? "text-red-600" : "text-gray-800"}`}>
                  {renewalData.subscription?.daysRemaining <= 0 ? "Expired" : `${renewalData.subscription?.daysRemaining} days left`}
                </p>
              </div>
            </div>
          </div>

          {/* Plan selector */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">Select New Plan</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {plans.map(plan => (
                <PlanCard key={plan.key} plan={plan} selected={selectedPlan === plan.key} billingPeriod={billingPeriod} onSelect={setSelectedPlan} />
              ))}
            </div>
          </div>

          {/* Billing period */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">Billing Period</p>
            <div className="grid grid-cols-3 gap-2">
              {billingPeriods.map(bp => (
                <button key={bp.key} type="button" onClick={() => setBillingPeriod(bp.key)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition ${billingPeriod === bp.key ? "border-sky-500 bg-sky-50 text-sky-800" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {BILLING_LABELS[bp.key] ?? bp.name}<br />
                  <span className="font-bold text-sm">{fmt(calcPrice(selectedPlanObj, bp.key))}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {["online", "manual"].map(m => (
                <label key={m} className={`cursor-pointer rounded-xl border p-3 ${paymentMethod === m ? "border-sky-500 bg-sky-50" : "border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="renewal-pm" value={m} checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                    <span className="text-sm font-semibold text-gray-800">{m === "online" ? "Online (Razorpay)" : "Manual / Testing"}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700">Total</p>
            <p className="text-2xl font-extrabold text-gray-900">{fmt(price)}</p>
          </div>

          <button type="submit" disabled={submitting || !!success}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : paymentMethod === "online" ? <CreditCard className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            {submitting ? "Processing…" : paymentMethod === "online" ? "Pay & Renew" : "Submit Manual Renewal"}
          </button>
        </form>
      )}
    </AdminAuthShell>
  );
}

export default SubscriptionRenewal;
