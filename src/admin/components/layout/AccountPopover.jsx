import { logger } from "../../../common/utils/logger.js";
import React, { useState, useRef, useEffect } from "react";
import {
  LogOut,
  ChevronDown,
  ChevronUp,
  UserCircle2,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  CreditCard,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../common/context/AuthContext";
import { buildAdminPath } from "../../../common/utils/routes";
import { tenantService } from "../../../common/services";

/* ── subscription status → badge config ── */
const SUB_STATUS = {
  active:   { label: "Active",   cls: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/20", dot: "bg-emerald-400" },
  trialing: { label: "Trial",    cls: "bg-sky-400/15 text-sky-200 ring-sky-300/20",             dot: "bg-sky-400" },
  trial:    { label: "Trial",    cls: "bg-sky-400/15 text-sky-200 ring-sky-300/20",             dot: "bg-sky-400" },
  past_due: { label: "Past Due", cls: "bg-amber-400/15 text-amber-200 ring-amber-300/20",       dot: "bg-amber-400" },
  expired:  { label: "Expired",  cls: "bg-rose-400/15 text-rose-200 ring-rose-300/20",          dot: "bg-rose-400" },
};

export function AccountPopover({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const navigate = useNavigate();
  const { logout, hasPermission } = useAuth();

  /* Subscription mini-state — lazy-loaded on first open, admin only */
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [sub, setSub] = useState(null);

  useEffect(() => {
    if (!isAdmin || !isOpen || sub) return;
    tenantService
      .getMySubscription()
      .then((res) => setSub(res?.data?.subscription || null))
      .catch(() => {});
  }, [isOpen, isAdmin, sub]);

  /* Close on outside click / Escape */
  useEffect(() => {
    const onPointer = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setIsOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = async () => {
    try { await logout(); navigate(buildAdminPath("/login")); }
    catch (error) { logger.error("Logout failed:", error); }
  };

  const go = (path) => { setIsOpen(false); navigate(path); };

  const initials = (name = "") =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const roleLabel = {
    super_admin: "Platform Admin",
    admin: "Administrator",
    manager: "Manager",
    chef: "Chef",
    waiter: "Waiter",
  }[user?.role] || user?.role || "User";

  const canManageSettings = hasPermission("system_settings");
  const subCfg  = SUB_STATUS[sub?.status] || null;
  const subAlert =
    sub &&
    (sub.status === "expired" ||
      sub.status === "past_due" ||
      (typeof sub.daysRemaining === "number" && sub.daysRemaining <= 7));

  return (
    <div className="relative" ref={popoverRef}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`group relative flex items-center gap-3 rounded-2xl border px-2.5 py-2 text-left transition-all ${
          isOpen
            ? "border-sky-300/60 bg-white/95 shadow-lg shadow-slate-900/10"
            : "border-transparent bg-white/8 hover:border-white/12 hover:bg-white/12"
        }`}
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-md shadow-sky-900/25 ring-1 ring-white/20">
              {initials(user?.name)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 shadow-sm" />
          </div>
          <div className="hidden min-w-0 md:block">
            <p className={`truncate text-sm font-semibold ${isOpen ? "text-slate-900" : "text-white"}`}>
              {user?.name}
            </p>
            <p className={`truncate text-[11px] font-medium ${isOpen ? "text-slate-500" : "text-slate-300"}`}>
              {roleLabel}
            </p>
          </div>
        </div>

        {/* Attention dot — subscription needs action */}
        {subAlert && !isOpen && (
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-slate-900" />
        )}

        <div className={`transition-colors ${isOpen ? "text-slate-500" : "text-slate-300"} group-hover:text-slate-100`}>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/18">

          {/* Header */}
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_38%),linear-gradient(135deg,#0f172a_0%,#111827_46%,#1e293b_100%)] px-4 py-4 text-white">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[1.25rem] bg-white/12 text-lg font-bold ring-1 ring-white/20 backdrop-blur">
                {initials(user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold">{user?.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-1.5 break-all text-sm text-slate-300">{user?.email}</p>

                {/* Subscription badge (admin only, loaded lazily) */}
                {isAdmin && sub && subCfg ? (
                  <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${subCfg.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${subCfg.dot}`} />
                    {sub.planName || "Plan"} · {subCfg.label}
                    {typeof sub.daysRemaining === "number" &&
                      sub.daysRemaining >= 0 &&
                      sub.daysRemaining <= 14 &&
                      ` · ${sub.daysRemaining}d left`}
                  </div>
                ) : (
                  <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-400/12 px-2.5 py-1 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-300/15">
                    <Sparkles className="h-3.5 w-3.5" />
                    Workspace access is active
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="space-y-1 px-3 py-3">

            {/* Profile & Security */}
            <button
              onClick={() => go(buildAdminPath("/profile"))}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <UserCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Profile &amp; Security</p>
                <p className="truncate text-xs text-slate-500">Manage your account details and password</p>
              </div>
            </button>

            {/* My Subscription — admin only */}
            {isAdmin && (
              <button
                onClick={() => go(buildAdminPath("/subscription"))}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${subAlert ? "bg-amber-50 text-amber-600" : "bg-violet-50 text-violet-600"}`}>
                  {subAlert ? <AlertTriangle className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={`text-sm font-semibold ${subAlert ? "text-amber-700" : "text-slate-900"}`}>
                      My Subscription
                    </p>
                    {subAlert && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Action needed
                      </span>
                    )}
                    {sub && !subAlert && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle className="h-2.5 w-2.5" /> Active
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">Plan, billing period &amp; renewal</p>
                </div>
              </button>
            )}

            {/* Restaurant Settings */}
            {canManageSettings && (
              <button
                onClick={() => go(buildAdminPath("/settings/restaurant"))}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <SettingsIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Restaurant Settings</p>
                  <p className="truncate text-xs text-slate-500">Update workspace preferences and branding</p>
                </div>
              </button>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-slate-100 px-3 py-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p>Logout</p>
                <p className="text-xs font-medium text-rose-400">End this admin session securely</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
