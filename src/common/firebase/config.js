const env = typeof import.meta !== "undefined" && import.meta?.env ? import.meta.env : {};
export const firebaseMessagingConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || "",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || ""
};
export const firebasePublicVapidKey = env.VITE_FIREBASE_VAPID_KEY || "";
export const appBasePath = "";
export const firebaseWorkerVersion = "12.11.0";
export const isFirebaseMessagingConfigured = () => Boolean(firebaseMessagingConfig.apiKey && firebaseMessagingConfig.projectId && firebaseMessagingConfig.messagingSenderId && firebaseMessagingConfig.appId && firebasePublicVapidKey);
export const getFirebaseMessagingWorkerPath = () => `${appBasePath}/firebase-messaging-sw.js`;
export const buildFirebaseWorkerUrl = (origin = "") => {
  if (!origin) {
    return getFirebaseMessagingWorkerPath();
  }
  const url = new URL(getFirebaseMessagingWorkerPath(), origin);
  Object.entries(firebaseMessagingConfig).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  url.searchParams.set("firebaseVersion", firebaseWorkerVersion);
  return url.toString();
};
