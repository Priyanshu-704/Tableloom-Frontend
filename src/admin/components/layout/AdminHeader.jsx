import React, { useMemo } from "react";
import {
  Bell,
  Eye,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAdminNotificationCenter } from "../../context/AdminNotificationCenterContext";
import { AccountPopover } from "./AccountPopover";
import { useSettings } from "../../../common/context/SettingsContext";
import { useAuth } from "../../../common/context/AuthContext";
import { useBranch } from "../../context/BranchContext";
import { isSuperAdminMonitoringPath } from "../../../common/utils/routes";
import {
  getVisibleAdminNavigationSections,
  resolveActiveAdminNavigation,
} from "../../utils/navigationConfig";
import { BranchSwitcher } from "../branches/BranchSwitcher";
export function AdminHeader({
  isMobileSidebarOpen = false,
  onToggleMobileSidebar,
  isDesktopSidebarCollapsed = false,
  onToggleDesktopSidebar,
}) {
  const { hasPermission, permissions, user } = useAuth();
  const location = useLocation();
  const { settings } = useSettings();
  const { branches, branchLimit } = useBranch();
  const {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    stats,
    rawNotifications,
    importantNotifications,
    canViewNotifications,
  } = useAdminNotificationCenter();
  const unreadCount = useMemo(
    () =>
      stats?.unreadCount ??
      rawNotifications.filter((notification) => !notification.isRead).length,
    [rawNotifications, stats?.unreadCount],
  );
  const isMonitoringMode = isSuperAdminMonitoringPath(
    location.pathname,
    user?.role,
  );
  const visibleSections = useMemo(
    () =>
      getVisibleAdminNavigationSections({
        user,
        permissions,
        isMonitoringMode,
        branches,
        branchLimit,
      }),
    [isMonitoringMode, permissions, user, branches, branchLimit],
  );
  const activeNavigation = useMemo(
    () =>
      resolveActiveAdminNavigation({
        location,
        sections: visibleSections,
      }),
    [location, visibleSections],
  );
  const workspaceLabel =
    String(user?.role || "").toLowerCase() === "super_admin"
      ? "Platform Workspace"
      : "Live Workspace";
  const headerTitle =
    activeNavigation?.item?.label || settings?.restaurant?.name || "Tableloom";
  const subtitle =
    activeNavigation?.item?.description ||
    (isMonitoringMode
      ? "Viewing tenant operations in read-only mode"
      : `Signed in as ${user?.name || "Administrator"}`);
  const sectionLabel =
    activeNavigation?.section?.title ||
    (String(user?.role || "").toLowerCase() === "super_admin"
      ? "Platform Navigation"
      : "Admin Navigation");
  const workspaceSubtitle = isMonitoringMode
    ? "Viewing tenant operations in read-only mode"
    : `Signed in as ${user?.name || "Administrator"}`;
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 border-b border-slate-800/60 bg-[linear-gradient(90deg,rgba(2,6,23,0.97)_0%,rgba(15,23,42,0.95)_42%,rgba(10,37,64,0.94)_100%)] shadow-lg shadow-slate-950/20 backdrop-blur-sm">
      <div className="flex h-full">
        <div
          className={`hidden h-full shrink-0 items-center border-r border-slate-800/60 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(17,24,39,0.88)_100%)] transition-[width,padding] duration-300 lg:flex ${isDesktopSidebarCollapsed ? "w-24 justify-center px-3" : "w-72 px-6"}`}
        >
          <div
            className={`flex min-w-0 items-center ${isDesktopSidebarCollapsed ? "justify-center" : "gap-4"}`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/8 ring-1 ring-white/10 shadow-inner">
              <img
                src={
                  settings?.restaurant?.logoThumbnail ||
                  settings?.restaurant?.logo ||
                  "/tableloom-mark.svg"
                }
                alt={settings?.restaurant?.name || "Tableloom"}
                className="h-8 w-8 object-contain"
                loading="lazy"
              />
            </div>
            <div
              className={`min-w-0 ${isDesktopSidebarCollapsed ? "hidden" : ""}`}
            >
              <p className="truncate text-base font-bold text-white xl:text-lg">
                {String(user?.role || "").toLowerCase() === "super_admin"
                  ? "Tableloom Admin"
                  : settings?.restaurant?.name || "Tableloom"}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">
                {workspaceLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={onToggleMobileSidebar}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/80 text-slate-100 transition hover:border-slate-500"
                aria-label={
                  isMobileSidebarOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
                }
                aria-expanded={isMobileSidebarOpen}
              >
                {isMobileSidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Branch Switcher — visible only for admins with multi-branch plans */}
            <BranchSwitcher />

            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              className="hidden rounded-2xl border border-white/10 bg-white/6 p-2.5 text-slate-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white lg:inline-flex"
              aria-label={
                isDesktopSidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              title={
                isDesktopSidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              aria-pressed={isDesktopSidebarCollapsed}
            >
              {isDesktopSidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
            {hasPermission("notification.view") && canViewNotifications ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={isDrawerOpen ? closeDrawer : openDrawer}
                  className={`relative rounded-2xl border p-2.5 transition-all ${isDrawerOpen ? "border-sky-300/50 bg-white/95 text-sky-700 shadow-lg shadow-slate-900/10" : "border-white/10 bg-white/6 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"}`}
                  aria-label={`Notifications (${unreadCount} unread)`}
                  aria-expanded={isDrawerOpen}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                      {importantNotifications.length > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-400 px-1 text-xs text-white animate-ping">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </>
                  )}
                </button>
              </div>
            ) : null}

            <div className="hidden h-8 w-px bg-white/10 md:block"></div>

            {user && <AccountPopover user={user} />}
          </div>
        </div>
      </div>
    </header>
  );
}
