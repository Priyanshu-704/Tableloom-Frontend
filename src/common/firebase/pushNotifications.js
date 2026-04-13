import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { logger } from "../utils/logger.js";
import {
  buildFirebaseWorkerUrl,
  firebaseMessagingConfig,
  firebasePublicVapidKey,
  isFirebaseMessagingConfigured,
  appBasePath,
} from "./config.js";
let firebaseAppInstance = null;
let messagingInstance = null;
let messagingSupportPromise = null;
let serviceWorkerRegistrationPromise = null;
const getFirebaseApp = () => {
  if (!firebaseAppInstance) {
    firebaseAppInstance = initializeApp(firebaseMessagingConfig);
  }
  return firebaseAppInstance;
};
export const isPushMessagingAvailable = async () => {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !isFirebaseMessagingConfigured()
  ) {
    return false;
  }
  if (!messagingSupportPromise) {
    messagingSupportPromise = isSupported().catch((error) => {
      logger.warn("Firebase messaging support check failed", error);
      return false;
    });
  }
  return messagingSupportPromise;
};
const getMessagingInstance = async () => {
  if (!(await isPushMessagingAvailable())) {
    return null;
  }
  if (!messagingInstance) {
    messagingInstance = getMessaging(getFirebaseApp());
  }
  return messagingInstance;
};
export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (window.Notification.permission === "granted") {
    return "granted";
  }
  if (window.Notification.permission === "denied") {
    return "denied";
  }
  try {
    return await window.Notification.requestPermission();
  } catch (error) {
    logger.warn("Notification permission request failed", error);
    return "default";
  }
};
export const registerFirebaseServiceWorker = async () => {
  if (!(await isPushMessagingAvailable())) {
    return null;
  }
  if (!serviceWorkerRegistrationPromise) {
    const scope = appBasePath ? `${appBasePath}/` : "/";
    const scriptUrl = buildFirebaseWorkerUrl(window.location.origin);
    serviceWorkerRegistrationPromise = navigator.serviceWorker
      .register(scriptUrl, {
        scope,
      })
      .catch((error) => {
        serviceWorkerRegistrationPromise = null;
        logger.error(
          "Failed to register Firebase messaging service worker",
          error,
        );
        throw error;
      });
  }
  return serviceWorkerRegistrationPromise;
};
export const getPushToken = async ({ requestPermission = true } = {}) => {
  if (!isFirebaseMessagingConfigured()) {
    return {
      success: false,
      token: "",
      reason: "missing-config",
      permission: "unsupported",
    };
  }
  if (!(await isPushMessagingAvailable())) {
    return {
      success: false,
      token: "",
      reason: "unsupported",
      permission: "unsupported",
    };
  }
  const permission = requestPermission
    ? await requestNotificationPermission()
    : window.Notification.permission;
  if (permission !== "granted") {
    return {
      success: false,
      token: "",
      reason: "permission-not-granted",
      permission,
    };
  }
  const messaging = await getMessagingInstance();
  const serviceWorkerRegistration = await registerFirebaseServiceWorker();
  if (!messaging || !serviceWorkerRegistration) {
    return {
      success: false,
      token: "",
      reason: "messaging-init-failed",
      permission,
    };
  }
  const token = await getToken(messaging, {
    vapidKey: firebasePublicVapidKey,
    serviceWorkerRegistration,
  });
  return {
    success: Boolean(token),
    token: token || "",
    permission,
  };
};
export const normalizeIncomingPushPayload = (payload = {}) => {
  const data = payload?.data || {};
  const notification = payload?.notification || {};
  return {
    ...data,
    rawPayload: payload,
    _id:
      data.notificationId ||
      data._id ||
      data.id ||
      payload?.messageId ||
      `push-${Date.now()}`,
    title: data.title || notification.title || "Notification",
    message: data.message || data.body || notification.body || "",
    body: data.body || data.message || notification.body || "",
    type: data.type || "info",
    priority: data.priority || "medium",
    createdAt: data.createdAt || new Date().toISOString(),
  };
};
export const subscribeToForegroundPush = async (handler) => {
  const messaging = await getMessagingInstance();
  if (!messaging || typeof handler !== "function") {
    return () => {};
  }
  return onMessage(messaging, (payload) => {
    try {
      handler(normalizeIncomingPushPayload(payload));
    } catch (error) {
      logger.error("Failed to process foreground push notification", error);
    }
  });
};
