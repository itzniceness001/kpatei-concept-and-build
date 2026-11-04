// KPATEI website service worker: lets the app open quickly and work offline.
// Pages are fetched fresh when online; saved copies are used when there is no internet.
const VERSION = "kpatei-v2";
const CORE = ["/", "/index.html", "/offline.html", "/manifest.webmanifest", "/logo.png",
  "/icons/icon-192.png", "/icons/icon-512.png", "/images/about-1.jpg", "/images/about-2.jpg",
  "/images/gallery/bungalow-pool-compound.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k.startsWith("kpatei-") && k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith("/clockin/")) return; // staff app has its own

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put("/index.html", copy));
      return res;
    }).catch(async () => (await caches.match(req)) || (await caches.match("/index.html")) || caches.match("/offline.html")));
    return;
  }
  // review data and form posts always go to the network
  if (url.hostname.endsWith("script.google.com") || url.hostname.endsWith("googleusercontent.com") || url.hostname.endsWith("web3forms.com")) return;

  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
