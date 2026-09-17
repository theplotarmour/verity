"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { runQuery } from "@/server/actions/platform";

type Result = { id: string; type: "lead" | "domain" | "team"; label: string; sublabel: string; href: string };

const TYPE_LABEL: Record<Result["type"], string> = { lead: "Lead", domain: "Domain", team: "Team" };

/**
 * Global Cmd/Ctrl+K search (Task 109 Phase G §2). Mounted unconditionally in
 * `ShellChrome`, like `AgentChatDock` — but stays capability-agnostic itself:
 * it dispatches to a registered query BY STRING KEY through the platform's
 * existing `runQuery`, the same decoupling `runCommand` already uses, rather
 * than importing an outreach module into the generic shell.
 *
 * Currently wired to outreach's `command_palette_search`; a second capability
 * wanting this needs the component generalized to accept a query key — not
 * built speculatively here.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const result = await runQuery<Result[]>("verity.outreach.command_palette_search", { q: q.trim() });
        setResults(result.ok ? result.data : []);
        setActiveIndex(0);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <button className="verity-scrim absolute inset-0 border-0" aria-label="Close search" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="glass-overlay relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-line shadow-[var(--shadow-lg)]"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && results[activeIndex]) {
            go(results[activeIndex]!.href);
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Icon name="search" size={18} className="shrink-0 text-text-tertiary" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads, domains, teams…"
            className="h-8 w-full border-0 bg-transparent text-[14px] text-text placeholder:text-text-tertiary focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] text-text-tertiary sm:inline">Esc</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-[13px] text-text-tertiary">Type at least 2 characters</p>
          ) : pending ? (
            <p className="px-3 py-6 text-center text-[13px] text-text-tertiary">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-text-tertiary">No matches</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {results.map((r, i) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    onClick={() => go(r.href)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] ${
                      i === activeIndex ? "bg-accent-subtle text-text" : "text-text-secondary hover:bg-glass-2"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {r.label} <span className="text-text-tertiary">· {r.sublabel}</span>
                    </span>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-text-tertiary">{TYPE_LABEL[r.type]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
