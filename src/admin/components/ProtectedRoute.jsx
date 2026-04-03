import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../common/context/AuthContext";
import {
  buildAdminPath,
  resolveAdminHomePath,
  stripAdminRoutePrefix
} from "../../common/utils/routes";
import { SkeletonBlock } from "./common/AdminSkeleton";
export default function ProtectedRoute({
  requiredPermission
}) {
  const {
    isAuthenticated,
    loading,
    hasAnyPermission,
    hasPermission,
    requiresPasswordChange,
    user
  } = useAuth();
  const location = useLocation();
  const strippedPath = stripAdminRoutePrefix(location.pathname);
  if (strippedPath === "/unauthorized") {
    return <Outlet />;
  }
  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <SkeletonBlock className="h-7 w-40" />
              <SkeletonBlock className="h-4 w-56" />
            </div>
            <SkeletonBlock className="h-11 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-3">
              <div className="space-y-3">
                {Array.from({
                length: 8
              }).map((_, index) => <SkeletonBlock key={`nav-skeleton-${index}`} className="h-10 w-full rounded-xl" />)}
              </div>
            </div>
            <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-9">
              <div className="space-y-4">
                <SkeletonBlock className="h-8 w-56" />
                <SkeletonBlock className="h-4 w-72" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({
                  length: 6
                }).map((_, index) => <SkeletonBlock key={`content-skeleton-${index}`} className="h-40 w-full rounded-2xl" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>;
  }
  if (!isAuthenticated) {
    return <Navigate to={buildAdminPath("/login")} replace />;
  }
  if (requiresPasswordChange && strippedPath !== "/force-password-update") {
    return <Navigate to={buildAdminPath("/force-password-update")} replace />;
  }
  if (!requiresPasswordChange && strippedPath === "/force-password-update") {
    return <Navigate to={resolveAdminHomePath(user?.role)} replace />;
  }
  const hasRequiredPermission = Array.isArray(requiredPermission) ? hasAnyPermission(...requiredPermission) : requiredPermission ? hasPermission(requiredPermission) : true;
  if (!hasRequiredPermission) {
    return <Navigate to={buildAdminPath("/unauthorized")} replace />;
  }
  return <Outlet />;
}
