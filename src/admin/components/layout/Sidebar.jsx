/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../../common/context/AuthContext";
import { useSettings } from "../../../common/context/SettingsContext";
import { useBranch } from "../../context/BranchContext";
import { isSuperAdminMonitoringPath } from "../../../common/utils/routes";
import {
  getVisibleAdminNavigationSections,
  isAdminNavigationItemActive,
  resolveActiveAdminNavigation,
} from "../../utils/navigationConfig";

const SECTION_STATE_STORAGE_KEY = "admin.sidebar.sectionState";

const buildDefaultSectionState = (sections = []) =>
  sections.reduce((accumulator, section) => {
    if (section.collapsible) {
      accumulator[section.id] = !section.defaultCollapsed;
    }
    return accumulator;
  }, {});

export function Sidebar({
  isMobileSidebarOpen = false,
  onCloseMobileSidebar,
  isDesktopCollapsed = false,
}) {
  const { dispatch } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions } = useAuth();
  const { settings } = useSettings();
  const { branches, branchLimit } = useBranch();
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
  const [openSections, setOpenSections] = useState(() => {
    if (typeof window === "undefined") {
      return {};
    }
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(SECTION_STATE_STORAGE_KEY) || "{}",
      );
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    setOpenSections((current) => ({
      ...buildDefaultSectionState(visibleSections),
      ...current,
    }));
  }, [visibleSections]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      SECTION_STATE_STORAGE_KEY,
      JSON.stringify(openSections),
    );
  }, [openSections]);
  useEffect(() => {
    onCloseMobileSidebar?.();
  }, [location.pathname, location.search]);
  const { item: activeItem } = useMemo(
    () =>
      resolveActiveAdminNavigation({
        location,
        sections: visibleSections,
      }),
    [location, visibleSections],
  );
  const handleNavigation = (item) => {
    dispatch({
      type: "SET_CURRENT_VIEW",
      payload: item.id,
    });
    navigate(item.path);
    onCloseMobileSidebar?.();
  };
  const toggleSection = (sectionId) => {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };
  const renderNavigationItem = (item, { compact = false } = {}) => {
    const Icon = item.icon;
    const active = isAdminNavigationItemActive(item, location);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavigation(item)}
        className={`flex w-full rounded-2xl text-left transition-all ${compact ? "justify-center px-2 py-2.5" : "items-center gap-3 px-3 py-3"} ${active ? "bg-primary-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}
        title={compact ? item.label : undefined}
        aria-label={item.label}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-2xl ${compact ? "h-12 w-12" : "h-11 w-11"} ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className={`min-w-0 ${compact ? "hidden" : ""}`}>
          <p className="truncate text-sm font-semibold">{item.label}</p>
          <p
            className={`truncate text-xs ${active ? "text-white/75" : "text-slate-400"}`}
          >
            {item.description}
          </p>
        </div>
      </button>
    );
  };
  const renderExpandedNavigation = () => (
    <nav className="space-y-4">
      {visibleSections.map((section) => {
        const sectionHasSingleItem = section.items.length === 1 && !section.collapsible;
        const sectionActive = section.items.some((item) =>
          isAdminNavigationItemActive(item, location),
        );
        const isOpen = openSections[section.id];

        if (sectionHasSingleItem) {
          return (
            <div
              key={section.id}
              className="rounded-3xl border border-slate-200 bg-white p-2.5 shadow-sm"
            >
              {renderNavigationItem(section.items[0])}
            </div>
          );
        }

        return (
          <div
            key={section.id}
            className={`rounded-3xl border bg-white shadow-sm transition-colors ${sectionActive ? "border-primary-200" : "border-slate-200"}`}
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-4 text-left transition-colors  ${sectionActive ? "bg-primary-50 text-primary-700" : "text-slate-700 hover:bg-slate-50"}`}
              aria-expanded={Boolean(isOpen)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{section.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {section.items.length} tab{section.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </button>

            {isOpen ? (
              <div className="space-y-2 px-2.5 pb-2.5">
                {section.items.map((item) => renderNavigationItem(item))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
  const renderCompactNavigation = () => (
    <nav className="space-y-4">
      {visibleSections.map((section) => (
        <div key={section.id}>
          <div className="mb-3 px-2" title={section.title}>
            <div className="h-px rounded-full bg-slate-200"></div>
          </div>
          <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            {section.items.map((item) =>
              renderNavigationItem(item, {
                compact: true,
              }),
            )}
          </div>
        </div>
      ))}
    </nav>
  );
  const renderNavigation = ({ compact = false } = {}) => (
    <div className="pb-10">
      {compact ? renderCompactNavigation() : renderExpandedNavigation()}
    </div>
  );

  if (!visibleSections.length) {
    return (
      <aside
        className={`fixed left-0 top-20 bottom-0 z-40 hidden border-r border-slate-200 bg-slate-50/95 transition-[width] duration-300 lg:block ${isDesktopCollapsed ? "w-24" : "w-72"}`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain transition-[padding] duration-300 ${isDesktopCollapsed ? "px-3 py-4" : "px-5 py-6"}`}
          >
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center">
              <Settings className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p
                className={`font-medium text-slate-500 ${isDesktopCollapsed ? "text-xs" : "text-sm"}`}
              >
                No navigation available
              </p>
              <p
                className={`mt-1 text-slate-400 ${isDesktopCollapsed ? "hidden" : "text-xs"}`}
              >
                Contact the administrator for permissions.
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity lg:hidden ${isMobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => onCloseMobileSidebar?.()}
      />

      <aside
        className={`fixed left-0 top-20 bottom-0 z-50 w-[min(90vw,21rem)] border-r border-slate-200 bg-slate-50/98 shadow-xl transition-transform lg:hidden ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 sm:py-5">
            {renderNavigation({
              compact: false,
            })}
          </div>
        </div>
      </aside>

      <aside
        className={`fixed left-0 top-20 bottom-0 z-40 hidden border-r border-slate-200 bg-slate-50/95 transition-[width] duration-300 lg:block ${isDesktopCollapsed ? "w-24" : "w-72"}`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain transition-[padding] duration-300 ${isDesktopCollapsed ? "px-3 py-4" : "px-5 py-6"}`}
          >
            {renderNavigation({
              compact: isDesktopCollapsed,
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
