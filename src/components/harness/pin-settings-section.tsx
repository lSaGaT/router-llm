"use client";

/**
 * PinSettingsSection — manage the local PIN used to lock the app.
 *
 * Lets the user:
 *   - Set a PIN (if none exists)
 *   - Change the PIN (if exists)
 *   - Remove the PIN (if exists)
 *   - Configure auto-lock timeout
 */
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { useTranslation } from "@/lib/i18n/provider";
import { AUTOLOCK_PRESETS } from "@/lib/auth/pin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PinSettingsSection() {
  const { t } = useTranslation();
  const { status, setupPin, removePin, changeAutoLock } = useAuth();

  // For "set/change PIN" dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmitPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPin.length < 4) {
      setError(t("auth.setupTooShort"));
      return;
    }
    if (newPin !== confirmPin) {
      setError(t("auth.setupMismatch"));
      return;
    }
    setLoading(true);
    try {
      await setupPin(newPin);
      toast.success(status.hasPin ? t("auth.changePin") : t("auth.setPin"));
      setDialogOpen(false);
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    removePin();
    toast.success(t("auth.removePin"));
  }

  function openDialog() {
    setNewPin("");
    setConfirmPin("");
    setError(null);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4" />
              {t("auth.pinSection")}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {t("auth.pinSectionDesc")}
            </CardDescription>
          </div>
          {status.hasPin ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/40">
              <Lock className="w-2.5 h-2.5 mr-1" />
              {t("auth.pinActive")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-700 border-amber-500/40">
              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
              {t("auth.pinInactive")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* PIN management buttons */}
        <div className="flex flex-wrap gap-2">
          {status.hasPin ? (
            <>
              <Button variant="outline" size="sm" onClick={openDialog}>
                <Lock className="w-3.5 h-3.5" />
                {t("auth.changePin")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700"
                onClick={handleRemove}
              >
                {t("auth.removePin")}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={openDialog}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {t("auth.setPin")}
            </Button>
          )}
        </div>

        {/* Auto-lock selector */}
        <div className="space-y-2">
          <Label>{t("auth.autoLock")}</Label>
          <Select
            value={String(status.autoLockMs ?? "null")}
            onValueChange={(v) => {
              const ms = v === "null" ? null : parseInt(v);
              changeAutoLock(ms);
              toast.success(t("common.saved"));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTOLOCK_PRESETS.map((preset) => (
                <SelectItem key={String(preset.value)} value={String(preset.value)}>
                  {t(preset.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("auth.autoLockDesc")}
          </p>
        </div>
      </CardContent>

      {/* Set / change PIN dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {status.hasPin ? t("auth.changePin") : t("auth.setPin")}
            </DialogTitle>
            <DialogDescription>{t("auth.setupSubtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-new-pin">{t("auth.setupPin")}</Label>
              <Input
                id="settings-new-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder={t("auth.pinPlaceholder")}
                className="text-center text-xl tracking-widest h-12"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-confirm-pin">{t("auth.setupConfirm")}</Label>
              <Input
                id="settings-confirm-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder={t("auth.pinPlaceholder")}
                className="text-center text-xl tracking-widest h-12"
              />
            </div>
            {error && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={loading || !newPin || !confirmPin}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {status.hasPin ? t("auth.changePin") : t("auth.setupCreate")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
