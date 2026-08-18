"use client";

/**
 * LockScreen — full-screen PIN entry shown when the app is locked.
 *
 * Two modes:
 *   - "unlock" mode: a PIN exists. Show PIN input + Unlock button.
 *   - "setup" mode: no PIN yet. Ask user to create one (with skip option).
 *
 * The setup mode also shows a "Skip (not recommended)" button so users
 * who don't want a PIN can dismiss the screen.
 */
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { useTranslation } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, ShieldCheck, AlertTriangle } from "lucide-react";

export function LockScreen() {
  const { t } = useTranslation();
  const { status, tryUnlock, setupPin, skipPin } = useAuth();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Decide mode: if a PIN exists, show unlock. Otherwise show setup.
  const mode: "unlock" | "setup" = status.hasPin ? "unlock" : "setup";

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const ok = await tryUnlock(pin);
    setLoading(false);
    if (!ok) {
      setError(t("auth.wrongPin"));
      setPin("");
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin.length < 4) {
      setError(t("auth.setupTooShort"));
      return;
    }
    if (pin !== confirmPin) {
      setError(t("auth.setupMismatch"));
      return;
    }
    setLoading(true);
    try {
      await setupPin(pin);
      // Component will re-render to "unlocked" via the provider
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    setError(null);
    skipPin();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              mode === "unlock" ? "bg-amber-500/10" : "bg-primary/10"
            }`}
          >
            {mode === "unlock" ? (
              <Lock className="w-7 h-7 text-amber-600" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-primary" />
            )}
          </div>
          <h1 className="text-xl font-semibold">
            {mode === "unlock" ? t("auth.lockTitle") : t("auth.setupTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 px-4">
            {mode === "unlock" ? t("auth.lockSubtitle") : t("auth.setupSubtitle")}
          </p>
        </div>

        {mode === "unlock" ? (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin-input">PIN</Label>
              <Input
                id="pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t("auth.pinPlaceholder")}
                className="text-center text-2xl tracking-widest h-14"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading || !pin}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("auth.unlock")}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin-new">{t("auth.setupPin")}</Label>
              <Input
                id="pin-new"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t("auth.pinPlaceholder")}
                className="text-center text-2xl tracking-widest h-12"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin-confirm">{t("auth.setupConfirm")}</Label>
              <Input
                id="pin-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder={t("auth.pinPlaceholder")}
                className="text-center text-2xl tracking-widest h-12"
              />
            </div>
            {error && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading || !pin || !confirmPin}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("auth.setupCreate")}
            </Button>
            <div className="pt-2 border-t">
              <button
                type="button"
                onClick={handleSkip}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {t("auth.noPinSkip")}
              </button>
              <p className="text-[10px] text-muted-foreground text-center mt-1 px-4">
                {t("auth.noPinSkipHint")}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
