import { useLocation } from "react-router-dom";
import { useAuth } from "../../common/context/AuthContext";
import { isSuperAdminMonitoringPath } from "../../common/utils/routes";

export function useMonitoringMode() {
  const location = useLocation();
  const { user } = useAuth();

  return isSuperAdminMonitoringPath(location.pathname, user?.role);
}
