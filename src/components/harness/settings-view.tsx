"use client";

/**
 * SettingsView — shows gateway status, Claude Code setup steps, and warnings.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Terminal, Route, ShieldCheck, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";
import { PinSettingsSection } from "@/components/harness/pin-settings-section";

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

      {/* PIN / local protection — top of settings because it's the first thing
          users should configure when they install the app. */}
      <PinSettingsSection />

      {/* Status grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatusCard
          icon={Route}
          label={t("settings.routerConfigured")}
          ok={data.routerConfigured}
          okText={t("settings.routerConfiguredOk")}
          notOkText={t("settings.routerConfiguredNotOk")}
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

      {!data.routerConfigured && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>{t("settings.noRouterWarningTitle")}</AlertTitle>
          <AlertDescription>
            {t("settings.noRouterWarningBody")} <strong>{t("nav.credentials")}</strong>{" → "}
            <strong>{t("nav.router")}</strong>.
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
          <CardDescription>{t("settings.setupDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>{t("settings.step1")}</li>
            <li>{t("settings.step2")}</li>
            <li>{t("settings.step3")}</li>
            <li>{t("settings.step4")}</li>
          </ol>
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              {t("settings.envBlockTitle")}
            </div>
            <pre className="text-xs font-mono bg-muted/40 p-4 rounded-md overflow-x-auto">
              {`"env": {
  "ANTHROPIC_BASE_URL": "${gatewayHost}${data.gatewayBaseUrl}",
  "ANTHROPIC_AUTH_TOKEN": "${data.claudeCodeEnv.ANTHROPIC_AUTH_TOKEN}"
}`}
            </pre>
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>{t("settings.removeDefaultsTitle")}</AlertTitle>
            <AlertDescription>
              {t("settings.removeDefaultsBody")}
              <pre className="text-xs font-mono mt-2 bg-muted/40 p-2 rounded">{`ANTHROPIC_DEFAULT_OPUS_MODEL
ANTHROPIC_DEFAULT_SONNET_MODEL
ANTHROPIC_DEFAULT_HAIKU_MODEL
ANTHROPIC_SMALL_FAST_MODEL`}</pre>
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">{t("settings.cacheNote")}</p>
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
            <code className="font-mono text-xs">{t("settings.endpoints.countTokens")}</code>
            <Badge variant="secondary">{t("settings.endpointLabels.anthropic")}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs">{t("settings.endpoints.getModels")}</code>
            <Badge variant="secondary">{t("settings.endpointLabels.modelsList")}</Badge>
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
