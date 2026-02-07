const MAP_CACHE_NAME = "map-runtime-v1";
const MAP_CACHE_PREFIX = "map-runtime-";
const MAX_MAP_CACHE_ENTRIES = 450;

const MAP_HOST_MATCHERS = [
  "openstreetmap.org",
  "tile.openstreetmap.org",
  "cartocdn.com",
  "maptiles",
];

function isMapAssetRequest(url) {
  if (!url || !url.hostname) return false;
  return MAP_HOST_MATCHERS.some((matcher) => url.hostname.includes(matcher));
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  const overflow = keys.length - maxEntries;
  if (overflow <= 0) return;

  for (let index = 0; index < overflow; index += 1) {
    await cache.delete(keys[index]);
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(MAP_CACHE_PREFIX) && key !== MAP_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (!isMapAssetRequest(requestUrl)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(MAP_CACHE_NAME);
      const cachedResponse = await cache.match(request);

      const networkResponsePromise = fetch(request)
        .then(async (response) => {
          if (response.ok || response.type === "opaque") {
            await cache.put(request, response.clone());
            await trimCache(cache, MAX_MAP_CACHE_ENTRIES);
          }
          return response;
        })
        .catch(() => null);

      if (cachedResponse) {
        event.waitUntil(networkResponsePromise);
        return cachedResponse;
      }

      const networkResponse = await networkResponsePromise;
      if (networkResponse) return networkResponse;

      return new Response("Offline", { status: 503, statusText: "Offline" });
    })()
  );
});
