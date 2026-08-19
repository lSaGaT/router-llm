/**
 * Phase-router types.
 *
 * The router is a transparent Anthropic-protocol proxy: it detects the
 * "phase" of each incoming /v1/messages request (planning, executing,
 * reviewing, utility) from deterministic signals, then rewrites only the
 * `model` field (and optionally `thinking`) before forwarding upstream.
 */

export const PHASES = ["PLAN", "EXECUTE", "REVIEW", "UTILITY"] as const;
export type PhaseKey = (typeof PHASES)[number];
export type RouteKey = PhaseKey | "FALLBACK";

export const ROUTE_KEYS: RouteKey[] = ["PLAN", "EXECUTE", "REVIEW", "UTILITY", "FALLBACK"];

/** Where a detection rule looks for its match. */
export type DetectionField = "requestedModel" | "tools" | "systemPrompt" | "lastMessages";

/** How a detection rule compares. contains/equals are case-insensitive; regex uses flags "i". */
export type DetectionOperator = "contains" | "regex" | "equals";

export interface RouteTarget {
  /** Credential used for the upstream call. null = not configured → gateway 503. */
  credentialId: string | null;
  /** Free-text model id, e.g. "glm-5.3" or "glm-5.3[1m]". */
  modelId: string | null;
  /** Optional thinking override applied to the forwarded body. */
  thinkingOverride?: "preserve" | "disable" | { type: "enabled"; budget_tokens: number };
}

export interface DetectionRule {
  id: string; // stable anchor for reordering
  name: string; // label in UI; stored in Execution.matchedRule
  field: DetectionField;
  operator: DetectionOperator;
  value: string;
  phase: PhaseKey;
  enabled: boolean;
  priority: number; // lower runs first; UI keeps 0..n-1 contiguous
}

export interface RouterConfigData {
  version: 1;
  routes: Record<RouteKey, RouteTarget>;
  rules: DetectionRule[]; // stored sorted by priority
}

export const DEFAULT_MODELS: Record<RouteKey, string> = {
  PLAN: "glm-5.2",
  EXECUTE: "glm-5.3",
  REVIEW: "glm-5.3",
  UTILITY: "glm-4.5-air",
  FALLBACK: "glm-5.3",
};

export const DEFAULT_ROUTER_CONFIG: RouterConfigData = {
  version: 1,
  routes: {
    PLAN: { credentialId: null, modelId: DEFAULT_MODELS.PLAN, thinkingOverride: "preserve" },
    EXECUTE: { credentialId: null, modelId: DEFAULT_MODELS.EXECUTE, thinkingOverride: "preserve" },
    REVIEW: { credentialId: null, modelId: DEFAULT_MODELS.REVIEW, thinkingOverride: "preserve" },
    UTILITY: { credentialId: null, modelId: DEFAULT_MODELS.UTILITY, thinkingOverride: "preserve" },
    FALLBACK: { credentialId: null, modelId: DEFAULT_MODELS.FALLBACK, thinkingOverride: "preserve" },
  },
  rules: [
    {
      id: "rule_plan_mode",
      name: "Plan mode",
      field: "tools",
      operator: "contains",
      value: "ExitPlanMode",
      phase: "PLAN",
      enabled: true,
      priority: 0,
    },
    {
      id: "rule_utility_haiku",
      name: "Utility (haiku)",
      field: "requestedModel",
      operator: "contains",
      value: "haiku",
      phase: "UTILITY",
      enabled: true,
      priority: 1,
    },
    {
      id: "rule_review_subagent",
      name: "Review subagent",
      field: "systemPrompt",
      operator: "regex",
      value: "code[- ]review|review (the )?(diff|pr|changes)|you are an? .*reviewer",
      phase: "REVIEW",
      enabled: true,
      priority: 2,
    },
  ],
};
