import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
import { extractTenantFromPath, stripAppBasePath } from "../utils/routes.js";
import toServiceResponse from "./serviceResponse";
import { appendImageToFormData } from "../utils/imageUpload";
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
  updateSettings: async (payload = {}, imageFile = null) => {
    try {
      const hasImage = Boolean(imageFile);
      const sanitizedPayload = {
        ...(payload || {}),
        restaurant: payload?.restaurant ? {
          ...payload.restaurant
        } : undefined
      };
      const requestBody = hasImage ? new FormData() : sanitizedPayload;
      if (sanitizedPayload?.restaurant) {
        delete sanitizedPayload.restaurant.logo;
        delete sanitizedPayload.restaurant.logoThumbnail;
      }
      if (hasImage) {
        Object.entries(sanitizedPayload || {}).forEach(([key, value]) => {
          requestBody.append(key, typeof value === "object" ? JSON.stringify(value) : value);
        });
        appendImageToFormData(requestBody, imageFile);
      }
      const response = await axiosInstance.put("/settings", requestBody, hasImage ? {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      } : undefined);
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
