"use client";

/**
 * Main page — single SPA with tabs:
 *   - Harnesses  : list + editor with React Flow canvas
 *   - Credentials : CRUD with model discovery
 *   - Executions  : list + replay
 *   - Settings    : gateway status, env vars for Claude Code
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CredentialsView } from "@/components/harness/credentials-view";
import { HarnessListView, HarnessEditor } from "@/components/harness/harness-editor";
import { ExecutionsView } from "@/components/harness/executions-view";
import { SettingsView } from "@/components/harness/settings-view";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Workflow, KeyRound, History, Settings, Zap } from "lucide-react";

type TabKey = "harnesses" | "credentials" | "executions" | "settings";

export default function Home() {
  const [tab, setTab] = useState<TabKey>("harnesses");
  const [editingHarnessId, setEditingHarnessId] = useState<string | null>(null);

  // Show a small banner if no harness is deployed
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Workflow className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">LLM Harness</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Visual workflow builder for coding agents
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Gateway status pill */}
          {settings && (
            <Badge
              variant="outline"
              className={
                settings.hasDeployedHarness
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700"
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  settings.hasDeployedHarness ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {settings.hasDeployedHarness ? "Gateway live" : "No harness deployed"}
            </Badge>
          )}
        </div>
      </header>

      {/* No-deployed-harness banner (only on non-settings tabs) */}
      {settings && !settings.hasDeployedHarness && tab !== "settings" && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          <span>
            Tip: deploy a harness and point Claude Code at this gateway. See the{" "}
            <button onClick={() => setTab("settings")} className="underline font-medium">
              Settings tab
            </button>{" "}
            for setup instructions.
          </span>
        </div>
      )}

      {/* Tabs */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="grid grid-cols-4 w-full max-w-md mb-4">
            <TabsTrigger value="harnesses" className="gap-1.5">
              <Workflow className="w-3.5 h-3.5" /> Harnesses
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Credentials
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-1.5">
              <History className="w-3.5 h-3.5" /> Executions
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="harnesses" className="mt-0">
            {editingHarnessId ? (
              <HarnessEditor
                harnessId={editingHarnessId}
                onBack={() => setEditingHarnessId(null)}
              />
            ) : (
              <HarnessListView onOpen={setEditingHarnessId} />
            )}
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
            LLM Harness · Self-hosted ·{" "}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline"
            >
              Open source
            </a>
          </span>
          <span>Single-tenant · Local-first</span>
        </div>
      </footer>
    </div>
  );
}
