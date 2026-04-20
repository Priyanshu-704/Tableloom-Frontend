import React from "react";
import { CheckCircle2, Home, ScanLine } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { buildCustomerPath } from "../../common/utils/routes";
import {
  clearCompletedVisit,
  getCompletedVisit,
} from "../utils/completedVisit";
export function ThankYou() {
  const navigate = useNavigate();
  const location = useLocation();
  const completedVisit = getCompletedVisit();
  if (!completedVisit) {
    return <Navigate to={buildCustomerPath("/")} replace />;
  }
  const message =
    location.state?.message ||
    completedVisit?.message ||
    "Thank you for dining with us. We hope to see you again soon.";

  const handleReturnToStart = () => {
    clearCompletedVisit();
    navigate(buildCustomerPath("/"), {
      replace: true,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ecfeff,#f8fafc_55%,#ffffff)] px-4 py-10">
      <div className="w-full max-w-xl rounded-4xl border border-emerald-100 bg-white/95 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600">
          Visit Complete
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
          Thank You
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{message}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleReturnToStart}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            <Home className="h-4 w-4" />
            Back To Start
          </button>
          <button
            type="button"
            onClick={handleReturnToStart}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ScanLine className="h-4 w-4" />
            Scan Another Table
          </button>
        </div>
      </div>
    </div>
  );
}
export default ThankYou;
