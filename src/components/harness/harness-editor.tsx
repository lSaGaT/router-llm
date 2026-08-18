"use client";

/**
 * HarnessEditor — the full editor view for one harness.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ Header: name input, Save / Deploy buttons          │
 *   ├──────────┬──────────────────────────┬───────────────┤
 *   │ Palette  │      Canvas (React Flow)│  Node Config  │
 *   │          │                          │   Panel       │
 *   └──────────┴──────────────────────────┴───────────────┘
 */
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Harness } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { HarnessCanvas, NodePalette, createDefaultWorkflow, makeNewNode } from "./canvas";
import { NodeConfigPanel } from "./node-config-panel";
import { toast } from "sonner";
import { Loader2, Save, Rocket, ArrowLeft, Copy } from "lucide-react";
import { nanoid } from "nanoid";
import type { NodeType, WorkflowDefinition, WorkflowNodeData } from "@/lib/workflow/types";
import { useTranslation } from "@/lib/i18n/provider";

interface HarnessEditorProps {
  harnessId: string;
  onBack: () => void;
}

export function HarnessEditor({ harnessId, onBack }: HarnessEditorProps) {
  return <HarnessEditorInner key={harnessId} harnessId={harnessId} onBack={onBack} />;
}

function HarnessEditorInner({ harnessId, onBack }: HarnessEditorProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [graph, setGraph] = useState<WorkflowDefinition>(createDefaultWorkflow());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { data: harness, isLoading } = useQuery({
    queryKey: ["harness", harnessId],
    queryFn: () => api.getHarness(harnessId),
    enabled: !!harnessId,
  });

  // Sync loaded harness → local state when the harness data first arrives or
  // changes. We rely on the parent using `key={harnessId}` to remount when
  // switching harnesses, so this is essentially one-shot per mount.
  //
  // Pattern: call set during render (allowed by React 19) + use a ref to
  // remember we've initialized. This avoids both:
  //   - useEffect (causes cascading renders per lint rule)
  //   - Derived state on every render (would lose user edits)
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const initKey = `${harness?.id ?? ""}|${harness?.updatedAt ?? ""}`;
  const lastInitKey = useRef<string>("");
  // eslint-disable-next-line react-hooks/refs
  if (harness && initKey !== lastInitKey.current) {
    // eslint-disable-next-line react-hooks/refs
    lastInitKey.current = initKey;
    setName(harness.name);
    setDescription(harness.description || "");
    try {
      setGraph(JSON.parse(harness.graphJson) as WorkflowDefinition);
    } catch {
      // keep default
    }
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateHarness(harnessId, {
        name,
        description,
        graphJson: JSON.stringify(graph),
      }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      queryClient.invalidateQueries({ queryKey: ["harnesses"] });
      queryClient.invalidateQueries({ queryKey: ["harness", harnessId] });
    },
    onError: (e: Error) => toast.error(`${e.message}`),
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      // Save first, then deploy
      await api.updateHarness(harnessId, {
        name,
        description,
        graphJson: JSON.stringify(graph),
      });
      return api.updateHarness(harnessId, { isDeployed: true });
    },
    onSuccess: () => {
      toast.success(t("harnesses.deployedToast"));
      queryClient.invalidateQueries({ queryKey: ["harnesses"] });
      queryClient.invalidateQueries({ queryKey: ["harness", harnessId] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(`${e.message}`),
  });

  const selectedNode = useMemo(
    () => (selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) || null : null),
    [selectedNodeId, graph.nodes],
  );

  const handleAddNode = (type: NodeType) => {
    // Place new nodes near the center of the current viewport (simplified: just offset)
    const offset = graph.nodes.length * 30;
    const newNode = makeNewNode(type, {
      x: 250 + (offset % 300),
      y: 150 + Math.floor(offset / 300) * 120,
    });
    setGraph((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode as unknown as WorkflowDefinition["nodes"][number]],
    }));
    setSelectedNodeId(newNode.id);
  };

  const handleNodeChange = (id: string, patch: Partial<WorkflowNodeData>) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ name, description, graph }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "harness"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("harnesses.exportedToast"));
  };

  if (isLoading || !harness) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 h-[calc(100vh-180px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> {t("harnesses.back")}
        </Button>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 max-w-xs font-semibold"
        />
        {harness.isDeployed && (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            {t("harnesses.deployed")}
          </Badge>
        )}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Copy className="w-4 h-4" /> {t("harnesses.export")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t("common.save")}
        </Button>
        <Button
          size="sm"
          onClick={() => deployMutation.mutate()}
          disabled={deployMutation.isPending}
        >
          {deployMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          {t("harnesses.deploy")}
        </Button>
      </div>

      {/* Description */}
      <div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={1}
          placeholder={t("harnesses.descriptionPlaceholder")}
          className="text-sm h-9 min-h-0 resize-none"
        />
      </div>

      {/* Canvas + sidebar */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 border rounded-md overflow-hidden">
        <ResizablePanel defaultSize={14} minSize={10} maxSize={22}>
          <div className="h-full p-3 bg-muted/30 border-r overflow-y-auto custom-scrollbar">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Add Node
            </div>
            <NodePalette onAddNode={handleAddNode} />
          </div>
        </ResizablePanel>
        <ResizablePanel defaultSize={62} minSize={40}>
          <div className="h-full relative">
            <HarnessCanvas
              initialGraph={graph}
              onChange={setGraph}
              onNodeSelect={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
            />
          </div>
        </ResizablePanel>
        <ResizablePanel defaultSize={24} minSize={18} maxSize={40}>
          <div className="h-full bg-background border-l">
            <NodeConfigPanel
              node={
                selectedNode
                  ? { id: selectedNode.id, data: selectedNode.data }
                  : null
              }
              onChange={handleNodeChange}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Harness list view
// ─────────────────────────────────────────────────────────────────────────────

interface HarnessListViewProps {
  onOpen: (id: string) => void;
}

export function HarnessListView({ onOpen }: HarnessListViewProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["harnesses"],
    queryFn: api.listHarnesses,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const id = `h-${nanoid(6)}`;
      return api.createHarness({
        name: `${t("harnesses.newHarness")} ${new Date().toLocaleTimeString()}`,
        graphJson: JSON.stringify(createDefaultWorkflow()),
      });
    },
    onSuccess: (h: Harness) => {
      toast.success(t("harnesses.createdToast"));
      queryClient.invalidateQueries({ queryKey: ["harnesses"] });
      onOpen(h.id);
    },
    onError: (e: Error) => toast.error(`${e.message}`),
  });

  const deployMutation = useMutation({
    mutationFn: (id: string) => api.updateHarness(id, { isDeployed: true }),
    onSuccess: () => {
      toast.success(t("harnesses.deployedToast"));
      queryClient.invalidateQueries({ queryKey: ["harnesses"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(`${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteHarness(id),
    onSuccess: () => {
      toast.success(t("harnesses.deletedToast"));
      queryClient.invalidateQueries({ queryKey: ["harnesses"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(`${e.message}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("harnesses.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("harnesses.subtitle")}
          </p>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="font-bold text-lg leading-none">+</span>
          )}
          {t("harnesses.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : !data?.harnesses.length ? (
        <div className="border border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground">{t("harnesses.noHarnessesYet")}</p>
          <Button className="mt-3" onClick={() => createMutation.mutate()}>
            {t("harnesses.createFirst")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.harnesses.map((h) => (
            <div
              key={h.id}
              className={`rounded-lg border p-4 transition-colors cursor-pointer hover:border-primary/40 ${
                h.isDeployed ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
              }`}
              onClick={() => onOpen(h.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold flex-1 truncate">{h.name}</div>
                {h.isDeployed && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/40 text-[10px]">
                    {t("harnesses.deployed")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {h.description || t("common.notSet")}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{h.executionCount} {t("harnesses.executionCount")}</span>
                <span>v{h.version}</span>
              </div>
              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                {!h.isDeployed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deployMutation.mutate(h.id)}
                    disabled={deployMutation.isPending}
                  >
                    <Rocket className="w-3 h-3" /> {t("harnesses.deploy")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => deleteMutation.mutate(h.id)}
                  disabled={deleteMutation.isPending}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
