"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  discardOrderDraft,
  loadOrderDraft,
  saveOrderDraft,
  type OrderDraftKind,
} from "@/server/actions/orderDrafts";

/**
 * Autosave and resume for a long form.
 *
 * Saves are debounced, because the alternative is a server action per keystroke.
 * They are also serialised: a save that is still in flight when the next one is
 * due queues rather than racing it, so two writes cannot land out of order and
 * leave the older form state as the stored draft.
 */
const SAVE_DEBOUNCE_MS = 1200;

export type DraftStatus = "loading" | "idle" | "saving" | "saved" | "error";

export interface UseOrderDraft<T> {
  /** The restored draft, or null. Undefined until the first load resolves. */
  restored: T | null | undefined;
  /** When that draft was last written, for "resumed from 4:15pm". */
  restoredAt: Date | null;
  status: DraftStatus;
  /** Feed the current form state; debounced and written for you. */
  save: (value: T) => void;
  /** Forget the draft — on submit, or when the user discards it. */
  discard: () => Promise<void>;
}

export function useOrderDraft<T>(kind: OrderDraftKind): UseOrderDraft<T> {
  const [restored, setRestored] = useState<T | null | undefined>(undefined);
  const [restoredAt, setRestoredAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<DraftStatus>("loading");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const queued = useRef<T | null>(null);
  // Set once the user discards: a debounced save already scheduled must not
  // resurrect the draft a moment after they asked for it to go.
  const abandoned = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadOrderDraft(kind)
      .then((draft) => {
        if (cancelled) return;
        setRestored((draft?.payload as T) ?? null);
        setRestoredAt(draft?.updatedAt ?? null);
        setStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        // A draft that cannot be read must not block the form. The user types
        // into an empty one, which is exactly what they had before drafts.
        setRestored(null);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const flush = useCallback(
    async (value: T) => {
      if (abandoned.current) return;
      if (inFlight.current) {
        // A save is already in the air. Leave the newest state for it to pick
        // up on the way out rather than starting a second write that could
        // land first and leave the older form state stored.
        queued.current = value;
        return;
      }
      inFlight.current = true;
      try {
        // Drained in a loop rather than by recursing: whatever arrived while
        // the last write was in flight is written next, in order.
        let next: T | null = value;
        while (next !== null && !abandoned.current) {
          setStatus("saving");
          try {
            const result = await saveOrderDraft(kind, next);
            setStatus("error" in result ? "error" : "saved");
          } catch {
            setStatus("error");
          }
          next = queued.current;
          queued.current = null;
        }
      } finally {
        inFlight.current = false;
      }
    },
    [kind],
  );

  const save = useCallback(
    (value: T) => {
      if (abandoned.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(value), SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  const discard = useCallback(async () => {
    abandoned.current = true;
    if (timer.current) clearTimeout(timer.current);
    queued.current = null;
    setRestored(null);
    setRestoredAt(null);
    setStatus("idle");
    try {
      await discardOrderDraft(kind);
    } catch {
      // Nothing to tell the user: the form in front of them is already clear,
      // and a failed delete resurfaces only as a stale resume offer later.
    }
    abandoned.current = false;
  }, [kind]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { restored, restoredAt, status, save, discard };
}
