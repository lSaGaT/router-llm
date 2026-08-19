"use client";

/**
 * ThemeToggle — compact dropdown for picking light / dark / system theme.
 *
 * Renders a small button with a sun/moon icon depending on the resolved
 * theme. Persists the choice to localStorage via next-themes.
 */
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n/provider";
import { Check, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // next-themes resolves after mount; render a neutral icon on first paint
  // to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Standard mounted-flag pattern — one intentional setState on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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

  const CurrentIcon = !mounted ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-md border bg-card hover:bg-muted/50 transition-colors"
        title={t("theme.toggle")}
        aria-label={t("theme.toggle")}
        aria-expanded={open}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border bg-card shadow-lg overflow-hidden">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors",
                  mounted && theme === opt.value && "bg-primary/5",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="flex-1">{t(`theme.${opt.value}`)}</span>
                {mounted && theme === opt.value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
