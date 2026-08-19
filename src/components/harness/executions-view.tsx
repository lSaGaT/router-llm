"use client";

/**
 * ExecutionsView — history of routed requests.
 *
 * One row per gateway request: detected phase, matched rule, requested →
 * routed model, status, tokens, cost. Detail shows the truncated request /
 * response summaries the proxy stored.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Execution, type ExecutionDetail, type PhaseKeyT } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock, Coins, Cpu, ArrowLeft, XCircle, ArrowRight, Route as RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";

const STATUS_BADGE: Record<Execution["status"], string> = {
  running: "bg-blue-500/10 text-blue-700 border-blue-500/40",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/40",
  failed: "bg-rose-500/10 text-rose-700 border-rose-500/40",
  cancelled: "bg-zinc-500/10 text-zinc-700 border-zinc-500/40",
};

const PHASE_BADGE: Record<string, string> = {
  PLAN: "bg-violet-500/10 text-violet-700 border-violet-500/40",
  EXECUTE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/40",
  REVIEW: "bg-sky-500/10 text-sky-700 border-sky-500/40",
  UTILITY: "bg-amber-500/10 text-amber-700 border-amber-500/40",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

function formatCost(usd: number): string {
  if (usd === 0) return "—";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function PhaseBadge({ phase }: { phase: PhaseKeyT | null }) {
  const { t } = useTranslation();
  if (!phase) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge className={cn("border", PHASE_BADGE[phase] ?? "")}>
      {t(`router.phases.${phase}`)}
    </Badge>
  );
}

export function ExecutionsView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <ExecutionDetailPanel id={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <ExecutionsList onOpen={setSelectedId} />;
}

function ExecutionsList({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["executions"],
    queryFn: () => api.listExecutions(50, 0),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("executions.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("executions.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : !data?.executions.length ? (
        <div className="border border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground">{t("executions.noExecutions")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("executions.noExecutionsHint")}
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_1.2fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b bg-muted/40">
            <div>{t("executions.columns.phase")}</div>
            <div>{t("executions.columns.model")}</div>
            <div>{t("executions.columns.status")}</div>
            <div>{t("executions.columns.duration")}</div>
            <div>{t("executions.columns.tokens")}</div>
            <div>{t("executions.columns.cost")}</div>
          </div>
          <div className="divide-y">
            {data.executions.map((e: Execution) => (
              <button
                key={e.id}
                onClick={() => onOpen(e.id)}
                className="w-full text-left grid grid-cols-[1fr_1.2fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors items-center"
              >
                <div className="min-w-0">
                  <PhaseBadge phase={e.phase} />
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {e.matchedRule
                      ? `${e.matchedRule} · ${new Date(e.startedAt).toLocaleString()}`
                      : new Date(e.startedAt).toLocaleString()}
                  </div>
                </div>
                <div className="min-w-0 text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                  <span className="truncate">{e.requestedModel || "—"}</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  <span className="truncate text-foreground">{e.routedModel || "—"}</span>
                </div>
                <Badge className={cn("border", STATUS_BADGE[e.status])}>
                  {t(`executions.statuses.${e.status}`)}
                </Badge>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {e.durationMs ? formatDuration(e.durationMs) : "—"}
                </div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {e.totalTokensIn.toLocaleString()} / {e.totalTokensOut.toLocaleString()}
                </div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {formatCost(e.totalCostUsd)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutionDetailPanel({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["execution", id],
    queryFn: () => api.getExecution(id),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t("executions.backToList")}
        </button>
        <h2 className="text-lg font-semibold">{t("executions.detail")}</h2>
        <PhaseBadge phase={data.phase} />
        <Badge className={cn("border", STATUS_BADGE[data.status])}>{t(`executions.statuses.${data.status}`)}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={RouteIcon} label={t("executions.matchedRule")} value={data.matchedRule || "fallback"} />
        <StatCard
          icon={Cpu}
          label={t("executions.routedModel")}
          value={data.routedModel || "—"}
        />
        <StatCard
          icon={Cpu}
          label={t("executions.tokensInOut")}
          value={`${data.totalTokensIn.toLocaleString()} / ${data.totalTokensOut.toLocaleString()}`}
        />
        <StatCard icon={Coins} label={t("executions.cost")} value={formatCost(data.totalCostUsd)} />
      </div>

      {data.errorMessage && (
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardHeader>
            <CardTitle className="text-sm text-rose-700 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> {t("executions.error")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap">{data.errorMessage}</pre>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> {t("executions.requestSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono bg-muted/40 rounded p-2 max-h-96 overflow-auto custom-scrollbar whitespace-pre-wrap">
              {JSON.stringify(data.request, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("executions.responseSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono bg-muted/40 rounded p-2 max-h-96 overflow-auto custom-scrollbar whitespace-pre-wrap">
              {data.response ? JSON.stringify(data.response, null, 2) : "—"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <div className="text-sm font-semibold tabular-nums truncate font-mono">{value}</div>
      </CardContent>
    </Card>
  );
}
