import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
const STORAGE_PREFIX = "tableloom_push_token";
const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
};
const buildStorageKey = (audience = "global", subject = "default") => `${STORAGE_PREFIX}:${audience}:${subject || "default"}`;
const getStoredToken = storageKey => getStorage()?.getItem(storageKey) || "";
const setStoredToken = (storageKey, token) => getStorage()?.setItem(storageKey, token);
const clearStoredToken = storageKey => getStorage()?.removeItem(storageKey);
const buildMetadata = () => ({
  platform: "web",
  userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  language: typeof navigator !== "undefined" ? navigator.language : ""
});
const resolveTokenEndpoint = (audience = "") => String(audience || "").toLowerCase() === "staff" ? "/push-notifications/token/staff" : "/push-notifications/token/customer";
export const pushNotificationService = {
  buildStorageKey,
  registerToken: async (payload = {}) => {
    try {
      const response = await axiosInstance.post(resolveTokenEndpoint(payload?.audience), {
        ...payload,
        device: {
          ...buildMetadata(),
          ...(payload?.device || {})
        }
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      if (error?.response?.status === 404) {
        return {
          success: false,
          ignored: true,
          message: "Push token endpoint not found"
        };
      }
      handleApiError(error, "Failed to register push notification token");
    }
  },
  unregisterToken: async (payload = {}) => {
    try {
      const response = await axiosInstance.delete(resolveTokenEndpoint(payload?.audience), {
        data: payload
      });
      return response?.data ?? {
        success: true
      };
    } catch (error) {
      if (error?.response?.status === 404) {
        return {
          success: false,
          ignored: true,
          message: "Push token endpoint not found"
        };
      }
      handleApiError(error, "Failed to unregister push notification token");
    }
  },
  syncToken: async ({
    storageKey,
    token,
    ...payload
  } = {}) => {
    if (!storageKey || !token) {
      return {
        success: false,
        skipped: true
      };
    }
    const previousToken = getStoredToken(storageKey);
    if (previousToken === token) {
      return {
        success: true,
        skipped: true,
        token
      };
    }
    if (previousToken && previousToken !== token) {
      await pushNotificationService.unregisterToken({
        ...payload,
        token: previousToken
      }).catch(() => {});
    }
    const response = await pushNotificationService.registerToken({
      ...payload,
      token
    });
    if (response?.success !== false) {
      setStoredToken(storageKey, token);
    }
    return response;
  },
  removeStoredToken: async ({
    storageKey,
    token,
    ...payload
  } = {}) => {
    if (!storageKey) {
      return {
        success: false,
        skipped: true
      };
    }
    const resolvedToken = token || getStoredToken(storageKey);
    if (!resolvedToken) {
      clearStoredToken(storageKey);
      return {
        success: true,
        skipped: true
      };
    }
    const response = await pushNotificationService.unregisterToken({
      ...payload,
      token: resolvedToken
    }).catch(() => ({
      success: false
    }));
    clearStoredToken(storageKey);
    return response;
  },
  clearAllStoredTokens: () => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    Object.keys(storage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        storage.removeItem(key);
      }
    });
  }
};
export default pushNotificationService;
