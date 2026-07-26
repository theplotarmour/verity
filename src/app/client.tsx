"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Factory, Loader2, Delete, Home, CircleCheckBig, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticateUser } from "@/server/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { VerityLogo } from "@/components/ui/VerityLogo";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export function HomeClient({ hasSession, role, homePath }: { hasSession: boolean; role?: string; homePath?: string }) {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [focusedInput, setFocusedInput] = useState<"phone" | "pin">("phone");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [showSplash, setShowSplash] = useState(true);
  const splashRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(splashRef.current, {
            opacity: 0,
            y: -50,
            duration: 0.4,
            ease: "power2.inOut",
            onComplete: () => setShowSplash(false)
          });
        }
      });

      tl.to(textRef.current, {
        duration: 0.3,
        opacity: 0,
        scale: 0.9,
        delay: 0.4
      })
      .set(textRef.current, {
        innerText: "Vision For Enterprise Digital Advancement",
        style: "font-size: clamp(1.2rem, 3.5vw, 2rem); font-weight: 800; letter-spacing: 0.05em; line-height: 1.2;",
      })
      .to(textRef.current, {
        duration: 0.8,
        opacity: 1,
        scale: 1,
        ease: "power3.out"
      })
      .to(textRef.current, {
        duration: 0.4,
        opacity: 0,
        delay: 0.8
      });
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!showSplash && hasSession && role) {
      window.location.href = homePath || "/worker";
    }
  }, [hasSession, role, showSplash, homePath]);

  async function submitLogin(currentPhone: string, currentPin: string) {
    if (!currentPhone || currentPin.length < 4) {
      setError("Please enter both Phone and 4-Digit PIN");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const res = await authenticateUser(currentPhone, currentPin);
        if (res?.error) {
          setError(res.error);
          setPin(""); // Clear pin on error
        } else if (res?.success && res.redirectUrl) {
          window.location.href = res.redirectUrl;
        }
      } catch (e: any) {
        setError("An unexpected error occurred.");
        setPin("");
      }
    });
  }

  const handleNumpad = (num: string) => {
    if (focusedInput === "phone") {
      if (phone.length < 10) {
        setPhone(prev => prev + num);
        setError("");
      } else {
        // Auto focus to pin if phone filled
        setFocusedInput("pin");
        setPin(prev => (prev.length < 4 ? prev + num : prev));
      }
    } else {
      if (pin.length < 4) {
        setPin(prev => prev + num);
        setError("");
      }
    }
  };

  const handleBackspace = () => {
    if (focusedInput === "pin") {
      if (pin.length > 0) {
        setPin(prev => prev.slice(0, -1));
      } else {
        setFocusedInput("phone");
        setPhone(prev => prev.slice(0, -1));
      }
    } else {
      setPhone(prev => prev.slice(0, -1));
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <div
            ref={splashRef}
            className="fixed inset-0 z-50 bg-[#F5F5F7] dark:bg-black flex items-center justify-center text-text-primary"
          >
            <div
              ref={textRef}
              className="text-4xl md:text-5xl font-display font-black tracking-[0.2em] uppercase select-none text-center px-6 max-w-2xl text-text-primary dark:text-white"
            >
              Verity
            </div>
          </div>
        )}
      </AnimatePresence>

      <main className="h-screen w-full overflow-hidden bg-[#F5F5F7] dark:bg-black flex relative select-none">
        {/* Theme button */}
        <div className="absolute top-4 right-4 z-30">
          <ThemeToggle />
        </div>

        {/* ==================================================
            DESKTOP & LAPTOP LAYOUT (md and up)
            ================================================== */}
        <div className="hidden md:flex flex-1 w-full h-full min-w-0">
          {/* Left Column (55%): Hero */}
          <div className="w-[55%] h-full flex flex-col justify-between p-12 bg-[#F5F5F7] dark:bg-neutral-900 border-r border-border shrink-0 min-w-0">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <VerityLogo size={34} colorClass="text-text-primary dark:text-white" />
              <span className="font-display font-bold text-base tracking-[0.1em] text-text-primary">Verity</span>
            </div>

            {/* Middle copy */}
            <div className="max-w-md space-y-3">
              <h1 className="text-4xl lg:text-[48px] font-display font-bold tracking-tight text-text-primary leading-[1.1]">
                Factory Intelligence OS
              </h1>
              <p className="text-sm text-text-secondary font-medium uppercase tracking-[0.1em]">
                Production • Quality • Verification
              </p>
            </div>


          </div>

          {/* Right Column (45%): Centered Login Card */}
          <div className="w-[45%] h-full flex items-center justify-center p-8 bg-white dark:bg-black shrink-0 min-w-0">
            <div className="w-full max-w-[420px] space-y-8 flex flex-col justify-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">Login to Verity</h2>
                <p className="text-xs text-text-secondary mt-1">Enter your phone and passcode lock PIN to sign in.</p>
              </div>

              {/* Form Input Panel */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onFocus={() => setFocusedInput("phone")}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Enter phone number"
                    className={cn(
                      "h-14 w-full bg-white dark:bg-neutral-900 border border-border rounded-xl px-4 text-center text-[17px] font-mono focus:outline-none transition-all",
                      focusedInput === "phone" ? "ring-2 ring-accent border-transparent" : ""
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">4-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onFocus={() => setFocusedInput("pin")}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setPin(val);
                      if (val.length === 4 && phone.length === 10) {
                        void submitLogin(phone, val);
                      }
                    }}
                    placeholder="••••"
                    className={cn(
                      "h-14 w-full bg-white dark:bg-neutral-900 border border-border rounded-xl px-4 text-center text-2xl font-mono tracking-widest focus:outline-none transition-all",
                      focusedInput === "pin" ? "ring-2 ring-accent border-transparent" : ""
                    )}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-danger-soft border border-danger/10 text-danger text-xs font-semibold text-center rounded-xl animate-in fade-in">
                  {error}
                </div>
              )}

              {/* Desktop Numpad (Keypad: 72x56, gap 12) */}
              <div className="flex justify-center shrink-0">
                <div className="grid grid-cols-3 gap-3 w-fit">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumpad(num.toString())}
                      className="w-[72px] h-14 rounded-xl bg-surface-2 hover:bg-border text-lg font-bold text-text-primary transition flex items-center justify-center"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="w-[72px] h-14 rounded-xl bg-surface-2 hover:bg-border text-text-secondary flex items-center justify-center transition"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpad("0")}
                    className="w-[72px] h-14 rounded-xl bg-surface-2 hover:bg-border text-lg font-bold text-text-primary transition flex items-center justify-center"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    disabled={isPending || phone.length < 10 || pin.length < 4}
                    onClick={() => void submitLogin(phone, pin)}
                    className="w-[72px] h-14 rounded-xl bg-accent disabled:opacity-40 text-white flex items-center justify-center transition"
                  >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            MOBILE NATIVE VIEW (under md)
            ================================================== */}
        <div className="flex md:hidden flex-col justify-between w-full h-full p-6 bg-[#F5F5F7] dark:bg-black">
          {/* Top Logo */}
          <div className="flex justify-between items-center shrink-0">
            <div className="flex items-center gap-1.5">
              <VerityLogo size={28} colorClass="text-text-primary dark:text-white" />
              <span className="font-display font-bold text-xs tracking-wider text-text-primary">Verity</span>
            </div>
          </div>

          {/* Middle: Passcode Input Screen */}
          <div className="space-y-6 flex-grow flex flex-col justify-center max-w-sm mx-auto w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">Welcome Back</h2>
              <p className="text-xs text-text-secondary mt-1">Enter credentials to unlock system</p>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <input
                type="tel"
                value={phone}
                onFocus={() => setFocusedInput("phone")}
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Phone number"
                className={cn(
                  "h-12 w-full bg-white dark:bg-neutral-900 border border-border rounded-xl px-4 text-center text-base font-mono focus:outline-none transition-all",
                  focusedInput === "phone" ? "ring-2 ring-accent border-transparent" : ""
                )}
              />

              {/* Passcode dots display */}
              <div className="flex flex-col items-center space-y-2.5">
                <p className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Enter Passcode PIN</p>
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border border-border transition-all duration-200",
                        pin[i] 
                          ? "bg-text-primary border-transparent scale-110" 
                          : "bg-transparent"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-danger-soft border border-danger/10 text-danger text-xs font-semibold text-center rounded-xl">
                {error}
              </div>
            )}
          </div>

          {/* Bottom Custom Mobile Pad & Action */}
          <div className="space-y-5 shrink-0">
            {/* Keypad Layout: button width 30vw max-96px, height 64px, gap 12px */}
            <div className="flex justify-center w-full">
              <div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumpad(num.toString())}
                    className="h-14 rounded-2xl bg-white dark:bg-neutral-900 text-xl font-bold text-text-primary transition flex items-center justify-center border border-border"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-14 rounded-2xl bg-white dark:bg-neutral-900 text-text-secondary flex items-center justify-center transition border border-border"
                >
                  <Delete className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpad("0")}
                  className="h-14 rounded-2xl bg-white dark:bg-neutral-900 text-xl font-bold text-text-primary transition flex items-center justify-center border border-border"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isPending || phone.length < 10 || pin.length < 4}
                  onClick={() => void submitLogin(phone, pin)}
                  className="h-14 rounded-2xl bg-accent disabled:opacity-40 text-white flex items-center justify-center transition border border-transparent shadow"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile primary continue button */}
            <button
              onClick={() => void submitLogin(phone, pin)}
              disabled={isPending || phone.length < 10 || pin.length < 4}
              className="w-full h-13 rounded-2xl bg-text-primary text-background font-bold text-sm tracking-wide transition active:scale-98 disabled:opacity-30 flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : "Unlock Operating System"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
