import { useAuth } from "../../common/context/AuthContext";
import { useLocation } from "react-router-dom";
import { isSuperAdminMonitoringPath } from "../../common/utils/routes";
export function useMonitoringMode() {
  const { user } = useAuth();
  const location = useLocation();
  return isSuperAdminMonitoringPath(location.pathname, user?.role);
}
