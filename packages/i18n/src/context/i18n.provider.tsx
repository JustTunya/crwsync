"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { SupportedLocale, TranslationKey, TranslationDictionary } from "../types";
import { en } from "../locales/en";
import { es } from "../locales/es";

const dictionaries: Record<SupportedLocale, TranslationDictionary> = { en, es };

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: unknown, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return typeof current === "string" ? current : null;
}

export function I18nProvider({
  children,
  defaultLocale = "en"
}: {
  children: React.ReactNode;
  defaultLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("crwsync_locale") as SupportedLocale;
      if (saved && dictionaries[saved]) {
        setLocaleState(saved);
      }
    } catch {}
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("crwsync_locale", newLocale);
      if (typeof document !== "undefined") {
        document.documentElement.lang = newLocale;
        document.documentElement.dir = newLocale === ("ar" as unknown) ? "rtl" : "ltr";
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === ("ar" as unknown) ? "rtl" : "ltr";
    }
  }, [locale]);

  const t = useMemo(() => {
    const dict = dictionaries[locale] || dictionaries.en;
    return (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text = getNestedValue(dict, key);
      if (!text) {
        text = getNestedValue(dictionaries.en, key);
      }
      if (!text) return key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = (text as string).replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return text;
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      dir: (locale === ("ar" as unknown) ? "rtl" : "ltr") as "ltr" | "rtl",
      isRtl: locale === ("ar" as unknown)
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
