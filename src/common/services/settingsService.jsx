import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
import { extractTenantFromPath, stripAppBasePath } from "../utils/routes.js";
import toServiceResponse from "./serviceResponse";

const settingsRequestCache = createRequestCache(15000);
const getSettingsScope = () => {
  if (typeof window === "undefined") {
    return "server";
  }
  const tenant = extractTenantFromPath(window.location.pathname);
  if (tenant?.tenantSlug && tenant?.tenantKey) {
    return `tenant:${tenant.tenantSlug}:${tenant.tenantKey}`;
  }
  return `path:${stripAppBasePath(window.location.pathname)}`;
};

export const settingsService = {
  getPublicSettings: async () => {
    try {
      return await settingsRequestCache.run({
        scope: getSettingsScope(),
        type: "public-settings"
      }, async () => {
        const response = await axiosInstance.get("/settings/public");
        return toServiceResponse(response, {
          data: {}
        });
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch public settings");
    }
  },
  getAdminSettings: async () => {
    try {
      return await settingsRequestCache.run({
        scope: getSettingsScope(),
        type: "admin-settings"
      }, async () => {
        const response = await axiosInstance.get("/settings");
        return toServiceResponse(response, {
          data: {},
          meta: {}
        });
      });
    } catch (error) {
      handleApiError(error, "Failed to fetch settings");
    }
  },
  updateSettings: async (payload = {}) => {
    try {
      const response = await axiosInstance.put("/settings", payload);
      settingsRequestCache.clear();
      return toServiceResponse(response, {
        data: {},
        publicSettings: {},
        meta: {}
      });
    } catch (error) {
      handleApiError(error, "Failed to update settings");
    }
  }
};
export default settingsService;
