"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { ChatMessage } from "@/server/platform/agent-chat";

/**
 * The AI assistant — Task 84 area 6.
 *
 * A PERSISTENT SHELL REGION, not a modal (Task 81 rule 10). It stays mounted
 * across every page the shell renders; only its open/closed state changes,
 * which is why it lives here rather than behind a route. Docked bottom-right
 * rather than centred-overlay so it never blocks the page underneath while
 * open — a person can keep working while it answers.
 *
 * Executes with the same authority as the signed-in person (ADR-017): every
 * tool call the server route makes runs through the ordinary
 * `executeCommand`/`executeQuery` pipeline as this session's own actor.
 * Nothing here grants anything; it only gives that actor a conversational
 * way to call tools they already hold.
 */
export function AgentChatDock() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;

    const nextHistory = [...messages, { role: "user", content: text } satisfies ChatMessage];
    setMessages(nextHistory);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.message ?? "The assistant could not complete that request.");
        return;
      }
      setMessages([...nextHistory, { role: "assistant", content: json.data.reply } satisfies ChatMessage]);
    } catch {
      setError("Could not reach the assistant. Check your connection and try again.");
    } finally {
      setPending(false);
      queueMicrotask(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="agent-chat-panel"
        title="Assistant"
        className="glass-control fixed bottom-6 right-6 z-40 grid size-12 place-items-center rounded-full text-text-secondary shadow-lg transition-colors hover:text-text print:hidden"
      >
        <Icon name={open ? "close" : "assistant"} size={20} />
        <span className="sr-only">{open ? "Close assistant" : "Open assistant"}</span>
      </button>

      {open && (
        <div
          id="agent-chat-panel"
          role="complementary"
          aria-label="Assistant"
          className="glass-overlay fixed bottom-24 right-6 z-40 flex h-[min(560px,70dvh)] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl print:hidden"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5">
            <span className="text-[14px] font-medium text-text">Assistant</span>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-[13px] text-text-tertiary">
                Ask about your Work, Parties, or anything else in this workspace. I can only see
                and do what your own role can.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed " +
                  (m.role === "user"
                    ? "ml-auto bg-accent text-accent-on"
                    : "verity-solid text-text")
                }
              >
                {m.content}
              </div>
            ))}
            {pending && <p className="text-[13px] text-text-tertiary">Thinking…</p>}
            {error && <p className="text-[13px] text-danger">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex shrink-0 items-center gap-2 border-t border-line p-3"
          >
            <label htmlFor="agent-chat-input" className="sr-only">
              Message the assistant
            </label>
            <input
              id="agent-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the assistant…"
              disabled={pending}
              className="glass-control h-11 flex-1 rounded-lg px-3.5 text-[13.5px] text-text placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || input.trim().length === 0}
              className="bg-accent text-accent-on grid size-11 shrink-0 place-items-center rounded-lg font-medium transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Icon name="chevronRight" size={18} />
              <span className="sr-only">Send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
