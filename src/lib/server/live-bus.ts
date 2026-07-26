import "server-only";
import { EventEmitter } from "node:events";

// In-process pub/sub for live UI refresh. Server actions publish a "something
// changed in this factory" signal; the SSE route (/api/live) subscribes and
// forwards it to connected browsers, which then do a scoped router.refresh().
//
// SCOPE / CAVEAT: this is a single-process bus. It fans out to every client
// connected to the SAME server instance — perfect for a single container / VM
// shop-floor deployment. On a multi-instance serverless platform (e.g. Vercel
// with several lambdas) a publish on instance A won't reach a listener on
// instance B. The client tolerates this: EventSource auto-reconnects and the
// focus-refresh in AutoRefresh remains a fallback. For guaranteed multi-instance
// fan-out, swap this bus for Postgres LISTEN/NOTIFY or Supabase Realtime.

// Survive Next.js dev hot-reloads (module re-evaluation) by stashing on global.
const g = globalThis as unknown as { __verityLiveBus?: EventEmitter };
const bus = g.__verityLiveBus ?? new EventEmitter();
bus.setMaxListeners(0); // one listener per open SSE connection; don't cap
g.__verityLiveBus = bus;

function channel(factoryId: string) {
  return `live:${factoryId}`;
}

export type LiveChange = { topic: string; actorId?: string };

// actorId tags who caused the change: the SSE client skips events from its own
// user, because that browser already refreshed itself after the mutation —
// without this every save triggered a second full refresh ~1s later (the
// "double reload" failure mode).
export function publishChange(factoryId: string, topic = "change", actorId?: string) {
  if (!factoryId) return;
  bus.emit(channel(factoryId), { topic, actorId } satisfies LiveChange);
}

export function subscribeChange(factoryId: string, listener: (change: LiveChange) => void) {
  const ch = channel(factoryId);
  bus.on(ch, listener);
  return () => bus.off(ch, listener);
}
