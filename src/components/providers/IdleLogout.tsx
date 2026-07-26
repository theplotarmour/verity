"use client";

import { useEffect, useRef } from "react";
import { logoutUser } from "@/server/actions/auth";

// Auto-logs out shared shop-floor devices after a period of inactivity.
// Any pointer/key/scroll/touch activity resets the timer.
export function IdleLogout({ minutes = 30 }: { minutes?: number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ms = minutes * 60 * 1000;
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { logoutUser().catch(() => {}); }, ms);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes]);

  return null;
}
