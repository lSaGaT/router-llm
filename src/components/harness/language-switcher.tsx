"use client";

/**
 * LanguageSwitcher — compact flag dropdown for picking the UI language.
 *
 * Renders a small button with the current flag. Click opens a dropdown with
 * all supported locales. Persists choice to localStorage via the provider.
 */
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/provider";
import { LOCALE_OPTIONS } from "@/lib/i18n/translations";
import { Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = LOCALE_OPTIONS.find((o) => o.code === locale) || LOCALE_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 h-8 rounded-md border bg-card hover:bg-muted/50 transition-colors text-sm"
        title={current.label}
        aria-label="Change language"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <Globe className="w-3 h-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-md border bg-card shadow-lg overflow-hidden">
          {LOCALE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                setLocale(opt.code);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors",
                opt.code === locale && "bg-primary/5",
              )}
            >
              <span className="text-base leading-none">{opt.flag}</span>
              <span className="flex-1">{opt.label}</span>
              {opt.code === locale && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
