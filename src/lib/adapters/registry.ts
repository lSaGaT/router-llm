/**
 * Adapter registry — given a credential row from the DB, instantiate the right adapter.
 *
 * This is the single place that knows the mapping:
 *   credential.provider → adapter class
 *
 * Adding a new provider = adding a new case here.
 */
import { AnthropicAdapter } from "./anthropic";
import { OpenAICompatibleAdapter } from "./openai-compatible";
import type { CredentialPayload, ModelAdapter } from "@/lib/workflow/types";
import { decryptCredentialPayload } from "@/lib/crypto";

interface CredentialRow {
  id: string;
  provider: string;
  baseUrl: string | null;
  encryptedSecret: string;
  ivAuth: string;
}

export async function getAdapterForCredential(
  credential: CredentialRow,
): Promise<{ adapter: ModelAdapter; payload: CredentialPayload }> {
  const payload = decryptCredentialPayload<CredentialPayload>(
    credential.ivAuth,
    credential.encryptedSecret,
  );
  let adapter: ModelAdapter;
  switch (credential.provider) {
    case "anthropic":
      adapter = AnthropicAdapter.fromCredential(payload, credential.baseUrl || undefined);
      break;
    case "openai_compatible":
      if (!credential.baseUrl) {
        throw new Error(
          `Credential ${credential.id} is openai_compatible but has no baseUrl configured.`,
        );
      }
      adapter = OpenAICompatibleAdapter.fromCredential(payload, credential.baseUrl);
      break;
    default:
      throw new Error(`Unknown provider: ${credential.provider}`);
  }
  return { adapter, payload };
}

/** Provider presets shown in the UI when creating a credential. */
export interface ProviderPreset {
  key: string;
  label: string;
  description: string;
  defaultBaseUrl: string | null;
  docsUrl: string;
  supportsDiscovery: boolean; // has /v1/models endpoint
  knownModels?: string[]; // hints for the UI
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    key: "anthropic",
    label: "Anthropic",
    description: "Claude models (Opus, Sonnet, Haiku). Native Anthropic API.",
    defaultBaseUrl: null, // uses adapter default https://api.anthropic.com
    docsUrl: "https://docs.anthropic.com",
    supportsDiscovery: false,
    knownModels: [
      "claude-opus-4-5",
      "claude-sonnet-4-5",
      "claude-haiku-4-5",
      "claude-3-7-sonnet-20250219",
    ],
  },
  {
    key: "openai_compatible",
    label: "Z.ai (GLM)",
    description: "Z.ai API — GLM-4.6, GLM-4.5, GLM-4.5-Air, GLM-4.5V. OpenAI-compatible.",
    defaultBaseUrl: "https://api.z.ai/api/paas/v4",
    docsUrl: "https://docs.z.ai",
    supportsDiscovery: true,
    knownModels: ["glm-4.6", "glm-4.5", "glm-4.5-air", "glm-4.5v", "glm-4-plus"],
  },
  {
    key: "openai_compatible",
    label: "DeepSeek",
    description: "DeepSeek V3.x / R1. OpenAI-compatible.",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    docsUrl: "https://api-docs.deepseek.com",
    supportsDiscovery: true,
    knownModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    key: "openai_compatible",
    label: "OpenRouter",
    description: "Single API key for hundreds of models. OpenAI-compatible.",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    docsUrl: "https://openrouter.ai/docs",
    supportsDiscovery: true,
    knownModels: [],
  },
  {
    key: "openai_compatible",
    label: "OpenAI",
    description: "GPT-4o, o1, o3, etc. OpenAI native (also OpenAI-compatible).",
    defaultBaseUrl: "https://api.openai.com/v1",
    docsUrl: "https://platform.openai.com/docs",
    supportsDiscovery: true,
    knownModels: ["gpt-4o", "gpt-4o-mini", "o1", "o3", "o3-mini"],
  },
  {
    key: "openai_compatible",
    label: "Moonshot (Kimi)",
    description: "Kimi K2 and other Moonshot models. OpenAI-compatible.",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    docsUrl: "https://platform.moonshot.cn/docs",
    supportsDiscovery: true,
    knownModels: ["kimi-k2-0905-preview", "moonshot-v1-128k"],
  },
  {
    key: "openai_compatible",
    label: "Google AI (Gemini via OpenAI-compat)",
    description: "Gemini 2.x via Google's OpenAI-compatible endpoint.",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    docsUrl: "https://ai.google.dev/gemini-api/docs/openai",
    supportsDiscovery: true,
    knownModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
  {
    key: "openai_compatible",
    label: "Ollama (local)",
    description: "Run models locally. Make sure Ollama is running and serves /v1.",
    defaultBaseUrl: "http://localhost:11434/v1",
    docsUrl: "https://ollama.com/blog/openai-compatibility",
    supportsDiscovery: true,
    knownModels: [],
  },
  {
    key: "openai_compatible",
    label: "Custom OpenAI-compatible",
    description: "Any provider that implements /v1/chat/completions (vLLM, LocalAI, LM Studio, Together, Groq, ...).",
    defaultBaseUrl: "",
    docsUrl: "",
    supportsDiscovery: true,
    knownModels: [],
  },
];
