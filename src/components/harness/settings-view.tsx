"use client";

/**
 * SettingsView — shows gateway status, env vars to copy into Claude Code, and warnings.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Terminal, Rocket, ShieldCheck, Loader2 } from "lucide-react";

export function SettingsView() {
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const gatewayHost =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure Claude Code to point at this gateway. Self-hosted, single-tenant — no
          multi-tenant auth required.
        </p>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatusCard
          icon={Rocket}
          label="Deployed harness"
          ok={data.hasDeployedHarness}
          okText="Active"
          notOkText="Not deployed"
        />
        <StatusCard
          icon={ShieldCheck}
          label="Auth (HARNESS_API_KEY)"
          ok={data.authEnabled}
          okText="Enabled"
          notOkText="Open (no auth)"
        />
        <StatusCard
          icon={ShieldCheck}
          label="Encryption (HARNESS_ENCRYPTION_KEY)"
          ok={data.encryptionKeySet}
          okText="Enabled"
          notOkText="Using dev fallback"
        />
      </div>

      {/* Warnings */}
      {!data.encryptionKeySet && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Encryption key not set</AlertTitle>
          <AlertDescription>
            API keys are encrypted with <code className="font-mono">HARNESS_ENCRYPTION_KEY</code>,
            but it is not set — using a deterministic dev fallback. Generate a strong key and
            add it to <code className="font-mono">.env</code> before deploying for real:
            <pre className="text-xs font-mono mt-2 bg-muted/40 p-2 rounded">
              {`# Generate a strong random key
openssl rand -hex 32

# Then set in .env
HARNESS_ENCRYPTION_KEY=<paste-here>`}
            </pre>
          </AlertDescription>
        </Alert>
      )}

      {!data.hasDeployedHarness && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>No harness deployed yet</AlertTitle>
          <AlertDescription>
            Open the <strong>Harnesses</strong> tab, create or open a harness, then click
            <strong> Deploy</strong>. Only deployed harnesses receive requests from the gateway.
          </AlertDescription>
        </Alert>
      )}

      {/* Setup instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="w-4 h-4" />
            Claude Code setup
          </CardTitle>
          <CardDescription>
            Set these environment variables in your shell before running{" "}
            <code className="font-mono">claude</code>. Claude Code will then route every
            request through this gateway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono bg-muted/40 p-4 rounded-md overflow-x-auto">
            {`# Point Claude Code at this gateway instead of api.anthropic.com
export ANTHROPIC_BASE_URL=${gatewayHost}${data.gatewayBaseUrl}

# Use the HARNESS_API_KEY from your .env (or any value if auth is disabled)
export ANTHROPIC_API_KEY=${data.claudeCodeEnv.ANTHROPIC_API_KEY}

# Then run claude as usual
claude`}
          </pre>
          <p className="text-xs text-muted-foreground mt-3">
            You can put these in your <code className="font-mono">~/.bashrc</code> or{" "}
            <code className="font-mono">~/.zshrc</code> to make them permanent.
          </p>
        </CardContent>
      </Card>

      {/* Gateway info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gateway endpoints</CardTitle>
          <CardDescription>Anthropic-compatible API surface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs">POST /api/v1/messages</code>
            <Badge variant="secondary">Anthropic Messages API</Badge>
          </div>
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs">GET /api/v1/models</code>
            <Badge variant="secondary">Models list</Badge>
          </div>
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs">GET /api/v1/messages</code>
            <Badge variant="secondary">Same (alias)</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  ok,
  okText,
  notOkText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ok: boolean;
  okText: string;
  notOkText: string;
}) {
  return (
    <Card className={ok ? "border-emerald-500/40" : "border-amber-500/40"}>
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className={`p-1.5 rounded-md ${
            ok ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-sm font-semibold">{ok ? okText : notOkText}</div>
          <Icon className="w-3 h-3 text-muted-foreground mt-1 opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}
