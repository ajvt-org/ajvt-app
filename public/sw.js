const OFFLINE_CACHE = "ajvt-offline-v4";
const OFFLINE_URL = "/offline.html";
const DEPLOYING_URL = "/deploying.html";
const FONTS = [
  "/fonts/tajawal-400.woff2",
  "/fonts/tajawal-700.woff2",
  "/fonts/tajawal-800.woff2",
  "/fonts/tajawal-900.woff2",
];
const OFFLINE_ASSETS = [OFFLINE_URL, DEPLOYING_URL, "/logo-mark.svg", ...FONTS];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== OFFLINE_CACHE).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

function fallback(path) {
  return caches.match(path).then((cached) => cached || Response.error());
}

function fetchWithFallback(request, downPath, offlinePath) {
  return fetch(request)
    .then((response) => {
      if (response.status < 500) return response;
      return caches.match(downPath).then((cached) => cached || response);
    })
    .catch(() => fallback(offlinePath));
}

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetchWithFallback(event.request, DEPLOYING_URL, OFFLINE_URL));
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !OFFLINE_ASSETS.includes(url.pathname)) return;
  event.respondWith(fetchWithFallback(event.request, url.pathname, url.pathname));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "إشعار جديد";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      "setAppBadge" in self.navigator
        ? self.navigator.setAppBadge(1).catch(() => {})
        : Promise.resolve(),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
