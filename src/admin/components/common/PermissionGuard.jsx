import React from "react";
import { useAuth } from "../../../common/context/AuthContext";
import { useMonitoringMode } from "../../hooks/useMonitoringMode";

const normalizeList = (values = []) =>
  values.filter((value) => value !== undefined && value !== null && value !== "");

export function PermissionGuard({
  permission,
  anyOf = [],
  allOf = [],
  fallback = null,
  disableInMonitoring = false,
  children,
}) {
  const { hasPermission, hasAnyPermission } = useAuth();
  const isMonitoringMode = useMonitoringMode();

  if (disableInMonitoring && isMonitoringMode) {
    return fallback;
  }

  const requiredAll = normalizeList([
    ...normalizeList(allOf),
    ...(permission ? [permission] : []),
  ]);
  const requiredAny = normalizeList(anyOf);

  const passesAll = requiredAll.every((item) => hasPermission(item));
  const passesAny =
    requiredAny.length === 0 ? true : hasAnyPermission(...requiredAny);

  if (!passesAll || !passesAny) {
    return fallback;
  }

  return children;
}

export default PermissionGuard;
