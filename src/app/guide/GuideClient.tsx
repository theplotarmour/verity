"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ListTree, X } from "lucide-react";

import type { GuideHeading } from "@/lib/markdown";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "verity.guide.done";

/**
 * The guide reader.
 *
 * Two panes on desktop: a sticky checklist built from the document's own
 * headings, and the guide itself. The checklist is the reason this is an app
 * page rather than a static file — setup is a sequence, and a reader working
 * through it needs to see where they stopped. Ticks persist locally; they are
 * a personal bookmark, not organisation state, so they never leave the device.
 */
export function GuideClient({
  html,
  headings,
}: {
  html: string;
  headings: GuideHeading[];
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const [navOpen, setNavOpen] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      // A corrupt bookmark is not worth failing the page over.
    }
  }, []);

  function toggle(id: string) {
    setDone((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  // Scroll spy. Observes the rendered headings and marks the topmost one that
  // has passed the reading line, so the nav tracks the eye rather than lagging
  // a section behind.
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;

    const targets = headings
      .map((h) => root.querySelector<HTMLElement>(`#${CSS.escape(h.id)}`))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: 0 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const progress = useMemo(() => {
    if (headings.length === 0) return 0;
    return Math.round((headings.filter((h) => done.has(h.id)).length / headings.length) * 100);
  }, [done, headings]);

  function jump(id: string) {
    const el = articleRef.current?.querySelector(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setNavOpen(false);
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-text-primary">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-[var(--brand)]/50 hover:text-text-primary"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
              VerityAI
            </p>
            <p className="truncate font-display text-sm font-semibold tracking-[-0.02em]">
              User Guide
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-text-tertiary">{progress}%</span>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-secondary lg:hidden"
            aria-label="Open contents"
          >
            <ListTree className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Checklist */}
        <aside className="hidden min-h-0 flex-col overflow-y-auto border-r border-border p-4 lg:flex">
          <Contents
            headings={headings}
            done={done}
            activeId={activeId}
            onToggle={toggle}
            onJump={jump}
          />
        </aside>

        {/* Document */}
        <main ref={articleRef} className="min-h-0 overflow-y-auto">
          <article
            className="guide-prose mx-auto w-full max-w-3xl px-5 py-10 md:px-10"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </main>
      </div>

      {/* Mobile contents sheet */}
      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close contents"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-sm font-semibold">Contents</p>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-secondary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Contents
              headings={headings}
              done={done}
              activeId={activeId}
              onToggle={toggle}
              onJump={jump}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Contents({
  headings,
  done,
  activeId,
  onToggle,
  onJump,
}: {
  headings: GuideHeading[];
  done: Set<string>;
  activeId: string | null;
  onToggle: (id: string) => void;
  onJump: (id: string) => void;
}) {
  return (
    <nav className="space-y-0.5">
      {headings.map((h) => {
        const isDone = done.has(h.id);
        const isActive = activeId === h.id;
        return (
          <div
            key={h.id}
            className={cn(
              "flex items-start gap-2 rounded-xl transition-colors",
              isActive ? "bg-[var(--brand)]/8" : "hover:bg-surface-2/70",
              h.level === 3 && "ml-3",
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(h.id)}
              aria-label={isDone ? `Mark "${h.text}" not done` : `Mark "${h.text}" done`}
              aria-pressed={isDone}
              className="flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-[5px] border transition-all",
                  isDone
                    ? "border-transparent bg-[var(--brand)] text-white"
                    : "border-border bg-transparent",
                )}
              >
                {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onJump(h.id)}
              className={cn(
                "min-w-0 flex-1 py-2.5 pr-3 text-left text-[13px] leading-snug transition-colors",
                isDone && "line-through opacity-45",
                isActive
                  ? "font-semibold text-[var(--brand)]"
                  : h.level === 2
                    ? "font-medium text-text-primary"
                    : "text-text-secondary",
              )}
            >
              {h.text}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
