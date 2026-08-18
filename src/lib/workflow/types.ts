/**
 * Core types for the LLM Harness workflow engine.
 *
 * A Harness is a directed graph of Nodes. The engine traverses the graph
 * starting from a Trigger node, executing each Node and forwarding context
 * along edges. Conditions branch the flow; End nodes terminate.
 *
 * The graph is serializable as JSON (WorkflowDefinition) so it can be saved
 * to the database, versioned in Git, or shared as a file.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Workflow definition (persisted as harness.graphJson)
// ─────────────────────────────────────────────────────────────────────────────

export type NodeType = "trigger" | "model" | "condition" | "end";

export interface WorkflowNodeData {
  label: string;
  nodeType: NodeType;
  // Model node:
  credentialId?: string;
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  // Reasoning/thinking toggle (e.g. for Claude "extended thinking", GLM "thinking")
  thinking?: boolean;
  thinkingBudget?: number;
  // Condition node:
  conditionField?: string; // e.g. "score", "tokens", "complexity"
  conditionOp?: ">" | ">=" | "<" | "<=" | "==" | "!=" | "contains";
  conditionValue?: string | number;
  // Edge labels for branching (true / false):
  // edges carry "sourceHandle" = "true" | "false"
  [key: string]: unknown;
}

export interface WorkflowNode {
  id: string;
  type: "harnessNode"; // React Flow custom node type
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null; // "true" | "false" | null (default out)
  animated?: boolean;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime execution context
// ─────────────────────────────────────────────────────────────────────────────

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  // For Anthropic format compatibility:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/** Context passed through the graph during execution. */
export interface ExecutionContext {
  executionId: string;
  harnessId: string | null;
  /** Original Anthropic-format messages received at the gateway. */
  inputMessages: Message[];
  /** Original model requested by the client (used for fallback / logging). */
  requestedModel: string;
  /** Accumulated conversation messages (each model node can append/replace). */
  conversation: Message[];
  /** Free-form variables that can be set/read by nodes (e.g. review score). */
  variables: Record<string, unknown>;
  /** Per-node outputs (for replay). */
  nodeOutputs: Record<string, unknown>;
  /** Streaming callback — emits Anthropic-format SSE chunks back to client. */
  stream: (chunk: AnthropicSSEChunk) => void;
  /** Signal for cancellation. */
  signal?: AbortSignal;
  /** Logger. */
  log: (message: string, level?: "info" | "warn" | "error") => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic-compatible types (subset we support at the gateway)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string | AnthropicContentBlock[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: { type: "text"; text: string }[];
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

// SSE events we emit (Anthropic format):
// - message_start
// - content_block_start
// - content_block_delta
// - content_block_stop
// - message_delta
// - message_stop
export type AnthropicSSEChunk =
  | {
      type: "message_start";
      message: {
        id: string;
        type: "message";
        role: "assistant";
        content: [];
        model: string;
        stop_reason: null;
        stop_sequence: null;
        usage: { input_tokens: number; output_tokens: number };
      };
    }
  | { type: "content_block_start"; index: number; content_block: { type: "text"; text: "" } }
  | {
      type: "content_block_delta";
      index: number;
      delta: { type: "text_delta"; text: string };
    }
  | { type: "content_block_stop"; index: number }
  | {
      type: "message_delta";
      delta: { stop_reason: "end_turn" | "max_tokens" | null; stop_sequence: string | null };
      usage?: { output_tokens: number };
    }
  | { type: "message_stop" };

// ─────────────────────────────────────────────────────────────────────────────
// Model adapter interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelCallRequest {
  modelId: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  thinking?: boolean;
  thinkingBudget?: number;
  signal?: AbortSignal;
}

export interface ModelCallResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  modelUsed: string;
  // Optional: structured output if the model supports JSON mode
  structured?: unknown;
}

export interface ModelAdapter {
  /** Provider key: "anthropic" | "openai_compatible" */
  provider: string;
  /** List available models via /v1/models (or hardcoded for Anthropic). */
  listModels(): Promise<{ id: string; displayName: string }[]>;
  /** Non-streaming call. */
  call(req: ModelCallRequest): Promise<ModelCallResult>;
  /** Streaming call — emits text deltas via onToken. */
  stream(
    req: ModelCallRequest,
    onToken: (text: string) => void,
  ): Promise<Omit<ModelCallResult, "text">>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Credential payload shape
// ─────────────────────────────────────────────────────────────────────────────

export interface CredentialPayload {
  apiKey: string;
  organization?: string;
  // Additional headers to send (e.g. for OpenRouter "HTTP-Referer")
  headers?: Record<string, string>;
}
