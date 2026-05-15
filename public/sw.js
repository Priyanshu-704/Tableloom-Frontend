const CACHE_NAME = "tableloom-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./tableloom-mark.svg",
];
const APP_SHELL_PATHS = new Set(
  APP_SHELL.map((entry) => entry.replace(/^\.\//, "/")),
);

const isAppShellRequest = (requestUrl) =>
  APP_SHELL_PATHS.has(requestUrl.pathname) ||
  requestUrl.pathname === "/" ||
  requestUrl.pathname.endsWith("/index.html");

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const {
    request
  } = event;
  if (request.method !== "GET") {
    return;
  }
  const requestUrl = new URL(request.url);
  const isNavigationRequest = request.mode === "navigate";
  const isSameOrigin = requestUrl.origin === self.location.origin;
  if (isNavigationRequest) {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }
  if (!isSameOrigin) {
    return;
  }
  if (!isAppShellRequest(requestUrl)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(fetch(request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
    }
    return networkResponse;
  }).catch(() => caches.match(request)));
});
