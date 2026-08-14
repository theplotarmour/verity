"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/primitives";

type Suggestion = { packKey: string; label: string; modules: string[] } | null;

/**
 * Conversational pack finder (R5).
 *
 * The owner describes their business in their own words; the model maps it to one
 * of the real vertical packs. The wizard only *recommends* — applying a pack
 * changes entitlements, which is a guarded step in settings, so the last action
 * here is a link there rather than a silent write.
 */
export function OnboardingWizard() {
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "thinking" | "done" | "none">("idle");
  const [suggestion, setSuggestion] = useState<Suggestion>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = () => {
    if (!description.trim()) return;
    setState("thinking");
    setError(null);
    void fetch("/api/onboarding/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
          setState("idle");
          return;
        }
        setSuggestion(json.suggestion);
        setState(json.suggestion ? "done" : "none");
      })
      .catch(() => {
        setError("Something went wrong. Try again.");
        setState("idle");
      });
  };

  return (
    <div className="rounded-[24px] border border-border bg-surface p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
        <Sparkles className="h-4 w-4 text-[var(--brand)]" /> Set up your workspace
      </div>
      <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.03em] text-text-primary">
        What kind of business do you run?
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Describe it in a sentence — we&apos;ll match you to the right pack.
      </p>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. a small salon doing haircuts and colouring, mostly by appointment"
        className="mt-4 min-h-[88px] w-full rounded-[16px] border border-border bg-transparent px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-[var(--brand)]/70"
      />

      {error ? <p className="mt-2 text-[13px] font-medium text-danger">{error}</p> : null}

      <Button className="mt-3" disabled={state === "thinking" || !description.trim()} onClick={ask}>
        {state === "thinking" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
        {state === "thinking" ? "Thinking…" : "Suggest a pack"}
      </Button>

      {state === "done" && suggestion ? (
        <div className="mt-5 rounded-[16px] border border-[var(--brand)]/30 bg-accent-soft/40 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-strong">Recommended</p>
          <p className="mt-1 font-display text-lg font-semibold text-text-primary">{suggestion.label}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestion.modules.map((m) => (
              <span key={m} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-secondary">
                {m}
              </span>
            ))}
          </div>
          <Link
            href="/owner/settings"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--brand)] hover:underline"
          >
            Set this up in Settings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : state === "none" ? (
        <div className="mt-5 rounded-[16px] border border-border bg-surface-2 p-4 text-sm text-text-secondary">
          Nothing fit cleanly. Pick a pack yourself in{" "}
          <Link href="/owner/settings" className="font-semibold text-[var(--brand)] hover:underline">
            Settings
          </Link>
          .
        </div>
      ) : null}
    </div>
  );
}
