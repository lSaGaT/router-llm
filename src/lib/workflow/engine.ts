/**
 * Workflow engine — the heart of the LLM Harness.
 *
 * Responsibilities:
 * 1. Parse a WorkflowDefinition (graph of nodes/edges)
 * 2. Traverse from the Trigger node, executing each node in order
 * 3. For Model nodes: call the appropriate LLM adapter, stream tokens back to the client
 * 4. For Condition nodes: evaluate the condition, branch via the sourceHandle
 * 5. For End nodes: terminate, finalize the Anthropic-format response
 * 6. Log every node execution to the DB (NodeRun) for replay/debugging
 *
 * Design notes:
 * - Synchronous traversal (BFS) for MVP. Parallel branches + Human Approval
 *   nodes come in Phase 2 (requires pause/resume via Redis).
 * - The engine stays Anthropic-format-native at the boundary: input is Anthropic
 *   messages, output is Anthropic SSE stream. Internally, messages may be
 *   converted to OpenAI format by the adapter.
 * - The engine is intentionally provider-agnostic: it only knows "call this
 *   adapter with these messages". All provider quirks live in the adapter.
 */

import { db } from "@/lib/db";
import { getAdapterForCredential } from "@/lib/adapters/registry";
import type {
  AnthropicSSEChunk,
  ExecutionContext,
  Message,
  ModelCallRequest,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowNodeData,
} from "./types";

const MAX_STEPS = 50; // Safety limit — prevents infinite loops in cyclic graphs

export interface EngineRunOptions {
  executionId: string;
  harnessId: string | null;
  workflow: WorkflowDefinition;
  inputMessages: Message[];
  requestedModel: string;
  stream: (chunk: AnthropicSSEChunk) => void;
  signal?: AbortSignal;
}

export interface EngineRunResult {
  finalText: string;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  nodeRunIds: string[]; // IDs of NodeRun rows created
}

/**
 * Execute a workflow. Returns when the graph traversal completes or an End
 * node is reached.
 */
export async function executeWorkflow(opts: EngineRunOptions): Promise<EngineRunResult> {
  const { executionId, harnessId, workflow, inputMessages, requestedModel, stream, signal } = opts;

  // Build adjacency map for fast lookup
  const nodeMap = new Map<string, WorkflowNode>();
  for (const n of workflow.nodes) nodeMap.set(n.id, n);

  const outEdges = new Map<string, { target: string; sourceHandle: string | null }[]>();
  for (const e of workflow.edges) {
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push({
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
    });
  }

  // Find the trigger node
  const trigger = workflow.nodes.find((n) => n.data.nodeType === "trigger");
  if (!trigger) {
    throw new Error("Workflow has no Trigger node — cannot start execution.");
  }

  const ctx: ExecutionContext = {
    executionId,
    harnessId,
    inputMessages,
    requestedModel,
    conversation: [...inputMessages],
    variables: {},
    nodeOutputs: {},
    stream,
    signal,
    log: (msg, level = "info") => {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        `[exec:${executionId}] ${msg}`,
      );
    },
  };

  let currentNode: WorkflowNode | undefined = trigger;
  let steps = 0;
  const nodeRunIds: string[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCostUsd = 0;
  let finalText = "";

  while (currentNode && steps < MAX_STEPS) {
    steps++;
    if (signal?.aborted) {
      ctx.log("Execution aborted by client", "warn");
      break;
    }

    const data = currentNode.data;
    const nodeRunId = await db.nodeRun.create({
      data: {
        executionId,
        nodeId: currentNode.id,
        nodeType: data.nodeType,
        nodeLabel: data.label,
        status: "running",
        inputJson: JSON.stringify({
          conversation: ctx.conversation,
          variables: ctx.variables,
        }),
      },
    });
    nodeRunIds.push(nodeRunId.id);

    try {
      const result = await executeNode(currentNode, ctx, nodeRunId.id);
      if (result.tokensIn) totalTokensIn += result.tokensIn;
      if (result.tokensOut) totalTokensOut += result.tokensOut;
      if (result.costUsd) totalCostUsd += result.costUsd;
      if (result.finalText) finalText = result.finalText;

      // Find next node — branches via sourceHandle for conditions
      const edges = outEdges.get(currentNode.id) || [];
      const nextEdge = pickNextEdge(edges, result.branch, data);
      currentNode = nextEdge ? nodeMap.get(nextEdge.target) : undefined;

      await db.nodeRun.update({
        where: { id: nodeRunId.id },
        data: {
          status: "completed",
          outputJson: JSON.stringify(result.output || {}),
          modelUsed: result.modelUsed || null,
          credentialId: result.credentialId || null,
          tokensIn: result.tokensIn || 0,
          tokensOut: result.tokensOut || 0,
          costUsd: result.costUsd || 0,
          latencyMs: result.latencyMs || 0,
          finishedAt: new Date(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.log(`Node ${currentNode.id} failed: ${message}`, "error");
      await db.nodeRun.update({
        where: { id: nodeRunId.id },
        data: {
          status: "failed",
          errorMessage: message,
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  if (steps >= MAX_STEPS) {
    ctx.log(`Execution aborted: exceeded ${MAX_STEPS} steps`, "warn");
  }

  return {
    finalText,
    totalTokensIn,
    totalTokensOut,
    totalCostUsd,
    nodeRunIds,
  };
}

interface NodeResult {
  output?: unknown;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs?: number;
  modelUsed?: string;
  credentialId?: string;
  branch?: "true" | "false" | null; // for condition nodes
  finalText?: string;
}

async function executeNode(
  node: WorkflowNode,
  ctx: ExecutionContext,
  _nodeRunId: string,
): Promise<NodeResult> {
  const data: WorkflowNodeData = node.data;

  switch (data.nodeType) {
    case "trigger":
      return { output: { triggered: true } };

    case "model":
      return executeModelNode(node, ctx);

    case "condition":
      return executeConditionNode(node, ctx);

    case "end":
      return executeEndNode(node, ctx);

    default:
      throw new Error(`Unknown node type: ${data.nodeType}`);
  }
}

/** Model node: call an LLM via the credential's adapter, stream tokens to client. */
async function executeModelNode(
  node: WorkflowNode,
  ctx: ExecutionContext,
): Promise<NodeResult> {
  const data = node.data;
  if (!data.credentialId) throw new Error("Model node has no credential selected");
  if (!data.modelId) throw new Error("Model node has no model selected");

  const credential = await db.credential.findUnique({ where: { id: data.credentialId } });
  if (!credential) throw new Error(`Credential ${data.credentialId} not found`);

  const { adapter } = await getAdapterForCredential(credential);

  const callReq: ModelCallRequest = {
    modelId: data.modelId,
    messages: ctx.conversation,
    systemPrompt: data.systemPrompt,
    temperature: data.temperature,
    maxTokens: data.maxTokens,
    topP: data.topP,
    thinking: data.thinking,
    thinkingBudget: data.thinkingBudget,
    signal: ctx.signal,
  };

  ctx.log(`Calling model ${data.modelId} via ${credential.provider}`);

  // Emit message_start + content_block_start before streaming tokens
  ctx.stream({
    type: "message_start",
    message: {
      id: `msg_${node.id}_${Date.now()}`,
      type: "message",
      role: "assistant",
      content: [],
      model: data.modelId,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  });
  ctx.stream({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });

  let fullText = "";
  const meta = await adapter.stream(callReq, (token) => {
    fullText += token;
    ctx.stream({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: token },
    });
  });

  ctx.stream({ type: "content_block_stop", index: 0 });
  ctx.stream({
    type: "message_delta",
    delta: { stop_reason: "end_turn", stop_sequence: null },
    usage: { output_tokens: meta.tokensOut },
  });

  // Append assistant reply to conversation
  ctx.conversation.push({ role: "assistant", content: fullText });
  ctx.nodeOutputs[node.id] = {
    text: fullText,
    modelUsed: meta.modelUsed,
    tokensIn: meta.tokensIn,
    tokensOut: meta.tokensOut,
    costUsd: meta.costUsd,
  };

  return {
    output: ctx.nodeOutputs[node.id],
    tokensIn: meta.tokensIn,
    tokensOut: meta.tokensOut,
    costUsd: meta.costUsd,
    latencyMs: meta.latencyMs,
    modelUsed: meta.modelUsed,
    credentialId: data.credentialId,
  };
}

/** Condition node: evaluate field op value, return branch. */
function executeConditionNode(node: WorkflowNode, ctx: ExecutionContext): NodeResult {
  const data = node.data;
  const field = data.conditionField;
  const op = data.conditionOp;
  const rawValue = data.conditionValue;
  if (!field || !op || rawValue === undefined || rawValue === "") {
    // Empty condition — default to true branch
    return { output: { branch: "true" }, branch: "true" };
  }

  // Read the field value from variables, or from the last assistant message
  let leftValue: unknown = ctx.variables[field];
  if (leftValue === undefined) {
    // Try to extract from last assistant message — e.g. parse "score: 72"
    const lastAssistant = [...ctx.conversation]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistant) {
      const match = new RegExp(`${field}\\s*[:=]\\s*([0-9.]+|true|false|"[^"]*"|'[^']*')`, "i")
        .exec(lastAssistant.content);
      if (match) {
        const v = match[1];
        leftValue = /^-?\d+(\.\d+)?$/.test(v)
          ? Number(v)
          : v === "true"
            ? true
            : v === "false"
              ? false
              : v.replace(/^["']|["']$/g, "");
      }
    }
  }

  // Try numeric comparison if both look numeric
  const leftNum = typeof leftValue === "number" ? leftValue : Number(leftValue);
  const rightNum = typeof rawValue === "number" ? rawValue : Number(rawValue);
  const bothNumeric = !isNaN(leftNum) && !isNaN(rightNum);

  let result = false;
  if (op === "contains") {
    result = String(leftValue ?? "").includes(String(rawValue));
  } else if (bothNumeric) {
    switch (op) {
      case ">": result = leftNum > rightNum; break;
      case ">=": result = leftNum >= rightNum; break;
      case "<": result = leftNum < rightNum; break;
      case "<=": result = leftNum <= rightNum; break;
      case "==": result = leftNum === rightNum; break;
      case "!=": result = leftNum !== rightNum; break;
    }
  } else {
    // String comparison
    const l = String(leftValue ?? "");
    const r = String(rawValue);
    switch (op) {
      case "==": result = l === r; break;
      case "!=": result = l !== r; break;
      case "contains": result = l.includes(r); break;
    }
  }

  const branch = result ? "true" : "false";
  ctx.variables[`__lastCondition_${node.id}`] = branch;
  ctx.log(`Condition ${field} ${op} ${rawValue} → ${branch}`);
  return { output: { branch, leftValue }, branch };
}

/** End node: terminate. We do NOT emit message_stop here — caller does that. */
function executeEndNode(node: WorkflowNode, ctx: ExecutionContext): NodeResult {
  // The last assistant message text is what we send to the client as the final reply
  const lastAssistant = [...ctx.conversation]
    .reverse()
    .find((m) => m.role === "assistant");
  const finalText = lastAssistant?.content || "";
  ctx.log(`End node reached. Final text length: ${finalText.length}`);
  return { output: { ended: true }, finalText };
}

function pickNextEdge(
  edges: { target: string; sourceHandle: string | null }[],
  branch: "true" | "false" | null | undefined,
  _data: WorkflowNodeData,
): { target: string; sourceHandle: string | null } | undefined {
  if (!branch) {
    // No branching — just take the first edge
    return edges[0];
  }
  // For condition nodes, match the sourceHandle to the branch result
  const matched = edges.find((e) => e.sourceHandle === branch);
  if (matched) return matched;
  // Fallback: if no edge with the matching handle, take any edge
  return edges[0];
}
