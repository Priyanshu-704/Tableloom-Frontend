(function () {
  const searchParams = new URL(self.location.href).searchParams;
  const firebaseVersion = searchParams.get("firebaseVersion") || "12.11.0";
  self.importScripts(`https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app-compat.js`);
  self.importScripts(`https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-messaging-compat.js`);
  const config = {
    apiKey: searchParams.get("apiKey") || "",
    authDomain: searchParams.get("authDomain") || "",
    projectId: searchParams.get("projectId") || "",
    storageBucket: searchParams.get("storageBucket") || "",
    messagingSenderId: searchParams.get("messagingSenderId") || "",
    appId: searchParams.get("appId") || "",
    measurementId: searchParams.get("measurementId") || ""
  };
  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
    return;
  }
  firebase.initializeApp(config);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    const data = payload?.data || {};
    const notification = payload?.notification || {};
    const title = data.title || notification.title || "Tableloom";
    const body = data.message || data.body || notification.body || "";
    const clickAction = data.clickAction || data.url || "/";
    self.registration.showNotification(title, {
      body,
      icon: data.icon || "/favicon.svg",
      badge: data.badge || "/favicon.svg",
      data: {
        ...data,
        clickAction
      },
      tag: data.notificationId || payload?.messageId || undefined,
      requireInteraction: data.priority === "urgent"
    });
  });
  self.addEventListener("notificationclick", event => {
    event.notification.close();
    const destination = event.notification?.data?.clickAction || "/";
    event.waitUntil(self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clients => {
      const existingClient = clients.find(client => "focus" in client);
      if (existingClient) {
        existingClient.navigate(destination);
        return existingClient.focus();
      }
      return self.clients.openWindow(destination);
    }));
  });
})();
