"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isUserBusy } from "./AutoRefresh";

// Push-based live refresh. Opens an SSE connection to /api/live; when the server
// signals that something in this factory changed, we do a scoped router.refresh()
// (which re-fetches server components without a full page reload). This replaces
// interval polling — screens update within a second of a real change, and stay
// quiet otherwise.
//
// Guards:
//  - never refresh while the user is typing or a modal is open (isUserBusy);
//    a pending refresh is applied on the next idle signal instead.
//  - EventSource auto-reconnects if the stream drops (honouring the server's
//    `retry` hint), so transient disconnects self-heal.
// A change signal is factory-wide: every mutation by anyone reaches every
// connected client. On a busy floor that is dozens of signals a minute, and
// refreshing on each one re-renders the whole RSC tree and flashes skeletons —
// the "it keeps reloading" complaint. So signals are coalesced: bursts collapse
// into a single refresh, and refreshes never happen more often than this.
const MIN_REFRESH_INTERVAL_MS = 10000;

// Events caused by this user are skipped — the mutating tab already refreshed
// itself after its own save, so echoing the SSE back would produce the double
// save-then-reload flash the performance audit flagged. The stream announces
// our own user id via a `hello` event so no prop-drilling is needed.
export function LiveRefresh() {
  const router = useRouter();
  const pending = useRef(false);
  const selfId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    let source: EventSource | null = null;
    let disposed = false;
    let lastRefresh = 0;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const applyIfIdle = () => {
      if (disposed || !pending.current) return;
      if (isUserBusy()) return;

      // Too soon after the last one: leave it pending and come back when the
      // window opens, so a burst of floor activity costs one refresh, not ten.
      const since = Date.now() - lastRefresh;
      if (since < MIN_REFRESH_INTERVAL_MS) {
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            throttleTimer = null;
            applyIfIdle();
          }, MIN_REFRESH_INTERVAL_MS - since);
        }
        return;
      }

      pending.current = false;
      lastRefresh = Date.now();
      router.refresh();
    };

    const onHello = (e: MessageEvent) => {
      selfId.current = e.data || null;
    };

    const onChange = (e: MessageEvent) => {
      // Skip our own echoes; refresh only for other people's changes.
      try {
        const change = JSON.parse(e.data ?? "{}");
        if (selfId.current && change?.actorId === selfId.current) return;
      } catch {
        /* legacy plain-string payload — treat as a foreign change */
      }
      pending.current = true;
      applyIfIdle();
    };

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/live");
      source.addEventListener("hello", onHello);
      source.addEventListener("change", onChange);
      source.onerror = () => {
        // EventSource reconnects on its own; close only on hard failure so it
        // can re-open with a fresh handshake.
        if (source && source.readyState === EventSource.CLOSED) {
          source.close();
          source = null;
          if (!disposed) setTimeout(connect, 5000);
        }
      };
    };

    connect();

    // Flush any refresh that arrived while the user was busy, once they settle.
    window.addEventListener("focus", applyIfIdle);
    document.addEventListener("visibilitychange", applyIfIdle);
    const settleTimer = setInterval(applyIfIdle, 3000);

    return () => {
      disposed = true;
      clearInterval(settleTimer);
      if (throttleTimer) clearTimeout(throttleTimer);
      window.removeEventListener("focus", applyIfIdle);
      document.removeEventListener("visibilitychange", applyIfIdle);
      if (source) {
        source.removeEventListener("hello", onHello);
        source.removeEventListener("change", onChange);
        source.close();
      }
    };
  }, [router]);

  return null;
}
