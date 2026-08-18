"use client";

/**
 * NodeConfigPanel — side panel to edit the selected node's properties.
 *
 * Different fields are shown based on nodeType:
 *   - trigger    : just label
 *   - model      : label, credential, model, system prompt, temperature, maxTokens, topP, thinking
 *   - condition   : label, field, op, value
 *   - end         : just label
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings2, Cpu, GitBranch, Zap, CircleStop, RefreshCw, Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/provider";
import type { WorkflowNodeData, NodeType } from "@/lib/workflow/types";

interface NodeConfigPanelProps {
  node: { id: string; data: WorkflowNodeData } | null;
  onChange: (id: string, patch: Partial<WorkflowNodeData>) => void;
}

const NODE_TYPE_ICONS: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  trigger: Zap,
  model: Cpu,
  condition: GitBranch,
  end: CircleStop,
};

export function NodeConfigPanel({ node, onChange }: NodeConfigPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: credsData } = useQuery({ queryKey: ["credentials"], queryFn: api.listCredentials });

  const selectedCredential = credsData?.credentials.find((c) => c.id === node?.data.credentialId);

  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["models", node?.data.credentialId],
    queryFn: () => api.listModels(node!.data.credentialId!),
    enabled: !!node?.data.credentialId,
  });

  const discoverMutation = useMutation({
    mutationFn: () => api.discoverModels(node!.data.credentialId!),
    onSuccess: (data) => {
      toast.success(t("credentials.discoveredToast", { count: data.count }));
      queryClient.invalidateQueries({ queryKey: ["models", node?.data.credentialId] });
    },
    onError: (e: Error) => toast.error(`${e.message}`),
  });

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <Settings2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm font-medium">{t("nodeConfig.noSelection")}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {t("nodeConfig.noSelectionHint")}
          </div>
        </div>
      </div>
    );
  }

  const data = node.data;
  const Icon = NODE_TYPE_ICONS[data.nodeType];

  const update = (patch: Partial<WorkflowNodeData>) => onChange(node.id, patch);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4" />
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            {data.nodeType}
          </Badge>
        </div>
        <Input
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
          className="text-base font-semibold h-9 border-none px-0 focus-visible:ring-0"
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {data.nodeType === "trigger" && (
          <div className="text-sm text-muted-foreground">
            {t("nodeConfig.triggerDesc")}
          </div>
        )}

        {data.nodeType === "end" && (
          <div className="text-sm text-muted-foreground">
            {t("nodeConfig.endDesc")}
          </div>
        )}

        {data.nodeType === "model" && (
          <>
            {/* Credential picker */}
            <div className="space-y-2">
              <Label>{t("nodeConfig.credential")}</Label>
              <Select
                value={data.credentialId || ""}
                onValueChange={(v) => update({ credentialId: v, modelId: undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectCredential")} />
                </SelectTrigger>
                <SelectContent>
                  {credsData?.credentials.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="truncate">{c.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {c.providerLabel || c.provider}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {credsData && credsData.credentials.length === 0 && (
                <p className="text-xs text-amber-600">
                  {t("nodeConfig.noCredentialsWarning")}
                </p>
              )}
            </div>

            {/* Model picker — populated from discovered models, fallback to knownModels */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("nodeConfig.model")}</Label>
                {data.credentialId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => discoverMutation.mutate()}
                    disabled={discoverMutation.isPending}
                  >
                    {discoverMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    {t("common.discover")}
                  </Button>
                )}
              </div>
              {data.credentialId ? (
                <>
                  {modelsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> {t("common.loading")}
                    </div>
                  ) : modelsData && modelsData.models.length > 0 ? (
                    <Select
                      value={data.modelId || ""}
                      onValueChange={(v) => update({ modelId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.pickProvider")} />
                      </SelectTrigger>
                      <SelectContent>
                        {modelsData.models.map((m) => (
                          <SelectItem key={m.id} value={m.modelId}>
                            <span className="font-mono">{m.modelId}</span>
                            {m.displayName !== m.modelId && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                {m.displayName}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={data.modelId || ""}
                        onChange={(e) => update({ modelId: e.target.value })}
                        placeholder={t("nodeConfig.modelPlaceholder")}
                        className="font-mono text-xs"
                      />
                      {selectedCredential?.knownModels && selectedCredential.knownModels.length > 0 && (
                        <div className="rounded-md bg-muted/40 p-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Lightbulb className="w-2.5 h-2.5" /> {t("nodeConfig.suggestedModels")}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selectedCredential.knownModels.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => update({ modelId: m })}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                  data.modelId === m
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:border-primary/40 hover:bg-muted"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {t("nodeConfig.suggestedModelsHint")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t("common.selectCredentialFirst")}</p>
              )}
            </div>

            <Separator />

            {/* System prompt */}
            <div className="space-y-2">
              <Label htmlFor="np-system">{t("nodeConfig.systemPrompt")}</Label>
              <Textarea
                id="np-system"
                value={data.systemPrompt || ""}
                onChange={(e) => update({ systemPrompt: e.target.value })}
                rows={5}
                placeholder={t("nodeConfig.systemPromptPlaceholder")}
                className="font-mono text-xs"
              />
            </div>

            <Separator />

            {/* Sampling parameters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("nodeConfig.temperature")}</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {(data.temperature ?? 0.7).toFixed(2)}
                </span>
              </div>
              <Slider
                value={[(data.temperature ?? 0.7) * 100]}
                onValueChange={([v]) => update({ temperature: v / 100 })}
                min={0}
                max={200}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("nodeConfig.maxTokens")}</Label>
                <span className="text-xs font-mono text-muted-foreground">{data.maxTokens ?? 4096}</span>
              </div>
              <Slider
                value={[data.maxTokens ?? 4096]}
                onValueChange={([v]) => update({ maxTokens: v })}
                min={256}
                max={32768}
                step={256}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("nodeConfig.topP")}</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {(data.topP ?? 1).toFixed(2)}
                </span>
              </div>
              <Slider
                value={[(data.topP ?? 1) * 100]}
                onValueChange={([v]) => update({ topP: v / 100 })}
                min={0}
                max={100}
                step={5}
              />
            </div>

            <Separator />

            {/* Extended thinking */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="np-thinking">{t("nodeConfig.extendedThinking")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("nodeConfig.extendedThinkingDesc")}
                  </p>
                </div>
                <Switch
                  id="np-thinking"
                  checked={!!data.thinking}
                  onCheckedChange={(v) => update({ thinking: v })}
                />
              </div>
              {data.thinking && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t("nodeConfig.thinkingBudget")}</Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {data.thinkingBudget ?? 4096}
                    </span>
                  </div>
                  <Slider
                    value={[data.thinkingBudget ?? 4096]}
                    onValueChange={([v]) => update({ thinkingBudget: v })}
                    min={1024}
                    max={32768}
                    step={1024}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {data.nodeType === "condition" && (
          <>
            <div className="text-sm text-muted-foreground">
              {t("nodeConfig.conditionDesc")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cond-field">{t("nodeConfig.conditionField")}</Label>
              <Input
                id="cond-field"
                value={data.conditionField || ""}
                onChange={(e) => update({ conditionField: e.target.value })}
                placeholder={t("nodeConfig.conditionFieldPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("nodeConfig.operator")}</Label>
              <Select
                value={data.conditionOp || ">"}
                onValueChange={(v) => update({ conditionOp: v as WorkflowNodeData["conditionOp"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">{t("nodeConfig.operators.>")}</SelectItem>
                  <SelectItem value=">=">{t("nodeConfig.operators.>=")}</SelectItem>
                  <SelectItem value="<">{t("nodeConfig.operators.<")}</SelectItem>
                  <SelectItem value="<=">{t("nodeConfig.operators.<=")}</SelectItem>
                  <SelectItem value="==">{t("nodeConfig.operators.==")}</SelectItem>
                  <SelectItem value="!=">{t("nodeConfig.operators.!=")}</SelectItem>
                  <SelectItem value="contains">{t("nodeConfig.operators.contains")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cond-value">{t("nodeConfig.value")}</Label>
              <Input
                id="cond-value"
                value={String(data.conditionValue ?? "")}
                onChange={(e) => {
                  const v = e.target.value;
                  // Try to parse as number, otherwise keep as string
                  const parsed = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
                  update({ conditionValue: parsed });
                }}
                placeholder={t("nodeConfig.valuePlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("nodeConfig.valueHint")}
              </p>
            </div>

            <Separator />

            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium">{t("nodeConfig.trueBranch")}:</span>
                <span className="text-muted-foreground">
                  {t("nodeConfig.trueBranchHint")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="font-medium">{t("nodeConfig.falseBranch")}:</span>
                <span className="text-muted-foreground">
                  {t("nodeConfig.falseBranchHint")}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
