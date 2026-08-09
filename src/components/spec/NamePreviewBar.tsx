"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The item's name and code assembling live as the owner fills the form.
 *
 * Sticky and glass-backed so it stays readable over the specification grid — on
 * a long spec sheet the identity is the one thing that must never scroll away,
 * because it is how the owner catches a wrong dropdown before saving.
 */
export function NamePreviewBar({ name, code }: { name: string; code: string }) {
  const [pulse, setPulse] = useState(false);
  const previous = useRef(name + code);

  useEffect(() => {
    const next = name + code;
    if (next === previous.current) return;
    previous.current = next;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 450);
    return () => clearTimeout(t);
  }, [name, code]);

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-surface/90 px-6 py-4 backdrop-blur-md">
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        Item identity
      </div>
      <div
        className={`text-lg font-bold transition-colors duration-300 ${
          pulse ? "text-[var(--brand)]" : "text-text-primary"
        }`}
      >
        {name || <span className="text-text-tertiary">Fill the specification below…</span>}
        {name && <span className="animate-pulse text-text-tertiary">▊</span>}
      </div>
      <div
        className={`mt-1 font-mono text-xs transition-colors duration-300 ${
          pulse ? "text-[var(--brand)]" : "text-text-secondary"
        }`}
      >
        {code || "—"}
      </div>
    </div>
  );
}
