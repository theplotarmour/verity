"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Zap,
  Target,
  Home,
  Sparkles,
  Clock,
  User,
  CalendarDays,
  Users,
  ReceiptText,
  BarChart3,
  Settings,
  Search,
  Bell,
  ArrowRight,
  Delete,
  Loader2,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { motion } from "framer-motion";
import { authenticateUser } from "@/server/actions/auth";
import { VerityLogo } from "@/components/ui/VerityLogo";
import { cn } from "@/lib/utils";

const TAP_SPRING = { type: "spring" as const, stiffness: 300, damping: 20, mass: 0.4 };

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

  useEffect(() => {
    if (hasSession && role) {
      window.location.href = homePath || "/worker";
    }
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

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#0A0A0B] text-white selection:bg-[#FF1D2A]/30">
      {/* Ambient glowing canvas background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/30 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_12%_30%,rgba(255,29,42,0.15),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(255,29,42,0.08),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF1D2A]/40 to-transparent"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-4 py-6 sm:px-8 lg:px-12">
        {/* Topbar Header */}
        <header className="flex h-16 shrink-0 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VerityLogo size={32} />
            <span className="font-display text-lg font-bold tracking-[0.16em]">
              VERITY
              <span className="text-[#FF1D2A] ml-0.5">AI</span>
            </span>
          </div>
          <Link
            href="/guide"
            className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 text-[12px] font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>User Guide</span>
          </Link>
        </header>

        {/* Content Layout */}
        <div className="grid flex-1 items-center gap-12 py-6 lg:grid-cols-[1.1fr_1.9fr] lg:gap-10">
          {/* Left Column: Branding Claims */}
          <section className="flex flex-col justify-center text-left max-w-xl">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#FF1D2A] mb-3">
              One platform. Infinite possibilities.
            </h2>
            <h1 className="font-display text-[clamp(34px,4.5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.04em] text-white">
              THE OPERATING
              <br />
              SYSTEM FOR
              <br />
              <span className="bg-gradient-to-r from-[#FF1D2A] via-[#FF5E69] to-[#E11D2A] bg-clip-text text-transparent">
                MODERN
                <br />
                ORGANIZATIONS
              </span>
            </h1>

            <p className="mt-6 text-[15px] leading-relaxed text-white/60 font-light">
              VerityAI understands your entire organization, turns complexity into clarity, and helps you operate, automate and evolve — every day.
            </p>

            {/* Three Pillar Cards */}
            <div className="mt-8 space-y-3.5">
              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.01] p-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF1D2A]/10 border border-[#FF1D2A]/20">
                  <TrendingUp className="h-5 w-5 text-[#FF1D2A]" />
                </div>
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/90">Operate</h4>
                  <p className="text-[13px] text-white/50">Run your business with clarity.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.01] p-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF1D2A]/10 border border-[#FF1D2A]/20">
                  <Zap className="h-5 w-5 text-[#FF1D2A]" />
                </div>
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/90">Automate</h4>
                  <p className="text-[13px] text-white/50">Intelligent workflows that run for you.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.01] p-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF1D2A]/10 border border-[#FF1D2A]/20">
                  <Target className="h-5 w-5 text-[#FF1D2A]" />
                </div>
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/90">Evolve</h4>
                  <p className="text-[13px] text-white/50">AI insights that help you grow.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Premium Floating Glassmorphic Tablet Console */}
          <section className="relative w-full overflow-hidden rounded-[32px] border border-white/10 bg-black/40 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-md lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row">
              {/* Sidebar Nav Rail inside Tablet */}
              <aside className="hidden shrink-0 flex-row gap-3 rounded-[20px] border border-white/5 bg-white/[0.02] p-2.5 lg:flex lg:flex-col lg:items-center lg:gap-5 lg:p-4">
                <VerityLogo size={20} />
                <div className="flex flex-row gap-2 lg:flex-col lg:gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF1D2A]/10 text-[#FF1D2A]"><Home className="h-4.5 w-4.5" /></div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40"><Sparkles className="h-4.5 w-4.5" /></div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40"><Clock className="h-4.5 w-4.5" /></div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40"><CalendarDays className="h-4.5 w-4.5" /></div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40"><User className="h-4.5 w-4.5" /></div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40"><Users className="h-4.5 w-4.5" /></div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40"><ReceiptText className="h-4.5 w-4.5" /></div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40"><BarChart3 className="h-4.5 w-4.5" /></div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40"><Settings className="h-4.5 w-4.5" /></div>
                </div>
                <div className="mt-auto hidden h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5 lg:block" />
              </aside>

              {/* Main Content Area of Tablet */}
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {/* Header Row */}
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold tracking-[0.16em] text-white">VERITY<span className="text-[#FF1D2A]">AI</span></span>
                  </div>

                  {/* Search bar mock */}
                  <div className="relative hidden w-full max-w-[200px] sm:block">
                    <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
                    <div className="h-7 w-full rounded-md border border-white/5 bg-white/[0.03] pl-8 pr-10 text-[11px] text-white/30 flex items-center justify-between">
                      <span>Search anything...</span>
                      <span className="font-mono text-[9px] bg-white/5 px-1 py-0.5 rounded border border-white/5">⌘K</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1 text-[11px] font-semibold text-white/70">
                      Acme Industries ▾
                    </div>
                    <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 text-white/40">
                      <Bell className="h-3.5 w-3.5" />
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#FF1D2A]" />
                    </div>
                    <div className="h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-white/5" />
                  </div>
                </header>

                {/* Subtitle & Header Actions */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">Good morning, Alex.</h3>
                    <p className="text-xs text-white/40">Here&apos;s what <span className="text-[#FF1D2A]">VerityAI</span> found across your organization.</p>
                  </div>
                  <button className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#FF1D2A] px-4 py-1 text-[11px] font-semibold text-white shadow-[0_4px_16px_rgba(255,29,42,0.25)] transition hover:brightness-110 active:scale-95">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Command Center</span>
                  </button>
                </div>

                {/* Center Console: Keypad Login or Main Mock Dashboard */}
                <div className="relative min-h-[290px] w-full">
                  {!hasSession ? (
                    /* The Embedded Login Keypad inside the central console block */
                    <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] items-stretch">
                      {/* Left: Phone/PIN fields */}
                      <div className="flex flex-col justify-center rounded-[20px] border border-white/10 bg-[#0B0B0C]/40 p-5 backdrop-blur-md">
                        <h4 className="font-display text-[14px] font-bold uppercase tracking-[0.16em] text-white/80">
                          Security Authentication
                        </h4>
                        <p className="text-[11px] text-white/40 mt-1">Enter credentials to unlock Verity console.</p>

                        <div className="mt-5 space-y-3">
                          <div
                            onClick={() => setFocusedInput("phone")}
                            className={cn(
                              "flex min-h-[52px] cursor-text items-center gap-3 rounded-xl border px-3 transition",
                              focusedInput === "phone"
                                ? "border-[#FF1D2A]/50 bg-white/[0.04]"
                                : "border-white/5 bg-white/[0.01] hover:border-white/10"
                            )}
                          >
                            <span className="w-10 text-[9px] font-bold uppercase tracking-wider text-white/40">
                              Phone
                            </span>
                            <input
                              type="tel"
                              value={phone}
                              onFocus={() => setFocusedInput("phone")}
                              onChange={(e) => setPhone(e.currentTarget.value.replace(/\D/g, "").slice(0, 10))}
                              placeholder="0000000000"
                              className="w-full bg-transparent font-mono text-[15px] tracking-wider text-white outline-none placeholder:text-white/20"
                            />
                          </div>

                          <div
                            onClick={() => setFocusedInput("pin")}
                            className={cn(
                              "flex min-h-[52px] cursor-text items-center gap-3 rounded-xl border px-3 transition",
                              focusedInput === "pin"
                                ? "border-[#FF1D2A]/50 bg-white/[0.04]"
                                : "border-white/5 bg-white/[0.01] hover:border-white/10"
                            )}
                          >
                            <span className="w-10 text-[9px] font-bold uppercase tracking-wider text-white/40">
                              PIN
                            </span>
                            <div className="flex items-center gap-2.5">
                              {[0, 1, 2, 3].map((i) => (
                                <motion.span
                                  key={i}
                                  animate={
                                    pin[i]
                                      ? { scale: 1, backgroundColor: "#FF1D2A" }
                                      : { scale: 0.8, backgroundColor: "rgba(255,255,255,0.12)" }
                                  }
                                  transition={TAP_SPRING}
                                  className="h-2.5 w-2.5 rounded-full bg-white/10"
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {error ? (
                          <p role="alert" className="mt-3 text-center text-[11px] font-medium text-[#FF6B74]">
                            {error}
                          </p>
                        ) : null}
                      </div>

                      {/* Right: Keypad Grid */}
                      <div className="grid grid-cols-3 gap-2 rounded-[20px] border border-white/5 bg-white/[0.01] p-3">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => press(n)}
                            className="flex h-11 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] font-display text-[15px] font-medium text-white transition hover:bg-white/[0.05]"
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={backspace}
                          className="flex h-11 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-white/40 transition hover:bg-white/[0.05]"
                        >
                          <Delete className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => press("0")}
                          className="flex h-11 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] font-display text-[15px] font-medium text-white transition hover:bg-white/[0.05]"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          disabled={!ready || isPending}
                          onClick={() => void submitLogin(phone, pin)}
                          className="flex h-11 items-center justify-center rounded-xl bg-[#FF1D2A] text-white transition disabled:opacity-20"
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Dashboard Mock Layout matching the image exactly */
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Operational Health main panel with circular gauge */}
                      <div className="rounded-[20px] border border-white/10 bg-[#0B0B0C]/40 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Operational Health</p>
                        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                          {/* Radial Gauge */}
                          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-[#FF1D2A]/10 shadow-[0_0_20px_rgba(255,29,42,0.15)]" />
                            {/* Glow accent ring */}
                            <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#FF1D2A]/40" />
                            <div className="text-center z-10">
                              <span className="font-display text-4xl font-extrabold tracking-tight text-white">87%</span>
                              <span className="block text-[10px] font-bold uppercase text-[#34D399] tracking-wider mt-0.5">Healthy</span>
                            </div>
                          </div>

                          {/* Details breakdown */}
                          <div className="flex-1 space-y-2 w-full text-xs font-medium text-white/60">
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span>People</span>
                              <span className="text-[#34D399] font-mono">84% ↑</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span>Operations</span>
                              <span className="text-[#34D399] font-mono">92% ↑</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span>Customers</span>
                              <span className="text-[#34D399] font-mono">89% ↑</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span>Finance</span>
                              <span className="text-[#FF6B74] font-mono">81% ↓</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Automation</span>
                              <span className="text-[#34D399] font-mono">96% ↑</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Needs Attention panel */}
                      <div className="rounded-[20px] border border-white/10 bg-[#0B0B0C]/40 p-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Needs Attention</p>
                          <span className="text-[10px] text-white/30 hover:text-white cursor-pointer">View all</span>
                        </div>
                        <div className="mt-3 space-y-2.5">
                          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-2.5">
                            <div>
                              <span className="text-[9px] font-bold uppercase text-[#FF6B74] tracking-wider">High Priority</span>
                              <p className="text-[12px] font-semibold text-white mt-0.5">3 workflows are blocked</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-white/30" />
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-2.5">
                            <div>
                              <span className="text-[9px] font-bold uppercase text-[#FB923C] tracking-wider">Medium Priority</span>
                              <p className="text-[12px] font-semibold text-white mt-0.5">Revenue anomaly detected</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-white/30" />
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-2.5">
                            <div>
                              <span className="text-[9px] font-bold uppercase text-[#FB923C] tracking-wider">Medium Priority</span>
                              <p className="text-[12px] font-semibold text-white mt-0.5">Capacity risk</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-white/30" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer info */}
        <footer className="flex h-16 shrink-0 items-center justify-between border-t border-white/5 text-[9px] uppercase tracking-[0.25em] text-white/20 mt-6">
          <span>VerityAI Platform</span>
          <span className="hidden sm:inline">COMPOSABLE WORKFLOWS. COMPACT CODES.</span>
        </footer>
      </div>
    </main>
  );
}
