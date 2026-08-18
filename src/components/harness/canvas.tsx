"use client";

/**
 * HarnessCanvas — React Flow canvas for editing a workflow.
 *
 * Node types supported (Phase 1):
 *   - Trigger   : entry point (exactly one per graph)
 *   - Model     : calls an LLM via a credential
 *   - Condition : branches on a variable/op/value (IF-style)
 *   - End       : terminates the workflow
 *
 * The graph is persisted to the backend on save via the parent. Each node's
 * data carries: label, nodeType, credentialId, modelId, systemPrompt,
 * temperature, maxTokens, topP, thinking, thinkingBudget,
 * conditionField, conditionOp, conditionValue.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
  BackgroundVariant,
} from "reactflow";
import { nanoid } from "nanoid";
import {
  Play,
  GitBranch,
  CircleStop,
  Zap,
  Cpu,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowDefinition, WorkflowNodeData, NodeType } from "@/lib/workflow/types";

// ─────────────────────────────────────────────────────────────────────────────
// Custom node component
// ─────────────────────────────────────────────────────────────────────────────

const NODE_META: Record<
  NodeType,
  { color: string; icon: React.ComponentType<{ className?: string }>; defaultLabel: string }
> = {
  trigger: { color: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400", icon: Zap, defaultLabel: "Trigger" },
  model: { color: "bg-violet-500/10 border-violet-500/40 text-violet-700 dark:text-violet-400", icon: Cpu, defaultLabel: "Model" },
  condition: { color: "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-400", icon: GitBranch, defaultLabel: "Condition" },
  end: { color: "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400", icon: CircleStop, defaultLabel: "End" },
};

interface HarnessNodeProps {
  data: WorkflowNodeData;
  selected: boolean;
  id: string;
}

function HarnessNodeComponent({ data, selected }: HarnessNodeProps) {
  const meta = NODE_META[data.nodeType];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border-2 bg-card shadow-sm min-w-[180px] transition-shadow",
        meta.color,
        selected && "ring-2 ring-offset-1 ring-primary/40",
      )}
    >
      {data.nodeType !== "end" && (
        <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2.5 !h-2.5 !border-2 !border-background" />
      )}

      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{data.label}</div>
          <div className="text-[10px] opacity-80 truncate">
            {data.nodeType === "model" && (data.modelId || "(no model)")}
            {data.nodeType === "condition" && `${data.conditionField || "?"} ${data.conditionOp || "?"} ${data.conditionValue ?? "?"}`}
            {data.nodeType === "trigger" && "Start"}
            {data.nodeType === "end" && "Terminate"}
          </div>
        </div>
      </div>

      {/* Branch handles for condition nodes */}
      {data.nodeType === "condition" ? (
        <>
          <div className="flex justify-between mt-2 px-1">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono opacity-70">TRUE</span>
              <Handle
                type="source"
                position={Position.Bottom}
                id="true"
                className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-background"
                style={{ left: "25%" }}
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono opacity-70">FALSE</span>
              <Handle
                type="source"
                position={Position.Bottom}
                id="false"
                className="!bg-rose-500 !w-2.5 !h-2.5 !border-2 !border-background"
                style={{ left: "75%" }}
              />
            </div>
          </div>
        </>
      ) : (
        data.nodeType !== "end" && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!bg-muted-foreground !w-2.5 !h-2.5 !border-2 !border-background"
          />
        )
      )}
    </div>
  );
}

const nodeTypes = { harnessNode: HarnessNodeComponent };

// ─────────────────────────────────────────────────────────────────────────────
// Default nodes for a new harness
// ─────────────────────────────────────────────────────────────────────────────

export function createDefaultWorkflow(): WorkflowDefinition {
  return {
    nodes: [
      {
        id: "trigger",
        type: "harnessNode",
        position: { x: 250, y: 0 },
        data: { label: "Trigger", nodeType: "trigger" },
      },
      {
        id: "model-1",
        type: "harnessNode",
        position: { x: 250, y: 120 },
        data: { label: "Planner", nodeType: "model", temperature: 0.3, maxTokens: 2048 },
      },
      {
        id: "end",
        type: "harnessNode",
        position: { x: 250, y: 280 },
        data: { label: "End", nodeType: "end" },
      },
    ],
    edges: [
      { id: "e-trigger-model1", source: "trigger", target: "model-1" },
      { id: "e-model1-end", source: "model-1", target: "end" },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas component
// ─────────────────────────────────────────────────────────────────────────────

interface HarnessCanvasProps {
  initialGraph: WorkflowDefinition;
  onChange: (graph: WorkflowDefinition) => void;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId: string | null;
}

export function HarnessCanvas({
  initialGraph,
  onChange,
  onNodeSelect,
  selectedNodeId,
}: HarnessCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges as Edge[]);
  const lastEmitRef = useRef<string>("");

  // Sync external → internal when the parent hands us a new graph
  // (e.g. user loaded a different harness). We use a ref to detect true changes
  // and avoid loops with our own onChange emission.
  useEffect(() => {
    const serialized = JSON.stringify(initialGraph);
    if (serialized !== lastEmitRef.current) {
      setNodes(initialGraph.nodes as Node[]);
      setEdges(initialGraph.edges as Edge[]);
      lastEmitRef.current = serialized;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGraph]);

  // Emit changes up — but only when the serialized graph actually changed
  const emit = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const graph: WorkflowDefinition = {
        nodes: nextNodes as unknown as WorkflowDefinition["nodes"],
        edges: nextEdges as unknown as WorkflowDefinition["edges"],
      };
      const serialized = JSON.stringify(graph);
      if (serialized !== lastEmitRef.current) {
        lastEmitRef.current = serialized;
        onChange(graph);
      }
    },
    [onChange],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, nodes);
      setNodes(next);
      emit(next, edges);
    },
    [nodes, edges, setNodes, emit],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, edges);
      setEdges(next);
      emit(nodes, next);
    },
    [nodes, edges, setEdges, emit],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      const next = addEdge(
        { ...conn, id: nanoid(8), animated: true },
        edges,
      );
      setEdges(next);
      emit(nodes, next);
    },
    [nodes, edges, setEdges, emit],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect(null)}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-muted/20"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-50" />
        <Controls className="!bg-card !border !border-border !rounded-md !shadow-sm" />
        <MiniMap
          className="!bg-card !border !border-border !rounded-md"
          nodeColor={(n) => {
            const t = (n.data as WorkflowNodeData)?.nodeType;
            switch (t) {
              case "trigger": return "#f59e0b";
              case "model": return "#8b5cf6";
              case "condition": return "#3b82f6";
              case "end": return "#f43f5e";
              default: return "#94a3b8";
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette — drag/click to add new nodes
// ─────────────────────────────────────────────────────────────────────────────

interface PaletteProps {
  onAddNode: (type: NodeType) => void;
}

export function NodePalette({ onAddNode }: PaletteProps) {
  const items: { type: NodeType; label: string; desc: string }[] = [
    { type: "trigger", label: "Trigger", desc: "Entry point" },
    { type: "model", label: "Model", desc: "Call an LLM" },
    { type: "condition", label: "Condition", desc: "Branch on variable" },
    { type: "end", label: "End", desc: "Terminate workflow" },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => {
        const meta = NODE_META[item.type];
        const Icon = meta.icon;
        return (
          <button
            key={item.type}
            onClick={() => onAddNode(item.type)}
            className={cn(
              "flex items-center gap-2.5 p-2.5 rounded-md border text-left transition-colors",
              "border-border hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <div className={cn("p-1.5 rounded border", meta.color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-[10px] text-muted-foreground">{item.desc}</div>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

// Re-export for the parent component to use when adding nodes
export function makeNewNode(type: NodeType, position: { x: number; y: number }): Node {
  const meta = NODE_META[type];
  return {
    id: `${type}-${nanoid(6)}`,
    type: "harnessNode",
    position,
    data: {
      label: meta.defaultLabel,
      nodeType: type,
      ...(type === "model" ? { temperature: 0.7, maxTokens: 4096 } : {}),
      ...(type === "condition"
        ? { conditionField: "", conditionOp: ">" as const, conditionValue: "" }
        : {}),
    },
  };
}
