"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, X, Loader2 } from "lucide-react";

import { ProposalCard } from "./ProposalCard";
import type { PriceChangeProposal } from "@/lib/server/assistantTools";

/**
 * The assistant, as a right-hand drawer.
 *
 * Talks to `/api/assistant`, which is request/response (not a stream) and already
 * returns any write it wants to make as a structured `proposals[]` — so this
 * renders `ProposalCard` from that field directly rather than scraping a JSON
 * block out of the reply text. Approval goes through the card's own guarded
 * server action; the panel never applies anything itself.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
  proposals?: PriceChangeProposal[];
  error?: boolean;
}

export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);

    void fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, route: pathname ?? "/owner/dashboard", taskType: "analytical" }),
    })
      .then(async (r) => ({ status: r.status, json: await r.json() }))
      .then(({ status, json }) => {
        if (status !== 200) {
          setMessages((m) => [
            ...m,
            { role: "assistant", content: json.error ?? "The assistant is unavailable right now.", error: true },
          ]);
          return;
        }
        const proposals = (json.proposals ?? []).filter(
          (p: PriceChangeProposal) => p && p.kind === "menu_price",
        );
        setMessages((m) => [
          ...m,
          { role: "assistant", content: json.reply || "…", proposals: proposals.length ? proposals : undefined },
        ]);
      })
      .catch(() => {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Something went wrong reaching the assistant.", error: true },
        ]);
      })
      .finally(() => setBusy(false));
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.24 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-border bg-surface shadow-[var(--shadow-modal)]"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[var(--brand)]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Assistant</p>
                  <p className="text-[11px] text-text-tertiary">Grounded in this workspace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="mt-8 text-center">
                  <p className="text-sm text-text-secondary">Ask about what&apos;s happening in your workspace.</p>
                  <p className="mt-2 text-[12px] text-text-tertiary">
                    &ldquo;How many orders are cooking?&rdquo; · &ldquo;Raise Filter Coffee to ₹60&rdquo;
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div className={m.role === "user" ? "max-w-[85%]" : "w-full"}>
                      <div
                        className={
                          m.role === "user"
                            ? "rounded-[18px] rounded-br-[6px] bg-[var(--brand)] px-3.5 py-2 text-[13px] text-white"
                            : `rounded-[18px] rounded-bl-[6px] px-3.5 py-2 text-[13px] ${
                                m.error ? "bg-danger-soft text-danger" : "bg-surface-2 text-text-primary"
                              }`
                        }
                      >
                        {m.content}
                      </div>
                      {m.proposals?.map((p) => (
                        <div key={p.itemId} className="mt-2">
                          <ProposalCard proposal={p} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {busy ? (
                <div className="flex items-center gap-2 text-[12px] text-text-tertiary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Ask the assistant…"
                  className="max-h-28 min-h-[42px] flex-1 resize-none rounded-[16px] border border-border bg-transparent px-3 py-2.5 text-[13px] text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-[var(--brand)]/70"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={busy || !input.trim()}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white transition hover:brightness-110 disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
