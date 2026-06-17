import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../common/context/AuthContext";
import { buildAdminPath } from "../../../common/utils/routes";
import { tenantService } from "../../../common/services";

/**
 * Sticky banner that appears above the admin header when a subscription
 * is in trial, expiring soon, or expired.  Only shown to admin users.
 */
export function SubscriptionBanner() {
  const { user, isAuthenticated } = useAuth();
  const [info, setInfo]       = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    tenantService.getMySubscription()
      .then(res => {
        const sub = res?.data?.subscription;
        if (!sub) return;

        const { status, daysRemaining, trialEndsAt } = sub;
        const isTrial   = status === "trialing" || status === "trial";
        const isExpired = status === "expired";
        const isDue     = status === "past_due";
        const isWarn    = typeof daysRemaining === "number" && daysRemaining <= 7 && daysRemaining > 0;

        if (!isTrial && !isExpired && !isDue && !isWarn) return;

        setInfo({ status, daysRemaining, trialEndsAt, isTrial, isExpired, isDue, isWarn });
      })
      .catch(() => {});
  }, [isAuthenticated, isAdmin]);

  if (!info || dismissed) return null;

  const { isTrial, isExpired, isDue, daysRemaining } = info;

  let bg = "bg-amber-500";
  let message = "";

  if (isExpired || isDue) {
    bg = "bg-red-600";
    message = "Your subscription has expired. Renew now to restore access.";
  } else if (isTrial) {
    bg = "bg-sky-600";
    message = daysRemaining !== null
      ? `You are on a free trial — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining.`
      : "You are on a free trial.";
  } else {
    message = `Your subscription expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`;
  }

  return (
    <div className={`${bg} relative z-[60] flex items-center justify-center gap-3 px-4 py-2.5 text-sm text-white`}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">{message}</span>
      <Link
        to={buildAdminPath("/subscription")}
        className="rounded-lg border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25 transition"
      >
        {isExpired || isDue ? "Renew Now" : "View Plan"}
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default SubscriptionBanner;
