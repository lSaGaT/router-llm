"use client";

/**
 * Language provider — keeps the active locale in React state, persists it
 * to localStorage, and exposes a `t()` function for looking up nested keys.
 *
 * Usage:
 *   // wrap the app once at the root
 *   <LanguageProvider> {children} </LanguageProvider>
 *
 *   // then in any component
 *   const { t, locale, setLocale } = useTranslation();
 *   t("nav.harnesses")          // -> "Harnesses" | "Harnesses" | "Harnesses"
 *   t("credentials.title")     // -> "Credentials" | "Credenciais" | "Credenciales"
 *   t("credentials.discoveredToast", { count: 7 })  // -> "7 modelos descobertos"
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  TRANSLATIONS,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./translations";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Lookup a dotted key path. Supports {var} interpolation. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredLocale(): Locale {
  if (!isBrowser()) return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && stored in TRANSLATIONS) return stored as Locale;
  } catch {
    // localStorage might be disabled — fall through to default
  }
  // Detect from browser language
  const nav = window.navigator?.language || "";
  if (nav.toLowerCase().startsWith("pt")) return "pt-BR";
  if (nav.toLowerCase().startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Initialize locale from localStorage / browser language on first render.
  // Using a lazy initializer avoids both useEffect (which causes a flash) and
  // the "don't mutate during render" lint rule.
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (isBrowser()) {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, l);
      } catch {
        // ignore
      }
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
      const parts = key.split(".");
       
      let val: any = dict;
      for (const part of parts) {
        if (val && typeof val === "object" && part in val) {
          val = val[part];
        } else {
          // Key not found — return the key itself as a fallback (helps debugging)
          return key;
        }
      }
      if (typeof val !== "string") return key;
      if (!vars) return val;
      // Interpolate {var} placeholders
      return val.replace(/\{(\w+)\}/g, (_, k: string) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
      );
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used inside a <LanguageProvider>");
  }
  return ctx;
}
