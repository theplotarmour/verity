"use client";

import { useEffect, useState } from "react";
import { usePwa } from "@/components/providers/pwa-provider";
import { Download, X, Smartphone, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/primitives";

export function InstallPromptBanner({ accentColor = "#007AFF" }: { accentColor?: string }) {
  const { canInstall, install } = usePwa();
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if running in standalone/app mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      return;
    }

    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem("verity_install_prompt_dismissed");
    if (dismissed === "true") {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Show prompt if we can install or if it's iOS (for manual install helper)
    if (canInstall || ios) {
      // Small timeout for smooth slide-in after load
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("verity_install_prompt_dismissed", "true");
  };

  const handleInstall = async () => {
    await install();
    // Dismiss after successful prompt trigger
    setIsVisible(false);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed left-4 right-4 top-4 z-[9999] mx-auto max-w-lg md:left-auto md:right-6 md:top-6"
        >
          <div 
            className="relative flex flex-col gap-3.5 overflow-hidden rounded-[24px] border border-border/80 bg-white/90 dark:bg-neutral-900/90 p-4.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
            style={{ "--brand": accentColor } as React.CSSProperties}
          >
            {/* Soft decorative background glow matching brand color */}
            <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-[var(--brand)]/10 blur-2xl" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-text-primary">Install Verity on your device</h4>
                  <p className="mt-0.5 text-xs font-medium text-text-secondary leading-normal">
                    Add Verity to your home screen for rapid offline-first floor inspections.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-secondary/40 text-text-secondary transition-all hover:bg-surface-secondary/80 hover:text-text-primary cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={handleDismiss}
                className="px-3.5 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                Maybe later
              </button>
              
              {canInstall ? (
                <Button
                  onClick={handleInstall}
                  className="h-8.5 px-4 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install App
                </Button>
              ) : isIOS ? (
                <div className="flex items-center gap-1.5 rounded-xl bg-brand/5 border border-brand/10 p-2 text-[10px] text-text-secondary">
                  <Info className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span>Tap Share icon and select <strong>"Add to Home Screen"</strong></span>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
