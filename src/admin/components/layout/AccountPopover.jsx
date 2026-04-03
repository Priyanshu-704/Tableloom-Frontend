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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../common/context/AuthContext";
import { buildAdminPath } from "../../../common/utils/routes";
export function AccountPopover({
  user
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const navigate = useNavigate();
  const {
    logout,
    hasPermission
  } = useAuth();
  useEffect(() => {
    const handleClickOutside = event => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const handleLogout = async () => {
    try {
      await logout();
      navigate(buildAdminPath("/login"));
    } catch (error) {
      logger.error("Logout failed:", error);
    }
  };
  const handleNavigate = path => {
    setIsOpen(false);
    navigate(path);
  };
  const getInitials = name => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  const getRoleDisplayName = role => {
    const roleNames = {
      super_admin: "Platform Admin",
      admin: "Administrator",
      manager: "Manager",
      chef: "Chef",
      waiter: "Waiter",
      customer: "Customer"
    };
    return roleNames[role] || role;
  };
  const roleLabel = getRoleDisplayName(user?.role);
  const canManageSettings = hasPermission("system_settings");
  return <div className="relative" ref={popoverRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`group flex items-center gap-3 rounded-2xl border px-2.5 py-2 text-left transition-all ${isOpen ? "border-sky-300/60 bg-white/95 shadow-lg shadow-slate-900/10" : "border-transparent bg-white/8 hover:border-white/12 hover:bg-white/12"}`} aria-label="Account menu" aria-expanded={isOpen}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-md shadow-sky-900/25 ring-1 ring-white/20">
              {getInitials(user?.name)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 shadow-sm"></div>
          </div>

          <div className="hidden min-w-0 md:block">
            <p className={`truncate text-sm font-semibold ${isOpen ? "text-slate-900" : "text-white"}`}>{user?.name}</p>
            <p className={`truncate text-[11px] font-medium ${isOpen ? "text-slate-500" : "text-slate-300"}`}>
              {roleLabel}
            </p>
          </div>
        </div>

        <div className={`${isOpen ? "text-slate-500" : "text-slate-300"} transition-colors group-hover:text-slate-100`}>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/18">
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_38%),linear-gradient(135deg,#0f172a_0%,#111827_46%,#1e293b_100%)] px-4 py-4 text-white">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-white/12 text-lg font-bold text-white ring-1 ring-white/20 backdrop-blur">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-white">{user?.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-2 break-all text-sm text-slate-200">{user?.email}</p>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-400/12 px-2.5 py-1 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-300/15">
                  <Sparkles className="h-3.5 w-3.5" />
                  Workspace access is active
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 px-3 py-3">
            <button onClick={() => handleNavigate(buildAdminPath("/profile"))} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <UserCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">Profile & Security</p>
                <p className="truncate text-xs text-slate-500">Manage your account details and password</p>
              </div>
            </button>
            {canManageSettings ? <button onClick={() => handleNavigate(buildAdminPath("/settings/restaurant"))} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <SettingsIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">Restaurant Settings</p>
                  <p className="truncate text-xs text-slate-500">Update workspace preferences and branding</p>
                </div>
              </button> : null}
          </div>

          <div className="border-t border-slate-100 px-3 py-3">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p>Logout</p>
                <p className="text-xs font-medium text-rose-400">End this admin session securely</p>
              </div>
            </button>
          </div>
        </div>}
    </div>;
}
