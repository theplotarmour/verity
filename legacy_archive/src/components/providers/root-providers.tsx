"use client";

import { useEffect, type ReactNode } from "react";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { initPostHog } from "@/lib/posthog";
import { LanguageProvider } from "@/components/providers/language-provider";

export function RootProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <PwaProvider>
          {children}
        </PwaProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
