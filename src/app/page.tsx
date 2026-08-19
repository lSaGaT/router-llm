"use client";

/**
 * Main page — single SPA with tabs:
 *   - Router     : phase-router configuration (routes per phase + detection rules)
 *   - Credentials: CRUD with model discovery
 *   - Executions : history of routed requests
 *   - Settings   : gateway status, Claude Code setup steps
 *
 * If a PIN is set and the app is locked (or no PIN set yet), the LockScreen
 * is shown instead of the main app.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CredentialsView } from "@/components/harness/credentials-view";
import { RouterView } from "@/components/harness/router-view";
import { ExecutionsView } from "@/components/harness/executions-view";
import { SettingsView } from "@/components/harness/settings-view";
import { LanguageSwitcher } from "@/components/harness/language-switcher";
import { ThemeToggle } from "@/components/harness/theme-toggle";
import { LockButton } from "@/components/harness/lock-button";
import { LockScreen } from "@/components/harness/lock-screen";
import { useAuth } from "@/lib/auth/provider";
import { useTranslation } from "@/lib/i18n/provider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Route, KeyRound, History, Settings, Zap } from "lucide-react";

type TabKey = "router" | "credentials" | "executions" | "settings";

export default function Home() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const [tab, setTab] = useState<TabKey>("router");

  // Show a small banner if the router is not configured.
  // Note: this hook must run on every render, regardless of lock state.
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    refetchInterval: 5000,
    // Skip fetching when locked — saves a request and avoids prisma noise
    enabled: status.unlocked,
  });

  // If app is locked (or no PIN set yet), show the lock screen
  // instead of the main app. The LockScreen handles both unlock
  // (PIN exists) and setup (no PIN yet) modes.
  if (!status.unlocked) {
    return <LockScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">{t("app.title")}</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                {t("app.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          <LockButton />
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Gateway status pill */}
          {settings && (
            <Badge
              variant="outline"
              className={
                settings.routerConfigured
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700"
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  settings.routerConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {settings.routerConfigured ? t("app.configured") : t("app.notConfigured")}
            </Badge>
          )}
        </div>
      </header>

      {/* Router-not-configured banner (only on non-settings tabs) */}
      {settings && !settings.routerConfigured && tab !== "settings" && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          <span>
            {t("app.bannerTip")}{" "}
            <button onClick={() => setTab("settings")} className="underline font-medium">
              {t("app.bannerTipLink")}
            </button>
            .
          </span>
        </div>
      )}

      {/* Tabs */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="grid grid-cols-4 w-full max-w-md mb-4">
            <TabsTrigger value="router" className="gap-1.5">
              <Route className="w-3.5 h-3.5" /> {t("nav.router")}
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> {t("nav.credentials")}
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-1.5">
              <History className="w-3.5 h-3.5" /> {t("nav.executions")}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" /> {t("nav.settings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="router" className="mt-0">
            <RouterView />
          </TabsContent>

          <TabsContent value="credentials" className="mt-0">
            <CredentialsView />
          </TabsContent>

          <TabsContent value="executions" className="mt-0">
            <ExecutionsView />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsView />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {t("app.footer")}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline"
            >
              {t("app.openSource")}
            </a>
          </span>
          <span>{t("app.footerTag")}</span>
        </div>
      </footer>
    </div>
  );
}
