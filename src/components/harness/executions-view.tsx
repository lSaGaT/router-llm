"use client";

/**
 * ExecutionsView — list of executions + detail/replay.
 *
 * Replay: clicking an execution opens a detail panel where we show the
 * graph plus a per-node log (input, output, tokens, cost, latency, model).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Execution, type ExecutionDetail, type NodeRun } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Loader2, Clock, Coins, Cpu, ListChecks, ArrowLeft, CheckCircle2, XCircle, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";

const STATUS_BADGE: Record<Execution["status"], string> = {
  running: "bg-blue-500/10 text-blue-700 border-blue-500/40",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/40",
  failed: "bg-rose-500/10 text-rose-700 border-rose-500/40",
  cancelled: "bg-zinc-500/10 text-zinc-700 border-zinc-500/40",
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
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b bg-muted/40">
            <div>{t("executions.columns.harness")}</div>
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
                className="w-full text-left grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors items-center"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.harnessName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(e.startedAt).toLocaleString()} · {e.nodeRunCount} {t("executions.nodes").toLowerCase()}
                  </div>
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
        <Badge className={cn("border", STATUS_BADGE[data.status])}>{t(`executions.statuses.${data.status}`)}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Clock} label={t("executions.duration")} value={data.durationMs ? formatDuration(data.durationMs) : "—"} />
        <StatCard
          icon={Cpu}
          label={t("executions.tokensInOut")}
          value={`${data.totalTokensIn.toLocaleString()} / ${data.totalTokensOut.toLocaleString()}`}
        />
        <StatCard icon={Coins} label={t("executions.cost")} value={formatCost(data.totalCostUsd)} />
        <StatCard icon={ListChecks} label={t("executions.nodes")} value={data.nodeRuns.length.toString()} />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("executions.replayTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.nodeRuns.map((nr: NodeRun) => (
              <NodeRunRow key={nr.id} run={nr} />
            ))}
            {data.nodeRuns.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                {t("executions.noNodeRuns")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function NodeRunRow({ run }: { run: NodeRun }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    run.status === "completed" ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
    ) : run.status === "failed" ? (
      <XCircle className="w-3.5 h-3.5 text-rose-500" />
    ) : (
      <Play className="w-3.5 h-3.5 text-blue-500" />
    );

  return (
    <div className="border rounded-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/30"
      >
        {statusIcon}
        <span className="text-sm font-medium flex-1 truncate">
          {run.nodeLabel || run.nodeType}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {run.nodeType}
        </Badge>
        {run.modelUsed && (
          <span className="text-xs font-mono text-muted-foreground">{run.modelUsed}</span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {run.tokensIn + run.tokensOut} tok
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {run.latencyMs}ms
        </span>
        {run.costUsd > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">{formatCost(run.costUsd)}</span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3">
          {run.errorMessage && (
            <div className="text-xs font-mono bg-rose-500/5 border border-rose-500/30 rounded p-2 whitespace-pre-wrap">
              {run.errorMessage}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                {t("executions.input")}
              </div>
              <pre className="text-xs font-mono bg-muted/40 rounded p-2 max-h-48 overflow-y-auto custom-scrollbar">
                {JSON.stringify(run.input, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                {t("executions.output")}
              </div>
              <pre className="text-xs font-mono bg-muted/40 rounded p-2 max-h-48 overflow-y-auto custom-scrollbar">
                {JSON.stringify(run.output, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
