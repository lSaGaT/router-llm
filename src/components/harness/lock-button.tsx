"use client";

/**
 * LockButton — small button in the header that locks the app immediately.
 * Only shown when a PIN is set.
 */
import { useAuth } from "@/lib/auth/provider";
import { useTranslation } from "@/lib/i18n/provider";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function LockButton() {
  const { t } = useTranslation();
  const { status, lockNow } = useAuth();

  // Only show if a PIN is set — otherwise locking makes no sense
  // (there'd be nothing to unlock with)
  if (!status.hasPin) return null;

  return (
    <button
      onClick={lockNow}
      className={cn(
        "flex items-center gap-1.5 px-2 h-8 rounded-md border bg-card hover:bg-muted/50 transition-colors text-sm",
      )}
      title={t("auth.lockButtonTitle")}
      aria-label={t("auth.lockButton")}
    >
      <Lock className="w-3 h-3" />
      <span className="hidden sm:inline">{t("auth.lockButton")}</span>
    </button>
  );
}
