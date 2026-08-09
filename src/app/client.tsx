"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Delete, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { authenticateUser } from "@/server/actions/auth";
import { VerityLogo } from "@/components/ui/VerityLogo";
import { cn } from "@/lib/utils";

/**
 * The front door.
 *
 * Committed to dark. The brand is scarlet on near-black, and a theme-switching
 * marketing page means designing the same surface twice and getting one of
 * them wrong. The app behind the login is still fully themed; this page is not
 * the app.
 *
 * Motion is split deliberately. Anything that gates whether content is
 * *visible* — the two hero entrances — is a CSS keyframe with `fill: both`, so
 * the copy cannot end up stranded at opacity 0 if JS is slow, blocked or
 * fails to hydrate. Anything that responds to a *gesture* is framer-motion,
 * because a keypad is a physical control and a stiff spring reads as a button
 * going down where an eased transition reads as a lagging animation.
 */

const TAP_SPRING = { type: "spring" as const, stiffness: 300, damping: 20, mass: 0.4 };

type Workspace = "service" | "production";

const WORKSPACES: Record<
  Workspace,
  { label: string; blurb: string; chain: string[]; modules: string[] }
> = {
  service: {
    label: "Service organisation",
    blurb:
      "Facility management, security, staffing, maintenance. Work happens at a client's site, and the SLA is the product.",
    chain: ["Client", "Site", "Deployment", "Ticket", "Work order", "Invoice"],
    modules: ["Sites", "Scheduling", "Helpdesk", "Assets", "Projects", "Billing"],
  },
  production: {
    label: "Production factory",
    blurb:
      "Components, garments, furniture, fabrication. Work happens on your floor, and the traveller is the product.",
    chain: ["Customer", "Order", "Plan", "Job card", "QC", "Dispatch"],
    modules: ["Inventory", "Manufacturing", "Quality", "Procurement", "Sales", "Reports"],
  },
};

export function HomeClient({
  hasSession,
  role,
  homePath,
}: {
  hasSession: boolean;
  role?: string;
  homePath?: string;
}) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [focusedInput, setFocusedInput] = useState<"phone" | "pin">("phone");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [workspace, setWorkspace] = useState<Workspace>("service");

  useEffect(() => {
    if (hasSession && role) window.location.href = homePath || "/worker";
  }, [hasSession, role, homePath]);

  async function submitLogin(currentPhone: string, currentPin: string) {
    if (currentPhone.length < 10 || currentPin.length < 4) {
      setError("Enter your phone number and 4-digit PIN.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const res = await authenticateUser(currentPhone, currentPin);
        if (res?.error) {
          setError(res.error);
          setPin("");
        } else if (res?.success && res.redirectUrl) {
          window.location.href = res.redirectUrl;
        }
      } catch {
        setError("Something went wrong. Try again.");
        setPin("");
      }
    });
  }

  function press(num: string) {
    setError("");
    if (focusedInput === "phone" && phone.length < 10) {
      const next = phone + num;
      setPhone(next);
      // Ten digits is a complete Indian mobile number, so the caret moves on
      // by itself rather than making someone reach for the next field.
      if (next.length === 10) setFocusedInput("pin");
      return;
    }
    if (pin.length < 4) {
      const next = pin + num;
      setPin(next);
      setFocusedInput("pin");
      if (next.length === 4 && phone.length === 10) void submitLogin(phone, next);
    }
  }

  function backspace() {
    setError("");
    if (focusedInput === "pin") {
      if (pin.length > 0) {
        setPin(pin.slice(0, -1));
        return;
      }
      setFocusedInput("phone");
      setPhone(phone.slice(0, -1));
      return;
    }
    setPhone(phone.slice(0, -1));
  }

  const ready = phone.length === 10 && pin.length === 4;
  const active = WORKSPACES[workspace];

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#0A0A0B] text-white selection:bg-[#FF1D2A]/30">
      {/* Ambient field. Two radial washes and a hairline sweep — enough to stop
          the page reading as a flat black rectangle, not enough to compete
          with the type. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-900/25 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(255,29,42,0.10),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF1D2A]/40 to-transparent"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex h-20 shrink-0 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VerityLogo size={30} />
            <span className="font-display text-[15px] font-semibold tracking-[0.16em]">
              VERITY
              <span className="align-super text-[8px] text-white/40">AI</span>
            </span>
          </div>
          <Link
            href="/guide"
            className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-[12px] font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">User guide</span>
          </Link>
        </header>

        {/* Hero */}
        <div className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:gap-16 lg:py-4">
          {/* Left: the claim */}
          <section className="verity-rise max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
              The operating system for modern organizations
            </p>

            <h1 className="mt-5 font-display text-[clamp(38px,6.2vw,68px)] font-semibold leading-[0.98] tracking-[-0.045em]">
              One platform
              <br />
              for the whole
              <br />
              <span className="bg-gradient-to-br from-[#FF1D2A] via-[#FF4C57] to-[#B80D1E] bg-clip-text text-transparent">
                operation.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/55">
              Workforce, work orders, production, quality, inventory, clients and
              compliance. The nouns change by industry. The system doesn&apos;t.
            </p>

            <div className="mt-8 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">
              <span>Operate</span>
              <Dot />
              <span>Automate</span>
              <Dot />
              <span>Evolve</span>
            </div>

            {/* Workspace switch */}
            <div className="mt-12">
              {/* Equal-width grid so one pill can slide between the two on a
                  transform alone. Sizing the pill to each label would mean
                  measuring the DOM, and the widths differ. */}
              <div className="relative grid w-full max-w-md grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[#FF1D2A] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ transform: workspace === "service" ? "none" : "translateX(100%)" }}
                />
                {(Object.keys(WORKSPACES) as Workspace[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setWorkspace(key)}
                    aria-pressed={workspace === key}
                    className={cn(
                      "relative min-h-11 rounded-full px-3 text-[12px] font-semibold transition-colors",
                      workspace === key ? "text-white" : "text-white/45 hover:text-white/70",
                    )}
                  >
                    {WORKSPACES[key].label}
                  </button>
                ))}
              </div>

              <div className="relative mt-4 min-h-[184px]">
                {/* Keyed remount with a CSS entrance rather than
                    AnimatePresence. Nothing needs to animate *out* here, and
                    skipping the exit phase means the panel is never waiting on
                    an animation callback to reveal the next one. */}
                <div
                  key={workspace}
                  className="verity-slide-in rounded-2xl border border-white/8 bg-white/[0.02] p-5 backdrop-blur-sm"
                >
                    <p className="text-[13px] leading-relaxed text-white/55">{active.blurb}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 font-mono text-[10.5px] text-white/70">
                      {active.chain.map((step, i) => (
                        <span key={step} className="flex items-center gap-1.5">
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                            {step}
                          </span>
                          {i < active.chain.length - 1 ? (
                            <span className="text-[#FF1D2A]/60">&rarr;</span>
                          ) : null}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {active.modules.map((m) => (
                        <span
                          key={m}
                          className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: the login card */}
          <section
            className="verity-rise w-full lg:justify-self-end"
            style={{ animationDelay: "100ms" }}
          >
            <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-6 shadow-2xl backdrop-blur-md sm:p-7">
              <h2 className="font-display text-[19px] font-semibold tracking-[-0.02em]">
                Sign in
              </h2>
              <p className="mt-1 text-[12.5px] text-white/45">
                Your phone number and 4-digit PIN.
              </p>

              <div className="mt-6 space-y-3">
                <Slot
                  label="Phone"
                  focused={focusedInput === "phone"}
                  onFocus={() => setFocusedInput("phone")}
                >
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onFocus={() => setFocusedInput("phone")}
                    onChange={(e) =>
                      setPhone(e.currentTarget.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="0000000000"
                    className="w-full bg-transparent font-mono text-[17px] tracking-[0.12em] text-white placeholder:text-white/20 focus:outline-none"
                  />
                </Slot>

                <Slot
                  label="PIN"
                  focused={focusedInput === "pin"}
                  onFocus={() => setFocusedInput("pin")}
                >
                  <div className="flex h-[26px] items-center gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.span
                        key={i}
                        animate={
                          pin[i]
                            ? { scale: 1, backgroundColor: "#FF1D2A" }
                            : { scale: 0.72, backgroundColor: "rgba(255,255,255,0.14)" }
                        }
                        transition={TAP_SPRING}
                        className="h-3 w-3 rounded-full bg-white/15"
                      />
                    ))}
                  </div>
                </Slot>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="verity-fade-in mt-3 text-center text-[12px] font-medium text-[#FF6B74]"
                >
                  {error}
                </p>
              ) : null}

              {/* Keypad */}
              <div className="mt-6 grid grid-cols-3 gap-2.5">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                  <Key key={n} onPress={() => press(n)}>
                    {n}
                  </Key>
                ))}
                <Key onPress={backspace} muted>
                  <Delete className="h-[18px] w-[18px]" />
                </Key>
                <Key onPress={() => press("0")}>0</Key>
                <motion.button
                  type="button"
                  whileTap={ready && !isPending ? { scale: 0.95 } : undefined}
                  transition={TAP_SPRING}
                  disabled={!ready || isPending}
                  onClick={() => void submitLogin(phone, pin)}
                  aria-label="Sign in"
                  className="flex h-14 items-center justify-center rounded-xl bg-[#FF1D2A] text-white shadow-[0_6px_20px_-8px_#FF1D2A] transition-opacity disabled:opacity-25 disabled:shadow-none"
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </motion.button>
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-white/25">
              Trouble signing in? Ask your workspace owner to reset your PIN.
            </p>
          </section>
        </div>

        <footer className="flex h-16 shrink-0 items-center justify-between border-t border-white/5 text-[10px] uppercase tracking-[0.2em] text-white/25">
          <span>VerityAI</span>
          <span className="hidden sm:inline">Built for scale. Adapted for people.</span>
        </footer>
      </div>
    </main>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-[#FF1D2A]" />;
}

function Slot({
  label,
  focused,
  onFocus,
  children,
}: {
  label: string;
  focused: boolean;
  onFocus: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onFocus}
      className={cn(
        "flex min-h-[64px] cursor-text items-center gap-4 rounded-xl border px-4 transition-colors",
        focused
          ? "border-[#FF1D2A]/50 bg-white/[0.04]"
          : "border-white/8 bg-white/[0.02] hover:border-white/15",
      )}
    >
      <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Key({
  children,
  onPress,
  muted,
}: {
  children: React.ReactNode;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      whileTap={{ scale: 0.95 }}
      transition={TAP_SPRING}
      className={cn(
        // 56px tall: comfortably past the 44px floor, and the row still fits a
        // small phone in portrait.
        "flex h-14 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] font-display text-[19px] font-medium tabular-nums transition-colors hover:border-white/15 hover:bg-white/[0.06]",
        muted ? "text-white/45" : "text-white",
      )}
    >
      {children}
    </motion.button>
  );
}
