const ensureApiSuffix = (value = "") => {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
};
const resolveConfiguredApiUrl = () => {
  const configured = import.meta.env.VITE_APP_API_URL || import.meta.env.VITE_API_BASE_URL || "";
  if (configured) {
    return ensureApiSuffix(configured);
  }
  if (import.meta.env.PROD) {
    return "https://tableloom-backend.onrender.com/api";
  }
  return "http://localhost:5000/api";
};
export const API_BASE_URL = resolveConfiguredApiUrl();
export const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
