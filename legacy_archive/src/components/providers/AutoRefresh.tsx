"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Keeps server-rendered data fresh without disrupting the user.
//
// Deliberately NOT a blind interval: a periodic router.refresh() re-runs the
// RSC render on every screen, flashes loading.tsx skeletons, and interrupts
// in-progress edits (this was the "reloading again and again" loop). Instead we
// refresh only when the tab actually regains focus after being away, debounced,
// and never while the user is typing or a modal is open. Live push updates are
// handled separately by the SSE channel (see useLiveRefresh).
export function isUserBusy() {
  if (typeof document === "undefined") return false;
  const el = document.activeElement as HTMLElement | null;
  if (el) {
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) {
      return true;
    }
  }
  // Any open modal/dialog (framer-motion modals render a full-screen overlay)
  if (document.querySelector('[role="dialog"], [data-modal-open="true"]')) return true;
  return false;
}

export function AutoRefresh() {
  const router = useRouter();
  const hiddenSince = useRef<number | null>(null);

  useEffect(() => {
    // Only refresh if the tab was hidden for a meaningful stretch — this avoids
    // refresh storms from focus/visibilitychange firing together on a quick
    // alt-tab, and never fires while the user is mid-task.
    const MIN_AWAY_MS = 20000;

    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      const away = hiddenSince.current ? Date.now() - hiddenSince.current : 0;
      hiddenSince.current = null;
      if (away < MIN_AWAY_MS) return;
      if (isUserBusy()) return;
      router.refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince.current = Date.now();
      } else {
        maybeRefresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  return null;
}
