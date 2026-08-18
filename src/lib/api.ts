/**
 * API helpers for talking to our own backend.
 */

export interface Credential {
  id: string;
  name: string;
  provider: string;
  baseUrl: string | null;
  apiKeyMasked: string;
  notes?: string;
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

export interface Harness {
  id: string;
  name: string;
  description: string | null;
  graphJson: string;
  isDeployed: boolean;
  version: number;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Execution {
  id: string;
  harnessId: string | null;
  harnessName: string;
  status: "running" | "completed" | "failed" | "cancelled";
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
  graph: { nodes: unknown[]; edges: unknown[] } | null;
  nodeRuns: NodeRun[];
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
    baseUrl?: string;
    apiKey: string;
    organization?: string;
    headers?: Record<string, string>;
    notes?: string;
  }) => jsonFetch<Credential>("/api/credentials", { method: "POST", body: JSON.stringify(body) }),
  deleteCredential: (id: string) =>
    jsonFetch<{ ok: true }>(`/api/credentials/${id}`, { method: "DELETE" }),
  updateCredential: (id: string, body: { name?: string; notes?: string; apiKey?: string; baseUrl?: string }) =>
    jsonFetch<{ id: string; updatedAt: string }>(`/api/credentials/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  discoverModels: (id: string) =>
    jsonFetch<{ count: number; models: ProviderModel[] }>(`/api/credentials/${id}/models`, { method: "POST" }),
  listModels: (id: string) => jsonFetch<{ models: ProviderModel[] }>(`/api/credentials/${id}/models`),

  // Harnesses
  listHarnesses: () => jsonFetch<{ harnesses: Harness[] }>("/api/harnesses"),
  getHarness: (id: string) => jsonFetch<Harness>(`/api/harnesses/${id}`),
  createHarness: (body: { name: string; description?: string; graphJson: string }) =>
    jsonFetch<Harness>("/api/harnesses", { method: "POST", body: JSON.stringify(body) }),
  updateHarness: (
    id: string,
    body: { name?: string; description?: string; graphJson?: string; isDeployed?: boolean },
  ) => jsonFetch<Harness>(`/api/harnesses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteHarness: (id: string) => jsonFetch<{ ok: true }>(`/api/harnesses/${id}`, { method: "DELETE" }),

  // Executions
  listExecutions: (limit = 20, offset = 0, harnessId?: string) =>
    jsonFetch<{ executions: Execution[]; total: number }>(
      `/api/executions?limit=${limit}&offset=${offset}${harnessId ? `&harnessId=${harnessId}` : ""}`,
    ),
  getExecution: (id: string) => jsonFetch<ExecutionDetail>(`/api/executions/${id}`),

  // Settings
  getSettings: () =>
    jsonFetch<{
      gatewayBaseUrl: string;
      authEnabled: boolean;
      apiKeyMasked: string | null;
      hasDeployedHarness: boolean;
      credentialCount: number;
      encryptionKeySet: boolean;
      claudeCodeEnv: { ANTHROPIC_BASE_URL: string; ANTHROPIC_API_KEY: string };
    }>("/api/settings"),
};
