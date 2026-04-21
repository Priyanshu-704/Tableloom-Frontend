import React from "react";
import { ShieldAlert, ArrowLeft, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../common/context/AuthContext";
import { resolveAccessibleAdminHomePath } from "../utils/accessControl";
export function AccessDenied() {
  const navigate = useNavigate();
  const { permissions, user } = useAuth();
  const homePath = resolveAccessibleAdminHomePath(user, permissions);
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-slate-950 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.18),transparent_35%),linear-gradient(160deg,#020617_0%,#0f172a_50%,#082f49_100%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-4xl border border-white/10 bg-white/95 shadow-2xl shadow-slate-950/30 lg:grid-cols-[1fr,1.05fr]">
        <div className="bg-slate-950/95 p-8 text-white sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
            <LockKeyhole className="h-4 w-4" />
            Restricted Area
          </div>
          <h1 className="mt-8 text-3xl font-semibold leading-tight sm:text-4xl">
            You are signed in, but this section is locked for your account.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
            Your current role does not include permission for this screen. An
            administrator can update your access if this page should be
            available to you.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <p className="text-sm font-semibold text-sky-200">Current role</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {user?.role || "staff"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <p className="text-sm font-semibold text-sky-200">Next step</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Return to your home area or ask an admin to expand your
                permissions.
              </p>
            </div>
          </div>
        </div>
        <div className="p-8 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-slate-900">
            Access Denied
          </h2>
          <p className="mt-3 text-center text-sm leading-6 text-slate-600">
            You can continue from an area your role supports, or go back to the
            previous screen.
          </p>
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => navigate(homePath)}
              className="flex w-full items-center justify-center rounded-2xl bg-primary-600 px-5 py-3.5 font-medium text-white transition-colors hover:bg-primary-700"
            >
              Go To My Home
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
