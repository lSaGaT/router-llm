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
import type { CredentialPayload, ModelAdapter } from "@/lib/adapters/types";
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
  /** Wire protocol for the router dispatch. Defaults by key (see presetProtocol). */
  protocol?: "anthropic" | "openai_compat";
}

/** Resolve the wire protocol of a preset — explicit value wins, else by key. */
export function presetProtocol(preset: ProviderPreset): "anthropic" | "openai_compat" {
  if (preset.protocol === "anthropic" || preset.protocol === "openai_compat") return preset.protocol;
  return preset.key === "anthropic" ? "anthropic" : "openai_compat";
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  // ─── Anthropic (native) ───
  {
    key: "anthropic",
    label: "Anthropic (Claude)",
    description: "Claude Opus, Sonnet, Haiku — incl. 4.5, 4.1, 3.7. Native Anthropic Messages API.",
    defaultBaseUrl: null, // uses adapter default https://api.anthropic.com
    docsUrl: "https://docs.anthropic.com",
    supportsDiscovery: false,
    knownModels: [
      "claude-opus-4-5",
      "claude-opus-4-1-20250805",
      "claude-sonnet-4-5",
      "claude-sonnet-4-5-20250929",
      "claude-haiku-4-5",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-haiku-20241022",
      "claude-3-5-sonnet-20241022",
    ],
  },

  // ─── Z.ai (GLM) — Anthropic-protocol endpoint (used by the phase router) ───
  {
    key: "anthropic",
    label: "Z.ai (GLM) — Anthropic API",
    description:
      "GLM via Z.ai's Anthropic-native endpoint. Required for the phase router (transparent proxy — tools and thinking pass through).",
    defaultBaseUrl: "https://api.z.ai/api/anthropic",
    docsUrl: "https://docs.z.ai/devpack/tooluse/claude",
    supportsDiscovery: false,
    knownModels: [
      "glm-5.3",
      "glm-5.2",
      "glm-5-turbo",
      "glm-4.6",
      "glm-4.5",
      "glm-4.5-air",
    ],
  },

  // ─── Z.ai (GLM) ───
  {
    key: "openai_compatible",
    label: "Z.ai (GLM)",
    description: "GLM 5.3, 5.2, 5.0, 4.7, 4.6, 4.5, 4.5-Air, 4.5V (Vision). OpenAI-compatible.",
    defaultBaseUrl: "https://api.z.ai/api/paas/v4",
    docsUrl: "https://docs.z.ai",
    supportsDiscovery: true,
    knownModels: [
      "glm-5.3",
      "glm-5.2",
      "glm-5.0",
      "glm-4.7",
      "glm-4.6",
      "glm-4.5",
      "glm-4.5-air",
      "glm-4.5v",
      "glm-4-plus",
      "glm-4-long",
    ],
  },

  // ─── DeepSeek ───
  {
    key: "openai_compatible",
    label: "DeepSeek",
    description: "DeepSeek V4, V3.x, R1 (reasoner), Coder. OpenAI-compatible.",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    docsUrl: "https://api-docs.deepseek.com",
    supportsDiscovery: true,
    knownModels: [
      "deepseek-v4",
      "deepseek-v4-flash",
      "deepseek-chat",
      "deepseek-reasoner",
      "deepseek-coder",
    ],
  },

  // ─── OpenAI ───
  {
    key: "openai_compatible",
    label: "OpenAI",
    description: "GPT-4.1, GPT-4o, o3, o1, GPT-5. OpenAI native API.",
    defaultBaseUrl: "https://api.openai.com/v1",
    docsUrl: "https://platform.openai.com/docs",
    supportsDiscovery: true,
    knownModels: [
      "gpt-5",
      "gpt-5-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "o3",
      "o3-mini",
      "o1",
      "o1-mini",
    ],
  },

  // ─── xAI (Grok) ───
  {
    key: "openai_compatible",
    label: "xAI (Grok)",
    description: "Grok 4, Grok 4-fast, Grok 3, Grok 2. OpenAI-compatible.",
    defaultBaseUrl: "https://api.x.ai/v1",
    docsUrl: "https://docs.x.ai",
    supportsDiscovery: true,
    knownModels: [
      "grok-4",
      "grok-4-fast",
      "grok-4-fast-reasoning",
      "grok-code-fast-1",
      "grok-3",
      "grok-3-mini",
      "grok-2",
      "grok-2-vision",
    ],
  },

  // ─── MiniMax ───
  {
    key: "openai_compatible",
    label: "MiniMax",
    description: "MiniMax M3, M2, Text-01. OpenAI-compatible.",
    defaultBaseUrl: "https://api.minimaxi.com/v1",
    docsUrl: "https://platform.minimaxi.com/document",
    supportsDiscovery: true,
    knownModels: [
      "MiniMax-M3",
      "MiniMax-M2",
      "MiniMax-Text-01",
      "abab-7-chat-preview",
    ],
  },

  // ─── Moonshot (Kimi) ───
  {
    key: "openai_compatible",
    label: "Moonshot (Kimi)",
    description: "Kimi K2, Moonshot v1 (8K/32K/128K context). OpenAI-compatible.",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    docsUrl: "https://platform.moonshot.cn/docs",
    supportsDiscovery: true,
    knownModels: [
      "kimi-k2-0905-preview",
      "kimi-k2-turbo-preview",
      "moonshot-v1-128k",
      "moonshot-v1-32k",
      "moonshot-v1-8k",
    ],
  },

  // ─── Mistral ───
  {
    key: "openai_compatible",
    label: "Mistral",
    description: "Mistral Large, Medium, Small, Codestral. OpenAI-compatible.",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    docsUrl: "https://docs.mistral.ai",
    supportsDiscovery: true,
    knownModels: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "codestral-latest",
      "mistral-nemo",
      "open-mistral-7b",
    ],
  },

  // ─── Google Gemini (via OpenAI-compat endpoint) ───
  {
    key: "openai_compatible",
    label: "Google (Gemini)",
    description: "Gemini 2.5 Pro / Flash, 2.0 Flash. Google's OpenAI-compatible endpoint.",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    docsUrl: "https://ai.google.dev/gemini-api/docs/openai",
    supportsDiscovery: true,
    knownModels: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
  },

  // ─── Google (Gemini) — Anthropic-protocol endpoint (experimental) ───
  {
    key: "anthropic",
    label: "Google (Gemini) — Anthropic API (experimental)",
    description:
      "Gemini via Google's Anthropic-compatible endpoint. Passes through the router without translation (no tool-stream translation layer); compare with the OpenAI-compatible preset above.",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/anthropic",
    docsUrl: "https://ai.google.dev/gemini-api/docs/anthropic-api",
    supportsDiscovery: false,
    knownModels: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
    ],
  },

  // ─── DeepSeek — Anthropic-protocol endpoint (experimental) ───
  {
    key: "anthropic",
    label: "DeepSeek — Anthropic API (experimental)",
    description:
      "DeepSeek's Anthropic-native endpoint. Passes through the router without translation.",
    defaultBaseUrl: "https://api.deepseek.com/anthropic",
    docsUrl: "https://api-docs.deepseek.com/guides/anthropic_api",
    supportsDiscovery: false,
    knownModels: [
      "deepseek-chat",
      "deepseek-reasoner",
    ],
  },

  // ─── Groq (ultra-fast inference) ───
  {
    key: "openai_compatible",
    label: "Groq",
    description: "Llama, Mixtral, Qwen, etc. served ultra-fast on Groq LPU. OpenAI-compatible.",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    docsUrl: "https://console.groq.com/docs",
    supportsDiscovery: true,
    knownModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-instruct",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "qwen-2.5-coder-32b",
      "deepseek-r1-distill-llama-70b",
    ],
  },

  // ─── Together AI ───
  {
    key: "openai_compatible",
    label: "Together AI",
    description: "Llama, Qwen, DeepSeek, Mistral, etc. on Together's hosted inference. OpenAI-compatible.",
    defaultBaseUrl: "https://api.together.xyz/v1",
    docsUrl: "https://docs.together.ai",
    supportsDiscovery: true,
    knownModels: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
      "deepseek-ai/DeepSeek-R1",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
  },

  // ─── Perplexity ───
  {
    key: "openai_compatible",
    label: "Perplexity (sonar)",
    description: "Sonar (Llama 3.1 / 3.3 based) with built-in web search. OpenAI-compatible.",
    defaultBaseUrl: "https://api.perplexity.ai",
    docsUrl: "https://docs.perplexity.ai",
    supportsDiscovery: true,
    knownModels: [
      "sonar-pro",
      "sonar",
      "sonar-reasoning",
      "sonar-reasoning-pro",
      "sonar-deep-research",
      "llama-3.1-sonar-large-128k-online",
    ],
  },

  // ─── Cohere ───
  {
    key: "openai_compatible",
    label: "Cohere (Command)",
    description: "Command R+, Command R, Aya. OpenAI-compatible endpoint.",
    defaultBaseUrl: "https://api.cohere.ai/compatibility/v1",
    docsUrl: "https://docs.cohere.com/docs/cohere-ocr",
    supportsDiscovery: true,
    knownModels: [
      "command-r-plus",
      "command-r",
      "command-r7b",
      "command-a-03-2025",
      "aya-experimental-32b",
    ],
  },

  // ─── Fireworks AI ───
  {
    key: "openai_compatible",
    label: "Fireworks AI",
    description: "Llama, Qwen, DeepSeek, Mistral, etc. served fast. OpenAI-compatible.",
    defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
    docsUrl: "https://docs.fireworks.ai",
    supportsDiscovery: true,
    knownModels: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/qwen2p5-72b-instruct",
      "accounts/fireworks/models/deepseek-v3",
      "accounts/fireworks/models/deepseek-r1",
    ],
  },

  // ─── Novita AI ───
  {
    key: "openai_compatible",
    label: "Novita AI",
    description: "Llama, DeepSeek, Qwen, Mistral, etc. at low cost. OpenAI-compatible.",
    defaultBaseUrl: "https://api.novita.ai/v3/openai",
    docsUrl: "https://novita.ai/docs",
    supportsDiscovery: true,
    knownModels: [
      "deepseek/deepseek-v3-0324",
      "deepseek/deepseek-r1",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen2.5-72b-instruct",
    ],
  },

  // ─── AI21 Labs ───
  {
    key: "openai_compatible",
    label: "AI21 Labs (Jamba)",
    description: "Jamba 1.5, Jurassic-2. OpenAI-compatible.",
    defaultBaseUrl: "https://api.ai21.com/v1",
    docsUrl: "https://docs.ai21.com",
    supportsDiscovery: true,
    knownModels: [
      "jamba-1.5-large",
      "jamba-1.5-mini",
      "j2-ultra",
      "j2-mid",
    ],
  },

  // ─── OpenRouter (universal gateway) ───
  {
    key: "openai_compatible",
    label: "OpenRouter",
    description: "Single API key for hundreds of models from all providers. OpenAI-compatible.",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    docsUrl: "https://openrouter.ai/docs",
    supportsDiscovery: true,
    knownModels: [
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-4o",
      "google/gemini-2.5-pro",
      "deepseek/deepseek-chat",
      "x-ai/grok-4",
    ],
  },

  // ─── Ollama (local) ───
  {
    key: "openai_compatible",
    label: "Ollama (local)",
    description: "Run models locally (Llama, Qwen, DeepSeek, etc.). Make sure Ollama serves /v1.",
    defaultBaseUrl: "http://localhost:11434/v1",
    docsUrl: "https://ollama.com/blog/openai-compatibility",
    supportsDiscovery: true,
    knownModels: [
      "llama3.3",
      "qwen2.5",
      "deepseek-r1",
      "mistral",
      "codellama",
    ],
  },

  // ─── LM Studio (local) ───
  {
    key: "openai_compatible",
    label: "LM Studio (local)",
    description: "Run GGUF models locally. Make sure LM Studio's server is running on port 1234.",
    defaultBaseUrl: "http://localhost:1234/v1",
    docsUrl: "https://lmstudio.ai/docs/api/openai-api",
    supportsDiscovery: true,
    knownModels: [],
  },

  // ─── vLLM (custom local/remote) ───
  {
    key: "openai_compatible",
    label: "vLLM / SGLang / Custom",
    description: "Any provider that implements /v1/chat/completions. vLLM, SGLang, LocalAI, TGI, etc.",
    defaultBaseUrl: "",
    docsUrl: "https://docs.vllm.ai/en/stable/serving/openai_compatible_api.html",
    supportsDiscovery: true,
    knownModels: [],
  },
];
