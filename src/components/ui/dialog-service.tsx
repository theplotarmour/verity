"use client";

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Button, Input } from "./primitives";

// Native-feeling replacements for window.confirm / window.prompt.
//
// Browser dialogs break the PWA illusion: they use OS chrome, ignore the app
// theme, and on an installed PWA they can render off-brand or be suppressed
// entirely. These keep the same imperative API (await a promise) so call sites
// read almost identically, but render in-app with our theme.
//
// Mounted lazily into its own body node, mirroring how `toast` works.

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
};

type PromptOptions = {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  required?: boolean;
};

type Request =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void };

let pushRequest: ((r: Request) => void) | null = null;

function DialogHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    pushRequest = (r) => {
      setValue(r.kind === "prompt" ? r.opts.defaultValue ?? "" : "");
      setRequest(r);
    };
    return () => {
      pushRequest = null;
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(request.kind === "prompt" ? null : false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!request) return null;

  function close(result: boolean | string | null) {
    if (!request) return;
    if (request.kind === "confirm") request.resolve(result as boolean);
    else request.resolve(result as string | null);
    setRequest(null);
  }

  const isPrompt = request.kind === "prompt";
  const opts = request.opts as ConfirmOptions & PromptOptions;
  const danger = !isPrompt && (request.opts as ConfirmOptions).variant === "danger";
  const canSubmit = !isPrompt || !opts.required || value.trim().length > 0;

  const submit = () => {
    if (isPrompt) {
      if (!canSubmit) return;
      close(value);
    } else {
      close(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        onClick={() => close(isPrompt ? null : false)}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
        <div className="flex items-start gap-3 p-5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-danger-soft text-danger" : "bg-brand-soft text-[var(--brand)]"
            }`}
          >
            {danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-text-primary">{opts.title}</h2>
            {opts.description && <p className="mt-1 text-sm text-text-secondary">{opts.description}</p>}
            {isPrompt && (
              <form
                className="mt-3 space-y-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                {opts.label && (
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                    {opts.label}
                  </label>
                )}
                <Input
                  autoFocus
                  value={value}
                  placeholder={opts.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                />
              </form>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-surface-2/40 px-5 py-3.5">
          <Button size="sm" variant="secondary" onClick={() => close(isPrompt ? null : false)}>
            {opts.cancelLabel ?? "Cancel"}
          </Button>
          <Button size="sm" variant={danger ? "danger" : "primary"} disabled={!canSubmit} onClick={submit}>
            {opts.confirmLabel ?? (isPrompt ? "Save" : "Confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== "undefined") {
  const containerId = "verity-dialog-root";
  if (!document.getElementById(containerId)) {
    const container = document.createElement("div");
    container.id = containerId;
    document.body.appendChild(container);
    createRoot(container).render(<DialogHost />);
  }
}

/** Themed replacement for window.confirm — `if (await confirmDialog({...}))`. */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!pushRequest) return Promise.resolve(false);
  return new Promise((resolve) => pushRequest!({ kind: "confirm", opts, resolve }));
}

/** Themed replacement for window.prompt — resolves null when cancelled. */
export function promptDialog(opts: PromptOptions): Promise<string | null> {
  if (!pushRequest) return Promise.resolve(null);
  return new Promise((resolve) => pushRequest!({ kind: "prompt", opts, resolve }));
}
