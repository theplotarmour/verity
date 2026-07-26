"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dictionaries, getDictionary, type Language } from "@/lib/i18n";
import { getUserLanguage } from "@/server/actions/user";

type LanguageContextValue = {
  language: Language;
  dictionary: (typeof dictionaries)[Language];
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLanguage = "en",
  children,
}: {
  initialLanguage?: string | null;
  children: ReactNode;
}) {
  const [language, setLanguage] = useState<Language>(
    initialLanguage === "hi" ? initialLanguage : "en",
  );

  useEffect(() => {
    if (initialLanguage) {
      setLanguage(initialLanguage === "hi" ? initialLanguage : "en");
      return;
    }
    void getUserLanguage().then((savedLanguage) => {
      if (savedLanguage === "hi" || savedLanguage === "en") {
        setLanguage(savedLanguage);
      }
    });
  }, [initialLanguage]);

  const value = useMemo(
    () => ({ language, dictionary: getDictionary(language), setLanguage }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
