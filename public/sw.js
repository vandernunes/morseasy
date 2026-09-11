/* sw.js — makes Morse Easy work with no connection at all.
 *
 * Once this is installed the app fetches NOTHING from the network on a normal
 * visit. There are no third parties left to fetch from: the fonts are served
 * from this origin and there is no analytics, no API and no backend. Practice
 * on a plane, in a basement, in a field with no bars.
 *
 * Cache-first for everything, because every asset is immutable for a given
 * build and BUILD_ID changes when any of them does. A new build lands in a new
 * cache, the old one is deleted on activate, and the page is told so it can
 * offer a reload rather than swapping the app out from under someone
 * mid-lesson.
 *
 * Vander Nunes - N5EDB
 */
const BUILD = "#BUILD_ID";
const CACHE = "morseasy-" + BUILD;

/* Everything needed to run offline. If any of these 404s the install fails and
   the old worker stays, which is the correct outcome - a half-cached app is
   worse than no app. */
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/fonts/Barlow-400.woff2",
  "/fonts/Barlow-600.woff2",
  "/fonts/IBMPlexMono-400.woff2",
  "/fonts/IBMPlexMono-500.woff2",
  "/fonts/IBMPlexMono-600.woff2",
  "/fonts/SairaCondensed-500.woff2",
  "/fonts/SairaCondensed-600.woff2",
  "/fonts/SairaCondensed-700.woff2"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith("morseasy-") && k !== CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // nothing else exists, but be explicit

  /* A navigation always resolves to the app shell. That is what lets someone
     open the installed app, or reload it, with no connection. */
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("/", { cacheName: CACHE })
        .then(hit => hit || fetch(req).catch(() => caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
