import { useAuth } from "../../common/context/AuthContext";

export function useMonitoringMode() {
  const { user } = useAuth();

  return String(user?.role || "").toLowerCase() === "super_admin";
}
