/**
 * API helpers for talking to our own backend.
 */

export interface Credential {
  id: string;
  name: string;
  provider: string;
  providerLabel?: string;
  /** Wire protocol of the upstream ("anthropic" | "openai_compat"). */
  protocol?: string;
  baseUrl: string | null;
  apiKeyMasked: string;
  notes?: string;
  knownModels?: string[];
  discoveredModelCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderPreset {
  key: string;
  label: string;
  description: string;
  defaultBaseUrl: string | null;
  docsUrl: string;
  supportsDiscovery: boolean;
  knownModels?: string[];
  protocol?: string;
}

export interface ProviderModel {
  id: string;
  credentialId: string;
  modelId: string;
  displayName: string;
  contextWindow: number | null;
  isVision: boolean;
  isReasoning: boolean;
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
  lastSeenAt: string;
}

export type PhaseKeyT = "PLAN" | "EXECUTE" | "REVIEW" | "UTILITY";
export type RouteKeyT = PhaseKeyT | "FALLBACK";

export interface RouteTarget {
  credentialId: string | null;
  modelId: string | null;
  thinkingOverride?: "preserve" | "disable" | { type: "enabled"; budget_tokens: number };
}

export interface DetectionRule {
  id: string;
  name: string;
  field: "requestedModel" | "tools" | "systemPrompt" | "lastMessages";
  operator: "contains" | "regex" | "equals";
  value: string;
  phase: PhaseKeyT;
  enabled: boolean;
  priority: number;
}

export interface RouterConfigData {
  version: 1;
  routes: Record<RouteKeyT, RouteTarget>;
  rules: DetectionRule[];
}

export interface RouterConfigResponse {
  id: string;
  version: number;
  config: RouterConfigData;
}

export interface Execution {
  id: string;
  harnessId: string | null;
  harnessName: string | null;
  status: "running" | "completed" | "failed" | "cancelled";
  phase: PhaseKeyT | null;
  matchedRule: string | null;
  requestedModel: string | null;
  routedModel: string | null;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  durationMs: number;
  errorMessage: string | null;
  nodeRunCount: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface NodeRun {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string | null;
  status: "running" | "completed" | "failed" | "skipped";
  input: unknown;
  output: unknown;
  modelUsed: string | null;
  credentialId: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ExecutionDetail extends Execution {
  request: unknown;
  response: unknown;
  routedCredentialId: string | null;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Credentials
  listCredentials: () => jsonFetch<{ credentials: Credential[]; presets: ProviderPreset[] }>("/api/credentials"),
  createCredential: (body: {
    name: string;
    providerKey: string;
    providerLabel?: string;
    baseUrl?: string;
    apiKey: string;
    organization?: string;
    headers?: Record<string, string>;
    notes?: string;
    autoDiscover?: boolean;
  }) => jsonFetch<Credential & { discoveredCount: number }>("/api/credentials", { method: "POST", body: JSON.stringify(body) }),
  deleteCredential: (id: string) =>
    jsonFetch<{ ok: true }>(`/api/credentials/${id}`, { method: "DELETE" }),
  updateCredential: (id: string, body: { name?: string; notes?: string; apiKey?: string; baseUrl?: string }) =>
    jsonFetch<{ id: string; updatedAt: string }>(`/api/credentials/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  discoverModels: (id: string) =>
    jsonFetch<{ count: number; models: ProviderModel[] }>(`/api/credentials/${id}/models`, { method: "POST" }),
  listModels: (id: string) => jsonFetch<{ models: ProviderModel[] }>(`/api/credentials/${id}/models`),

  // Phase router
  getRouter: () => jsonFetch<RouterConfigResponse>("/api/router"),
  updateRouter: (config: RouterConfigData) =>
    jsonFetch<RouterConfigResponse>("/api/router", { method: "PUT", body: JSON.stringify({ config }) }),

  // Executions
  listExecutions: (limit = 20, offset = 0) =>
    jsonFetch<{ executions: Execution[]; total: number }>(
      `/api/executions?limit=${limit}&offset=${offset}`,
    ),
  getExecution: (id: string) => jsonFetch<ExecutionDetail>(`/api/executions/${id}`),

  // Settings
  getSettings: () =>
    jsonFetch<{
      gatewayBaseUrl: string;
      authEnabled: boolean;
      apiKeyMasked: string | null;
      routerConfigured: boolean;
      credentialCount: number;
      encryptionKeySet: boolean;
      claudeCodeEnv: { ANTHROPIC_BASE_URL: string; ANTHROPIC_AUTH_TOKEN: string };
    }>("/api/settings"),
};
