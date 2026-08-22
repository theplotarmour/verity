"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaContextValue {
  online: boolean;
  canInstall: boolean;
  install: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        // updateViaCache: "none" makes the browser always fetch a fresh sw.js,
        // so a stale worker can't keep serving old app chunks (which surfaces
        // as endless reload/chunk-load-error loops after a deploy).
        navigator.serviceWorker
          .register("/sw.js", { updateViaCache: "none" })
          .catch(() => undefined);
      } else {
        // Serwist is disabled in development, but a worker registered by an
        // earlier production build can still control localhost and serve stale
        // cached pages — the classic cause of the app reloading repeatedly.
        // Unregister it and drop its caches.
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => {
            registrations.forEach((registration) => void registration.unregister());
          })
          .catch(() => undefined);
        if ("caches" in window) {
          caches.keys().then((keys) => keys.forEach((key) => void caches.delete(key))).catch(() => undefined);
        }
      }
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handlePrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  const value = useMemo(
    () => ({
      online,
      canInstall: Boolean(promptEvent),
      install: async () => {
        if (!promptEvent) {
          return;
        }

        await promptEvent.prompt();
        await promptEvent.userChoice;
        setPromptEvent(null);
      },
    }),
    [online, promptEvent],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);

  if (!context) {
    throw new Error("usePwa must be used inside PwaProvider");
  }

  return context;
}
