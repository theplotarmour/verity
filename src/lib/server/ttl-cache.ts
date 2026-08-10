import "server-only";

/**
 * A tiny process-level cache with expiry.
 *
 * React's `cache()` only dedupes within a single request. The database sits
 * ~220ms away, so the queries every page repeats — "which modules does this org
 * have", "which org is this session in" — cost a fifth of a second each, on
 * every navigation, forever. Those answers change rarely and are cheap to
 * rebuild, so they are held here between requests instead.
 *
 * Deliberately not Redis: one process, a handful of keys, and a wrong answer
 * costs at most `ttlMs` of staleness on a nav item. Writers invalidate
 * explicitly, so the TTL is a backstop rather than the mechanism.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** In-flight loads, so N concurrent misses make one query rather than N. */
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const promise = load()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Drop one key, or every key sharing a prefix. Call from anything that writes. */
export function invalidate(keyOrPrefix: string): void {
  if (store.delete(keyOrPrefix)) return;
  for (const key of store.keys()) {
    if (key.startsWith(keyOrPrefix)) store.delete(key);
  }
}

export function clearAll(): void {
  store.clear();
}
