export const dynamic = "force-dynamic";

// Served from a route rather than /public so the cache name can carry a real
// per-deploy id. As a static file the name was a constant, which meant the
// `activate` handler never evicted anything (it only deletes keys that differ
// from the current name) and chunks cached by an earlier deploy were served
// forever — the stale-chunk / endless-reload failure mode.
//
// Prefer the commit sha so every instance of one deploy agrees on the name;
// fall back to process start time, which still changes on redeploy.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  String(Date.now());

const SW = `
const CACHE_NAME = "verity-shell-${BUILD_ID}";
const OFFLINE_URL = "/offline";
const ASSETS = ["/", "/manifest.webmanifest", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never touch the API:
  //  - /api/live is an endless SSE stream; clone()+cache.put() buffers a body
  //    that never completes, leaking memory and able to stall the stream.
  //  - the cache-first branch below would otherwise pin dynamic responses
  //    (notifications, session) for the life of the cache.
  if (url.pathname.startsWith("/api/")) return;

  // RSC payloads are per-navigation and must never be replayed from cache.
  if (url.searchParams.has("_rsc")) return;

  // Only our own origin is cacheable here.
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Content-hashed build output is immutable, so cache-first is safe and fast.
  // Everything else goes network-first and only falls back to cache offline,
  // so a stale copy can never win while the network is reachable.
  const immutable = url.pathname.startsWith("/_next/static/");

  if (immutable) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetchAndCache(event.request))
    );
    return;
  }

  event.respondWith(
    fetchAndCache(event.request).catch(() => caches.match(event.request))
  );
});

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (!response || response.status !== 200 || response.type !== "basic") return response;
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    return response;
  });
}
`.trim();

export async function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // The worker script itself must never be cached, or a new deploy's worker
      // can't take over. Registration also passes updateViaCache: "none".
      "Cache-Control": "no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
