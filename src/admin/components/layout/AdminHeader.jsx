import React, { useMemo } from "react";
import { Bell, Menu, Shield, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useAdminNotificationCenter } from "../../context/AdminNotificationCenterContext";
import { AccountPopover } from "./AccountPopover";
import { useSettings } from "../../../common/context/SettingsContext";
import { useAuth } from "../../../common/context/AuthContext";
import { BrandBadge } from "../../../common/components/BrandBadge";
import { isSuperAdminMonitoringPath } from "../../../common/utils/routes";
export function AdminHeader({
  isMobileSidebarOpen = false,
  onToggleMobileSidebar
}) {
  const {
    notifications
  } = useAdmin();
  const {
    hasPermission,
    user
  } = useAuth();
  const location = useLocation();
  const {
    settings
  } = useSettings();
  const {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    stats,
    importantNotifications,
    canViewNotifications
  } = useAdminNotificationCenter();
  const unreadCount = useMemo(() => stats?.unreadCount ?? notifications.filter(n => !n.read).length, [notifications, stats?.unreadCount]);
  const isMonitoringMode = isSuperAdminMonitoringPath(location.pathname, user?.role);
  return <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-800/60 bg-[linear-gradient(90deg,rgba(2,6,23,0.97)_0%,rgba(15,23,42,0.95)_42%,rgba(10,37,64,0.94)_100%)] shadow-lg shadow-slate-950/20 backdrop-blur-sm">
      <div className="flex h-full">
        <div className="hidden h-full w-72 shrink-0 items-center border-r border-slate-800/60 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(17,24,39,0.88)_100%)] px-6 lg:flex">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/8 ring-1 ring-white/10 shadow-inner">
              <img src={settings?.restaurant?.logo || "/tableloom-mark.svg"} alt={settings?.restaurant?.name || "Tableloom"} className="h-8 w-8 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white xl:text-lg">
                {settings?.restaurant?.name || "Tableloom"}
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-3 lg:hidden">
              <button type="button" onClick={onToggleMobileSidebar} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/80 text-slate-100 transition hover:border-slate-500" aria-label={isMobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isMobileSidebarOpen}>
                {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <BrandBadge logoSrc={settings?.restaurant?.logo || "/tableloom-mark.svg"} name={settings?.restaurant?.name || "Tableloom"} size="sm" nameClassName="text-sm font-semibold text-white" />
                </div>
                <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                  Admin Panel
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-lg font-bold text-white xl:text-xl">
                  {settings?.restaurant?.name || "Tableloom"}
                </h1>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                  {isMonitoringMode ? "Monitoring" : "Live Workspace"}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-300">
                {isMonitoringMode ? "Read-only monitoring mode for this tenant workspace" : `Signed in as ${user?.name || "Administrator"}`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {isMonitoringMode ? <div className="hidden items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200 xl:flex">
                <Shield className="h-3.5 w-3.5" />
                Monitoring Only
              </div> : null}
            {hasPermission("notification_view") && canViewNotifications ? <div className="relative">
                <button type="button" onClick={isDrawerOpen ? closeDrawer : openDrawer} className={`relative rounded-2xl border p-2.5 transition-all ${isDrawerOpen ? "border-sky-300/50 bg-white/95 text-sky-700 shadow-lg shadow-slate-900/10" : "border-white/10 bg-white/6 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"}`} aria-label={`Notifications (${unreadCount} unread)`} aria-expanded={isDrawerOpen}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && <>
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                      {importantNotifications.length > 0 ? <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-400 px-1 text-xs text-white animate-ping">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span> : null}
                    </>}
                </button>
              </div> : null}

            <div className="hidden h-8 w-px bg-white/10 sm:block"></div>

            {user && <AccountPopover user={user} />}
          </div>
        </div>
      </div>
    </header>;
}
