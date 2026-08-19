"use client";

/**
 * Router view — phase-router configuration.
 *
 * Two sections:
 * 1. Route cards: one per phase (PLAN / EXECUTE / REVIEW / UTILITY) + FALLBACK.
 *    Each picks a credential and a free-text model id (with suggestions).
 * 2. Detection rules: ordered list, first enabled match wins. Editable,
 *    reorderable, removable.
 *
 * Single Save button → PUT /api/router (version increments server-side).
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Brain,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  GitBranch,
  LifeBuoy,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import { api, type DetectionRule, type RouteKeyT, type RouterConfigData } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ROUTE_ORDER: RouteKeyT[] = ["PLAN", "EXECUTE", "REVIEW", "UTILITY", "FALLBACK"];

const PHASE_ICONS: Record<RouteKeyT, React.ComponentType<{ className?: string }>> = {
  PLAN: Brain,
  EXECUTE: Play,
  REVIEW: CheckCheck,
  UTILITY: Zap,
  FALLBACK: LifeBuoy,
};

const PHASE_COLORS: Record<RouteKeyT, string> = {
  PLAN: "border-violet-500/40 bg-violet-500/5",
  EXECUTE: "border-emerald-500/40 bg-emerald-500/5",
  REVIEW: "border-sky-500/40 bg-sky-500/5",
  UTILITY: "border-amber-500/40 bg-amber-500/5",
  FALLBACK: "border-muted bg-muted/30",
};

const FIELD_OPTIONS: DetectionRule["field"][] = [
  "requestedModel",
  "tools",
  "systemPrompt",
  "lastMessages",
];
const OPERATOR_OPTIONS: DetectionRule["operator"][] = ["contains", "regex", "equals"];
const RULE_PHASES: Exclude<RouteKeyT, "FALLBACK">[] = ["PLAN", "EXECUTE", "REVIEW", "UTILITY"];

export function RouterView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const routerQuery = useQuery({
    queryKey: ["router"],
    queryFn: api.getRouter,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const credentialsQuery = useQuery({
    queryKey: ["credentials"],
    queryFn: api.listCredentials,
    refetchOnWindowFocus: false,
  });

  // Server config is the source of truth; local `edits` holds pending changes
  // (null = untouched). Derived effective config — no state-sync effect needed.
  const serverConfig = routerQuery.data?.config ?? null;
  const [edits, setEdits] = useState<RouterConfigData | null>(null);
  const config = edits ?? serverConfig;

  const dirty =
    edits !== null &&
    serverConfig !== null &&
    JSON.stringify(edits) !== JSON.stringify(serverConfig);

  const applyConfig = (updater: (c: RouterConfigData) => RouterConfigData) => {
    if (!config) return;
    setEdits(updater(config));
  };

  const saveMutation = useMutation({
    mutationFn: () => api.updateRouter(config!),
    onSuccess: () => {
      toast.success(t("router.saved"));
      queryClient.invalidateQueries({ queryKey: ["router"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setEdits(null);
    },
    onError: (err: Error) => toast.error(`${t("router.saveFailed")}: ${err.message}`),
  });

  // ── Route editing ─────────────────────────────────────────────────────────
  const setRoute = (key: RouteKeyT, patch: Partial<RouterConfigData["routes"][RouteKeyT]>) => {
    applyConfig((c) => ({
      ...c,
      routes: { ...c.routes, [key]: { ...c.routes[key], ...patch } },
    }));
  };

  // ── Rule editing ──────────────────────────────────────────────────────────
  const setRule = (id: string, patch: Partial<DetectionRule>) => {
    applyConfig((c) => ({
      ...c,
      rules: c.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };
  const removeRule = (id: string) => {
    applyConfig((c) => ({
      ...c,
      rules: c.rules.filter((r) => r.id !== id).map((r, i) => ({ ...r, priority: i })),
    }));
  };
  const moveRule = (index: number, delta: -1 | 1) => {
    applyConfig((c) => {
      const next = [...c.rules];
      const target = index + delta;
      if (target < 0 || target >= next.length) return c;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...c, rules: next.map((r, i) => ({ ...r, priority: i })) };
    });
  };
  const addRule = () => {
    applyConfig((c) => {
      const id = `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      return {
        ...c,
        rules: [
          ...c.rules,
          {
            id,
            name: t("router.rules.newName"),
            field: "systemPrompt",
            operator: "contains",
            value: "",
            phase: "REVIEW",
            enabled: true,
            priority: c.rules.length,
          },
        ],
      };
    });
  };

  const invalidRegexIds = useMemo(() => {
    if (!config) return new Set<string>();
    const bad = new Set<string>();
    for (const r of config.rules) {
      if (r.operator === "regex" && r.value) {
        try {
          new RegExp(r.value, "i");
        } catch {
          bad.add(r.id);
        }
      }
    }
    return bad;
  }, [config]);

  const anyRouteMissingCredential = useMemo(
    () =>
      config !== null &&
      ROUTE_ORDER.some(
        (k) => config.routes[k].credentialId === null || !config.routes[k].modelId,
      ),
    [config],
  );

  const noRulesEnabled = useMemo(
    () => config !== null && !config.rules.some((r) => r.enabled && r.value !== ""),
    [config],
  );

  if (routerQuery.isLoading || !config || !routerQuery.data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("common.loading")}
      </div>
    );
  }
  if (routerQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("router.loadFailed")}</AlertTitle>
        <AlertDescription>{(routerQuery.error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  const routerData = routerQuery.data;

  const credentials = credentialsQuery.data?.credentials ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <GitBranch className="h-5 w-5" /> {t("router.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("router.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">
            v{routerData.version}
            {dirty ? " *" : ""}
          </Badge>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending || invalidRegexIds.size > 0}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t("router.save")}
          </Button>
        </div>
      </div>

      {/* Banners */}
      {anyRouteMissingCredential && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("router.banner.noCredential")}</AlertTitle>
          <AlertDescription>{t("router.banner.noCredentialDesc")}</AlertDescription>
        </Alert>
      )}
      {noRulesEnabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("router.banner.noRules")}</AlertTitle>
          <AlertDescription>{t("router.banner.noRulesDesc")}</AlertDescription>
        </Alert>
      )}

      {/* Route cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {ROUTE_ORDER.map((key) => {
          const route = config.routes[key];
          const Icon = PHASE_ICONS[key];
          return (
            <div
              key={key}
              className={`rounded-lg border p-4 ${
                key === "FALLBACK" ? "md:col-span-2" : ""
              } ${PHASE_COLORS[key]} ${
                route.credentialId === null ? "ring-1 ring-amber-500/50" : ""
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{t(`router.phases.${key}`)}</span>
                <span className="text-xs text-muted-foreground basis-full sm:basis-auto">
                  {t(`router.phaseDesc.${key}`)}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`cred-${key}`}>{t("router.credential")}</Label>
                  <Select
                    value={route.credentialId ?? "none"}
                    onValueChange={(v) => setRoute(key, { credentialId: v === "none" ? null : v })}
                  >
                    <SelectTrigger id={`cred-${key}`} className="w-full">
                      <SelectValue placeholder={t("router.credentialPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("router.credentialNone")}</SelectItem>
                      {credentials.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.providerLabel || c.provider}){" "}
                          {c.protocol === "openai_compat" ? `· ${t("router.protocolOpenAi")}` : `· ${t("router.protocolAnthropic")}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`model-${key}`}>{t("router.model")}</Label>
                  {(() => {
                    const cred = credentials.find((c) => c.id === route.credentialId);
                    // Discovered models first, then preset-known ones not yet discovered
                    const discovered = cred?.models ?? [];
                    const knownOnly = (cred?.knownModels ?? []).filter((m) => !discovered.includes(m));
                    // Keep a manually-entered value (e.g. "glm-5.3[1m]") selectable
                    const current = route.modelId && !discovered.includes(route.modelId) && !knownOnly.includes(route.modelId)
                      ? [route.modelId]
                      : [];
                    const options = [...current, ...discovered, ...knownOnly];
                    return (
                      <Select
                        value={route.modelId ?? "none"}
                        onValueChange={(v) => setRoute(key, { modelId: v === "none" ? null : v })}
                        disabled={!cred}
                      >
                        <SelectTrigger id={`model-${key}`} className="w-full font-mono">
                          <SelectValue placeholder={t("router.modelPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("router.credentialNone")}</SelectItem>
                          {options.map((m) => (
                            <SelectItem key={m} value={m} className="font-mono">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Detection rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{t("router.rules.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("router.rules.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="mr-1 h-4 w-4" /> {t("router.rules.add")}
          </Button>
        </div>

        <div className="space-y-2">
          {config.rules.map((rule, index) => (
            <div
              key={rule.id}
              className={`rounded-lg border p-3 ${
                !rule.enabled ? "opacity-60" : ""
              } ${invalidRegexIds.has(rule.id) ? "ring-1 ring-destructive/60" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-center font-mono text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(v) => setRule(rule.id, { enabled: v })}
                  aria-label={t("router.rules.enabled")}
                />
                <Input
                  className="h-8 w-40 shrink-0"
                  value={rule.name}
                  onChange={(e) => setRule(rule.id, { name: e.target.value })}
                  aria-label={t("router.rules.name")}
                />
                <Select
                  value={rule.field}
                  onValueChange={(v) => setRule(rule.id, { field: v as DetectionRule["field"] })}
                >
                  <SelectTrigger className="h-8 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {t(`router.fields.${f}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={rule.operator}
                  onValueChange={(v) =>
                    setRule(rule.id, { operator: v as DetectionRule["operator"] })
                  }
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATOR_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {t(`router.operators.${o}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-8 min-w-48 flex-1 font-mono text-xs"
                  value={rule.value}
                  onChange={(e) => setRule(rule.id, { value: e.target.value })}
                  aria-label={t("router.rules.value")}
                />
                <Select
                  value={rule.phase}
                  onValueChange={(v) =>
                    setRule(rule.id, { phase: v as DetectionRule["phase"] })
                  }
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_PHASES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`router.phases.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === 0}
                    onClick={() => moveRule(index, -1)}
                    aria-label="up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === config.rules.length - 1}
                    onClick={() => moveRule(index, 1)}
                    aria-label="down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeRule(rule.id)}
                    aria-label="delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {invalidRegexIds.has(rule.id) && (
                <p className="mt-2 pl-8 text-xs text-destructive">
                  {t("router.rules.invalidRegex")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
