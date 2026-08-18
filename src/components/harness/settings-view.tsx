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
import { useTranslation } from "@/lib/i18n/provider";

export function SettingsView() {
  const { t } = useTranslation();
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
        <h2 className="text-lg font-semibold">{t("settings.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatusCard
          icon={Rocket}
          label={t("settings.deployedHarness")}
          ok={data.hasDeployedHarness}
          okText={t("settings.deployedHarnessOk")}
          notOkText={t("settings.deployedHarnessNotOk")}
        />
        <StatusCard
          icon={ShieldCheck}
          label={t("settings.authEnabled")}
          ok={data.authEnabled}
          okText={t("settings.authEnabledOk")}
          notOkText={t("settings.authEnabledNotOk")}
        />
        <StatusCard
          icon={ShieldCheck}
          label={t("settings.encryptionKey")}
          ok={data.encryptionKeySet}
          okText={t("settings.encryptionKeyOk")}
          notOkText={t("settings.encryptionKeyNotOk")}
        />
      </div>

      {/* Warnings */}
      {!data.encryptionKeySet && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>{t("settings.encryptionWarningTitle")}</AlertTitle>
          <AlertDescription>
            {t("settings.encryptionWarningBody")}
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
          <AlertTitle>{t("settings.noHarnessWarningTitle")}</AlertTitle>
          <AlertDescription>
            {t("settings.noHarnessWarningBody")}<strong>{t("nav.harnesses")}</strong>{t("settings.noHarnessWarningBody2")}<strong> {t("harnesses.deploy")}</strong>.{t("settings.noHarnessWarningBody3")}
          </AlertDescription>
        </Alert>
      )}

      {/* Setup instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="w-4 h-4" />
            {t("settings.setupTitle")}
          </CardTitle>
          <CardDescription>
            {t("settings.setupDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono bg-muted/40 p-4 rounded-md overflow-x-auto">
            {`${t("settings.setupComment")}
export ANTHROPIC_BASE_URL=${gatewayHost}${data.gatewayBaseUrl}

${t("settings.setupComment2")}
export ANTHROPIC_API_KEY=${data.claudeCodeEnv.ANTHROPIC_API_KEY}

# claude`}
          </pre>
          <p className="text-xs text-muted-foreground mt-3">
            {t("settings.setupHint")}<code className="font-mono">~/.bashrc</code>{t("settings.setupHint2")}<code className="font-mono">~/.zshrc</code>.
          </p>
        </CardContent>
      </Card>

      {/* Gateway info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.gatewayEndpoints")}</CardTitle>
          <CardDescription>{t("settings.gatewayEndpointsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs">{t("settings.endpoints.postMessages")}</code>
            <Badge variant="secondary">{t("settings.endpointLabels.anthropic")}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs">{t("settings.endpoints.getModels")}</code>
            <Badge variant="secondary">{t("settings.endpointLabels.modelsList")}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs">{t("settings.endpoints.getMessagesAlias")}</code>
            <Badge variant="secondary">{t("settings.endpointLabels.alias")}</Badge>
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
