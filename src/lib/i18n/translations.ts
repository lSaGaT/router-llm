/**
 * Translations for the LLM Harness UI.
 *
 * Three locales: pt-BR (default), en, es.
 *
 * Usage in components:
 *   const { t } = useTranslation();
 *   <h1>{t("nav.harnesses")}</h1>
 *
 * To add a new locale:
 *   1. Add the key to `Locale` type below.
 *   2. Add the locale object to `TRANSLATIONS`.
 *   3. Add the flag emoji + label to `LOCALE_OPTIONS` in the provider.
 */

export type Locale = "pt-BR" | "en" | "es";

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_STORAGE_KEY = "llm-harness-locale";

interface TranslationDict {
  // ─── Header / nav ───
  app: {
    title: string;
    subtitle: string;
    configured: string;
    notConfigured: string;
    bannerTip: string;
    bannerTipLink: string;
    footer: string;
    footerTag: string;
    openSource: string;
  };
  theme: {
    light: string;
    dark: string;
    system: string;
    toggle: string;
  };
  nav: {
    router: string;
    credentials: string;
    executions: string;
    settings: string;
  };

  // ─── Common ───
  common: {
    cancel: string;
    save: string;
    saved: string;
    saveFailed: string;
    delete: string;
    deleted: string;
    edit: string;
    create: string;
    back: string;
    new: string;
    loading: string;
    none: string;
    notSet: string;
    optional: string;
    default: string;
    yes: string;
    no: string;
    search: string;
    refresh: string;
    discover: string;
    discovered: string;
    discoveryFailed: string;
    noModels: string;
    noModelsHint: string;
    pickProvider: string;
    selectProvider: string;
    selectCredential: string;
    selectCredentialFirst: string;
    noCredentialSelected: string;
    noCredentialsYet: string;
    createFirst: string;
    seeDocs: string;
    created: string;
    updated: string;
  };

  // ─── Credentials ───
  credentials: {
    title: string;
    subtitle: string;
    add: string;
    addTitle: string;
    addDescription: string;
    name: string;
    namePlaceholder: string;
    provider: string;
    apiKey: string;
    apiKeyPlaceholder: string;
    baseUrl: string;
    notes: string;
    notesPlaceholder: string;
    newApiKey: string;
    newApiKeyHint: string;
    availableModels: string;
    availableModelsHint: string;
    knownModels: string;
    autoDiscover: string;
    autoDiscoverHintDiscoverable: string;
    autoDiscoverHintBuiltin: string;
    categories: {
      major: string;
      inference: string;
      local: string;
      other: string;
    };
    createdToast: string;
    createdToastDiscovered: string;
    deletedToast: string;
    updatedToast: string;
    discoveredToast: string;
  };

  // ─── Phase router ───
  router: {
    title: string;
    subtitle: string;
    save: string;
    saved: string;
    saveFailed: string;
    loadFailed: string;
    credential: string;
    credentialPlaceholder: string;
    credentialNone: string;
    protocolAnthropic: string;
    protocolOpenAi: string;
    model: string;
    modelPlaceholder: string;
    phases: {
      PLAN: string;
      EXECUTE: string;
      REVIEW: string;
      UTILITY: string;
      FALLBACK: string;
    };
    phaseDesc: {
      PLAN: string;
      EXECUTE: string;
      REVIEW: string;
      UTILITY: string;
      FALLBACK: string;
    };
    banner: {
      noCredential: string;
      noCredentialDesc: string;
      noRules: string;
      noRulesDesc: string;
    };
    rules: {
      title: string;
      subtitle: string;
      add: string;
      newName: string;
      enabled: string;
      name: string;
      value: string;
      invalidRegex: string;
    };
    fields: {
      requestedModel: string;
      tools: string;
      systemPrompt: string;
      lastMessages: string;
    };
    operators: {
      contains: string;
      regex: string;
      equals: string;
    };
  };

  // ─── Executions ───
  executions: {
    title: string;
    subtitle: string;
    noExecutions: string;
    noExecutionsHint: string;
    backToList: string;
    detail: string;
    duration: string;
    tokens: string;
    tokensInOut: string;
    cost: string;
    matchedRule: string;
    routedModel: string;
    requestSummary: string;
    responseSummary: string;
    error: string;
    columns: {
      phase: string;
      model: string;
      status: string;
      duration: string;
      tokens: string;
      cost: string;
    };
    statuses: {
      running: string;
      completed: string;
      failed: string;
      cancelled: string;
    };
  };

  // ─── Auth / Lock ───
  auth: {
    lockTitle: string;
    lockSubtitle: string;
    pinPlaceholder: string;
    unlock: string;
    wrongPin: string;
    setupTitle: string;
    setupSubtitle: string;
    setupPin: string;
    setupConfirm: string;
    setupCreate: string;
    setupMismatch: string;
    setupTooShort: string;
    noPinSkip: string;
    noPinSkipHint: string;
    lockButton: string;
    lockButtonTitle: string;
    pinSection: string;
    pinSectionDesc: string;
    setPin: string;
    changePin: string;
    removePin: string;
    pinActive: string;
    pinInactive: string;
    autoLock: string;
    autoLockDesc: string;
    autoLockNever: string;
    autoLock1m: string;
    autoLock5m: string;
    autoLock15m: string;
    autoLock60m: string;
  };

  // ─── Settings ───
  settings: {
    title: string;
    subtitle: string;
    routerConfigured: string;
    routerConfiguredOk: string;
    routerConfiguredNotOk: string;
    authEnabled: string;
    authEnabledOk: string;
    authEnabledNotOk: string;
    encryptionKey: string;
    encryptionKeyOk: string;
    encryptionKeyNotOk: string;
    encryptionWarningTitle: string;
    encryptionWarningBody: string;
    noRouterWarningTitle: string;
    noRouterWarningBody: string;
    setupTitle: string;
    setupDesc: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    envBlockTitle: string;
    removeDefaultsTitle: string;
    removeDefaultsBody: string;
    cacheNote: string;
    gatewayEndpoints: string;
    gatewayEndpointsDesc: string;
    endpoints: {
      postMessages: string;
      countTokens: string;
      getModels: string;
    };
    endpointLabels: {
      anthropic: string;
      modelsList: string;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// pt-BR — Português brasileiro (default)
// ─────────────────────────────────────────────────────────────────────────────
const ptBR: TranslationDict = {
  app: {
    title: "LLM Router",
    subtitle: "Motor de troca de LLMs por fase para o Claude Code",
    configured: "Router ativo",
    notConfigured: "Router não configurado",
    bannerTip: "Dica: configure o router e aponte o Claude Code para este gateway. Veja a aba",
    bannerTipLink: "Configurações",
    footer: "LLM Router · Self-hosted · ",
    footerTag: "Single-tenant · Local-first",
    openSource: "Código aberto",
  },
  theme: {
    light: "Claro",
    dark: "Escuro",
    system: "Sistema",
    toggle: "Alternar tema",
  },
  nav: {
    router: "Router",
    credentials: "Credenciais",
    executions: "Execuções",
    settings: "Configurações",
  },
  common: {
    cancel: "Cancelar",
    save: "Salvar",
    saved: "Salvo",
    saveFailed: "Falha ao salvar",
    delete: "Excluir",
    deleted: "Excluído",
    edit: "Editar",
    create: "Criar",
    back: "Voltar",
    new: "Novo",
    loading: "Carregando...",
    none: "—",
    notSet: "(não definido)",
    optional: "opcional",
    default: "(padrão)",
    yes: "Sim",
    no: "Não",
    search: "Buscar",
    refresh: "Atualizar",
    discover: "Descobrir",
    discovered: "Descobertos",
    discoveryFailed: "Falha na descoberta",
    noModels: "Nenhum modelo descoberto.",
    noModelsHint: "Clique em \"Descobrir\" para buscar os modelos disponíveis.",
    pickProvider: "Selecione um provider...",
    selectProvider: "Selecionar provider",
    selectCredential: "Selecionar credencial...",
    selectCredentialFirst: "Selecione uma credencial primeiro.",
    noCredentialSelected: "Nenhuma credencial selecionada",
    noCredentialsYet: "Nenhuma credencial ainda.",
    createFirst: "Crie sua primeira credencial",
    seeDocs: "Documentação do provider",
    created: "Criada",
    updated: "Atualizada",
  },
  credentials: {
    title: "Credenciais",
    subtitle: "Uma credencial por provider. Cada uma armazena uma API key com criptografia AES-256-GCM.",
    add: "Nova",
    addTitle: "Adicionar credencial",
    addDescription: "Escolha um provider e informe sua API key. A URL base é pré-preenchida mas editável. Os modelos são descobertos automaticamente, a menos que você desative abaixo.",
    name: "Nome de exibição",
    namePlaceholder: "Minha chave Anthropic",
    provider: "Provider",
    apiKey: "API Key",
    apiKeyPlaceholder: "sk-...",
    baseUrl: "URL base",
    notes: "Notas",
    notesPlaceholder: "Para que serve esta chave?",
    newApiKey: "Nova API Key",
    newApiKeyHint: "(deixe em branco para manter a atual)",
    availableModels: "Modelos disponíveis",
    availableModelsHint: "Modelos descobertos via /v1/models deste provider.",
    knownModels: "Modelos conhecidos",
    autoDiscover: "Descobrir modelos automaticamente",
    autoDiscoverHintDiscoverable: "Busca a lista de modelos via /v1/models logo após criar.",
    autoDiscoverHintBuiltin: "Usa a lista embutida (Anthropic não expõe /v1/models).",
    categories: {
      major: "Principais labs",
      inference: "Plataformas de inferência",
      local: "Local / Self-hosted",
      other: "Outros",
    },
    createdToast: "Credencial criada",
    createdToastDiscovered: "Credencial criada · {count} modelos descobertos",
    deletedToast: "Credencial excluída",
    updatedToast: "Credencial atualizada",
    discoveredToast: "{count} modelos descobertos",
  },
  router: {
    title: "Router de fases",
    subtitle: "Cada fase do Claude Code (planejar, executar, revisar, utilidade) usa a LLM configurada abaixo. O gateway é um proxy transparente — só o modelo troca.",
    save: "Salvar",
    saved: "Configuração do router salva",
    saveFailed: "Falha ao salvar",
    loadFailed: "Falha ao carregar configuração",
    credential: "Credencial",
    credentialPlaceholder: "Selecione uma credencial...",
    credentialNone: "— nenhuma —",
    protocolAnthropic: "Anthropic",
    protocolOpenAi: "OpenAI",
    model: "Modelo",
    modelPlaceholder: "ex: glm-5.3 ou glm-5.3[1m]",
    phases: {
      PLAN: "Planejamento",
      EXECUTE: "Execução",
      REVIEW: "Revisão",
      UTILITY: "Utilidade",
      FALLBACK: "Fallback",
    },
    phaseDesc: {
      PLAN: "plan mode ativo (tool ExitPlanMode presente)",
      EXECUTE: "loop principal do agente",
      REVIEW: "subagentes de revisão de código",
      UTILITY: "títulos, sumarização, background (haiku)",
      FALLBACK: "quando nada mais casar",
    },
    banner: {
      noCredential: "Rota sem credencial ou modelo",
      noCredentialDesc: "O gateway vai retornar 503 para esta fase. Selecione uma credencial e um modelo (aba Credenciais cria novas).",
      noRules: "Nenhuma regra ativa",
      noRulesDesc: "Sem regras habilitadas, todos os requests caem no fallback.",
    },
    rules: {
      title: "Regras de detecção",
      subtitle: "Avaliadas em ordem; a primeira que casa define a fase. Edite, reordene ou adicione.",
      add: "Nova regra",
      newName: "Nova regra",
      enabled: "Ativa",
      name: "Nome",
      value: "Valor",
      invalidRegex: "Expressão regular inválida — corrija antes de salvar.",
    },
    fields: {
      requestedModel: "Modelo pedido",
      tools: "Ferramentas",
      systemPrompt: "System prompt",
      lastMessages: "Últimas mensagens",
    },
    operators: {
      contains: "contém",
      regex: "regex",
      equals: "igual a",
    },
  },
  executions: {
    title: "Execuções",
    subtitle: "Cada request que o Claude Code envia ao gateway cria uma execução. Clique em qualquer linha para ver os detalhes.",
    noExecutions: "Nenhuma execução ainda.",
    noExecutionsHint: "Aponte o Claude Code para este gateway e faça um request para ver execuções aqui.",
    backToList: "Voltar à lista",
    detail: "Detalhe da execução",
    duration: "Duração",
    tokens: "Tokens",
    tokensInOut: "Tokens (entra/sai)",
    cost: "Custo",
    matchedRule: "Regra que casou",
    routedModel: "Modelo roteado",
    requestSummary: "Resumo do request (truncado)",
    responseSummary: "Resumo da resposta (truncado)",
    error: "Erro",
    columns: {
      phase: "Fase",
      model: "Modelo (pedido → roteado)",
      status: "Status",
      duration: "Duração",
      tokens: "Tokens (entra/sai)",
      cost: "Custo",
    },
    statuses: {
      running: "em execução",
      completed: "concluída",
      failed: "falhou",
      cancelled: "cancelada",
    },
  },

  auth: {
    lockTitle: "Aplicativo travado",
    lockSubtitle: "Digite seu PIN para destravar e continuar.",
    pinPlaceholder: "••••",
    unlock: "Destravar",
    wrongPin: "PIN incorreto. Tente novamente.",
    setupTitle: "Criar PIN de acesso",
    setupSubtitle: "Proteja suas credenciais com um PIN local. Você precisará digitá-lo para destravar o app.",
    setupPin: "Novo PIN (mínimo 4 dígitos)",
    setupConfirm: "Confirmar PIN",
    setupCreate: "Criar PIN",
    setupMismatch: "Os PINs não coincidem.",
    setupTooShort: "O PIN deve ter pelo menos 4 dígitos.",
    noPinSkip: "Pular (não recomendado)",
    noPinSkipHint: "Suas credenciais ficarão acessíveis a qualquer pessoa que usar este computador.",
    lockButton: "Travar",
    lockButtonTitle: "Travar aplicativo",
    pinSection: "Proteção local",
    pinSectionDesc: "Defina um PIN para travar o aplicativo. Útil quando você precisa sair do computador e não quer que outras pessoas vejam suas credenciais.",
    setPin: "Definir PIN",
    changePin: "Alterar PIN",
    removePin: "Remover PIN",
    pinActive: "PIN ativo",
    pinInactive: "Sem PIN configurado",
    autoLock: "Travar automaticamente",
    autoLockDesc: "Trava o app após um período de inatividade.",
    autoLockNever: "Nunca",
    autoLock1m: "1 minuto",
    autoLock5m: "5 minutos",
    autoLock15m: "15 minutos",
    autoLock60m: "1 hora",
  },

  settings: {
    title: "Configurações",
    subtitle: "Configure o Claude Code para apontar para este gateway. Self-hosted, single-tenant — sem auth multi-tenant.",
    routerConfigured: "Router configurado",
    routerConfiguredOk: "Pronto para receber requests",
    routerConfiguredNotOk: "Falta credencial nas rotas",
    authEnabled: "Auth (HARNESS_API_KEY)",
    authEnabledOk: "Ativada",
    authEnabledNotOk: "Aberta (sem auth)",
    encryptionKey: "Criptografia (HARNESS_ENCRYPTION_KEY)",
    encryptionKeyOk: "Ativada",
    encryptionKeyNotOk: "Usando fallback de dev",
    encryptionWarningTitle: "Chave de criptografia não definida",
    encryptionWarningBody: "As API keys são criptografadas com HARNESS_ENCRYPTION_KEY, mas ela não está definida — usando um fallback de dev determinístico. Gere uma chave forte e adicione em .env antes de implantar para valer:",
    noRouterWarningTitle: "Router não configurado",
    noRouterWarningBody: "Pelo menos uma rota está sem credencial/modelo. Crie uma credencial com o preset \"Z.ai (GLM) — Anthropic API\" na aba",
    setupTitle: "Configuração do Claude Code",
    setupDesc: "Siga os passos abaixo para o motor trocar as LLMs por você, transparente.",
    step1: "Na aba Credenciais, crie uma credencial com o preset \"Z.ai (GLM) — Anthropic API\" (sua chave da Z.ai).",
    step2: "Na aba Router, selecione a credencial em cada fase e salve.",
    step3: "No arquivo ~/.claude/settings.json, dentro de \"env\", cole o bloco abaixo.",
    step4: "Rode o app com o gateway de pé (bun run dev) e use o claude normalmente.",
    envBlockTitle: "Bloco env do settings.json",
    removeDefaultsTitle: "Importante: remova os mapeamentos de modelo",
    removeDefaultsBody: "Se existirem ANTHROPIC_DEFAULT_*_MODEL no seu settings.json, o Claude Code nunca pede \"haiku\" e a detecção da fase Utilidade não funciona. Remova todas estas variáveis (e o ANTHROPIC_BASE_URL antigo da Z.ai):",
    cacheNote: "Nota: trocar de modelo entre fases invalida o prompt cache do provedor — pode aumentar um pouco o custo de tokens de entrada. É o preço da troca de cérebro.",
    gatewayEndpoints: "Endpoints do gateway",
    gatewayEndpointsDesc: "Superfície de API compatível com Anthropic.",
    endpoints: {
      postMessages: "POST /api/v1/messages",
      countTokens: "POST /api/v1/messages/count_tokens",
      getModels: "GET /api/v1/models",
    },
    endpointLabels: {
      anthropic: "Anthropic Messages API",
      modelsList: "Lista de modelos",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// en — English
// ─────────────────────────────────────────────────────────────────────────────
const en: TranslationDict = {
  app: {
    title: "LLM Router",
    subtitle: "Phase-based LLM switching engine for Claude Code",
    configured: "Router live",
    notConfigured: "Router not configured",
    bannerTip: "Tip: configure the router and point Claude Code at this gateway. See the",
    bannerTipLink: "Settings tab",
    footer: "LLM Router · Self-hosted · ",
    footerTag: "Single-tenant · Local-first",
    openSource: "Open source",
  },
  theme: {
    light: "Light",
    dark: "Dark",
    system: "System",
    toggle: "Toggle theme",
  },
  nav: {
    router: "Router",
    credentials: "Credentials",
    executions: "Executions",
    settings: "Settings",
  },
  common: {
    cancel: "Cancel",
    save: "Save",
    saved: "Saved",
    saveFailed: "Save failed",
    delete: "Delete",
    deleted: "Deleted",
    edit: "Edit",
    create: "Create",
    back: "Back",
    new: "New",
    loading: "Loading...",
    none: "—",
    notSet: "(not set)",
    optional: "optional",
    default: "(default)",
    yes: "Yes",
    no: "No",
    search: "Search",
    refresh: "Refresh",
    discover: "Discover",
    discovered: "Discovered",
    discoveryFailed: "Discovery failed",
    noModels: "No models discovered.",
    noModelsHint: "Click \"Discover\" to fetch the available models.",
    pickProvider: "Select provider...",
    selectProvider: "Select provider",
    selectCredential: "Select credential...",
    selectCredentialFirst: "Select a credential first.",
    noCredentialSelected: "No credential selected",
    noCredentialsYet: "No credentials yet.",
    createFirst: "Create your first credential",
    seeDocs: "Provider docs",
    created: "Created",
    updated: "Updated",
  },
  credentials: {
    title: "Credentials",
    subtitle: "One credential per provider. Each stores an API key encrypted with AES-256-GCM.",
    add: "New",
    addTitle: "Add credential",
    addDescription: "Pick a provider and enter your API key. Base URL is pre-filled but editable. Models are auto-discovered unless you disable it below.",
    name: "Display name",
    namePlaceholder: "My Anthropic key",
    provider: "Provider",
    apiKey: "API Key",
    apiKeyPlaceholder: "sk-...",
    baseUrl: "Base URL",
    notes: "Notes",
    notesPlaceholder: "What is this key for?",
    newApiKey: "New API Key",
    newApiKeyHint: "(leave blank to keep current)",
    availableModels: "Available models",
    availableModelsHint: "Models discovered from this provider's /v1/models endpoint.",
    knownModels: "Known models",
    autoDiscover: "Auto-discover models",
    autoDiscoverHintDiscoverable: "Fetch the model list via /v1/models right after creating.",
    autoDiscoverHintBuiltin: "Use the built-in model list (Anthropic doesn't expose /v1/models).",
    categories: {
      major: "Major labs",
      inference: "Inference platforms",
      local: "Local / Self-hosted",
      other: "Other",
    },
    createdToast: "Credential created",
    createdToastDiscovered: "Credential created · {count} models discovered",
    deletedToast: "Credential deleted",
    updatedToast: "Credential updated",
    discoveredToast: "{count} models discovered",
  },
  router: {
    title: "Phase router",
    subtitle: "Each Claude Code phase (plan, execute, review, utility) uses the LLM configured below. The gateway is a transparent proxy — only the model switches.",
    save: "Save",
    saved: "Router configuration saved",
    saveFailed: "Save failed",
    loadFailed: "Failed to load configuration",
    credential: "Credential",
    credentialPlaceholder: "Select a credential...",
    credentialNone: "— none —",
    protocolAnthropic: "Anthropic",
    protocolOpenAi: "OpenAI",
    model: "Model",
    modelPlaceholder: "e.g. glm-5.3 or glm-5.3[1m]",
    phases: {
      PLAN: "Planning",
      EXECUTE: "Execution",
      REVIEW: "Review",
      UTILITY: "Utility",
      FALLBACK: "Fallback",
    },
    phaseDesc: {
      PLAN: "plan mode active (ExitPlanMode tool present)",
      EXECUTE: "main agent loop",
      REVIEW: "code review subagents",
      UTILITY: "titles, summarization, background (haiku)",
      FALLBACK: "when nothing else matches",
    },
    banner: {
      noCredential: "Route missing credential or model",
      noCredentialDesc: "The gateway will return 503 for this phase. Pick a credential and a model (create new ones in the Credentials tab).",
      noRules: "No active rules",
      noRulesDesc: "With no enabled rules, every request falls back to the fallback route.",
    },
    rules: {
      title: "Detection rules",
      subtitle: "Evaluated in order; the first match sets the phase. Edit, reorder, or add.",
      add: "New rule",
      newName: "New rule",
      enabled: "Enabled",
      name: "Name",
      value: "Value",
      invalidRegex: "Invalid regular expression — fix it before saving.",
    },
    fields: {
      requestedModel: "Requested model",
      tools: "Tools",
      systemPrompt: "System prompt",
      lastMessages: "Last messages",
    },
    operators: {
      contains: "contains",
      regex: "regex",
      equals: "equals",
    },
  },
  executions: {
    title: "Executions",
    subtitle: "Every request Claude Code sends to the gateway creates one execution. Click any row for details.",
    noExecutions: "No executions yet.",
    noExecutionsHint: "Point Claude Code at this gateway and make a request to see executions here.",
    backToList: "Back to list",
    detail: "Execution detail",
    duration: "Duration",
    tokens: "Tokens",
    tokensInOut: "Tokens (in/out)",
    cost: "Cost",
    matchedRule: "Matched rule",
    routedModel: "Routed model",
    requestSummary: "Request summary (truncated)",
    responseSummary: "Response summary (truncated)",
    error: "Error",
    columns: {
      phase: "Phase",
      model: "Model (requested → routed)",
      status: "Status",
      duration: "Duration",
      tokens: "Tokens (in/out)",
      cost: "Cost",
    },
    statuses: {
      running: "running",
      completed: "completed",
      failed: "failed",
      cancelled: "cancelled",
    },
  },

  auth: {
    lockTitle: "App locked",
    lockSubtitle: "Enter your PIN to unlock and continue.",
    pinPlaceholder: "••••",
    unlock: "Unlock",
    wrongPin: "Wrong PIN. Try again.",
    setupTitle: "Create access PIN",
    setupSubtitle: "Protect your credentials with a local PIN. You'll need to enter it to unlock the app.",
    setupPin: "New PIN (min 4 digits)",
    setupConfirm: "Confirm PIN",
    setupCreate: "Create PIN",
    setupMismatch: "PINs don't match.",
    setupTooShort: "PIN must be at least 4 digits.",
    noPinSkip: "Skip (not recommended)",
    noPinSkipHint: "Your credentials will be accessible to anyone using this computer.",
    lockButton: "Lock",
    lockButtonTitle: "Lock app",
    pinSection: "Local protection",
    pinSectionDesc: "Set a PIN to lock the app. Useful when you need to step away from the computer and don't want others to see your credentials.",
    setPin: "Set PIN",
    changePin: "Change PIN",
    removePin: "Remove PIN",
    pinActive: "PIN active",
    pinInactive: "No PIN configured",
    autoLock: "Auto-lock",
    autoLockDesc: "Locks the app after a period of inactivity.",
    autoLockNever: "Never",
    autoLock1m: "1 minute",
    autoLock5m: "5 minutes",
    autoLock15m: "15 minutes",
    autoLock60m: "1 hour",
  },

  settings: {
    title: "Settings",
    subtitle: "Configure Claude Code to point at this gateway. Self-hosted, single-tenant — no multi-tenant auth required.",
    routerConfigured: "Router configured",
    routerConfiguredOk: "Ready to receive requests",
    routerConfiguredNotOk: "Routes missing a credential",
    authEnabled: "Auth (HARNESS_API_KEY)",
    authEnabledOk: "Enabled",
    authEnabledNotOk: "Open (no auth)",
    encryptionKey: "Encryption (HARNESS_ENCRYPTION_KEY)",
    encryptionKeyOk: "Enabled",
    encryptionKeyNotOk: "Using dev fallback",
    encryptionWarningTitle: "Encryption key not set",
    encryptionWarningBody: "API keys are encrypted with HARNESS_ENCRYPTION_KEY, but it is not set — using a deterministic dev fallback. Generate a strong key and add it to .env before deploying for real:",
    noRouterWarningTitle: "Router not configured",
    noRouterWarningBody: "At least one route has no credential/model. Create a credential with the \"Z.ai (GLM) — Anthropic API\" preset in the",
    setupTitle: "Claude Code setup",
    setupDesc: "Follow these steps and the engine will switch LLMs for you, transparently.",
    step1: "In the Credentials tab, create a credential with the \"Z.ai (GLM) — Anthropic API\" preset (your Z.ai key).",
    step2: "In the Router tab, pick the credential on each phase and save.",
    step3: "In ~/.claude/settings.json, inside \"env\", paste the block below.",
    step4: "Keep the app running (bun run dev) and use claude as usual.",
    envBlockTitle: "settings.json env block",
    removeDefaultsTitle: "Important: remove the model mappings",
    removeDefaultsBody: "If ANTHROPIC_DEFAULT_*_MODEL vars exist in your settings.json, Claude Code never asks for \"haiku\" and the Utility phase can't be detected. Remove all of them (and the old Z.ai ANTHROPIC_BASE_URL):",
    cacheNote: "Note: switching models across phases invalidates the provider's prompt cache — input token cost may increase slightly. That's the price of swapping brains.",
    gatewayEndpoints: "Gateway endpoints",
    gatewayEndpointsDesc: "Anthropic-compatible API surface.",
    endpoints: {
      postMessages: "POST /api/v1/messages",
      countTokens: "POST /api/v1/messages/count_tokens",
      getModels: "GET /api/v1/models",
    },
    endpointLabels: {
      anthropic: "Anthropic Messages API",
      modelsList: "Models list",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// es — Español
// ─────────────────────────────────────────────────────────────────────────────
const es: TranslationDict = {
  app: {
    title: "LLM Router",
    subtitle: "Motor de cambio de LLMs por fase para Claude Code",
    configured: "Router activo",
    notConfigured: "Router sin configurar",
    bannerTip: "Consejo: configura el router y apunta Claude Code a este gateway. Mira la pestaña",
    bannerTipLink: "Configuración",
    footer: "LLM Router · Self-hosted · ",
    footerTag: "Single-tenant · Local-first",
    openSource: "Código abierto",
  },
  theme: {
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    toggle: "Cambiar tema",
  },
  nav: {
    router: "Router",
    credentials: "Credenciales",
    executions: "Ejecuciones",
    settings: "Configuración",
  },
  common: {
    cancel: "Cancelar",
    save: "Guardar",
    saved: "Guardado",
    saveFailed: "Error al guardar",
    delete: "Eliminar",
    deleted: "Eliminado",
    edit: "Editar",
    create: "Crear",
    back: "Volver",
    new: "Nuevo",
    loading: "Cargando...",
    none: "—",
    notSet: "(no definido)",
    optional: "opcional",
    default: "(predeterminado)",
    yes: "Sí",
    no: "No",
    search: "Buscar",
    refresh: "Actualizar",
    discover: "Descubrir",
    discovered: "Descubiertos",
    discoveryFailed: "Error en descubrimiento",
    noModels: "No se descubrieron modelos.",
    noModelsHint: "Haz clic en \"Descubrir\" para obtener los modelos disponibles.",
    pickProvider: "Selecciona un proveedor...",
    selectProvider: "Seleccionar proveedor",
    selectCredential: "Selecciona credencial...",
    selectCredentialFirst: "Selecciona una credencial primero.",
    noCredentialSelected: "Ninguna credencial seleccionada",
    noCredentialsYet: "Aún no hay credenciales.",
    createFirst: "Crea tu primera credencial",
    seeDocs: "Documentación del proveedor",
    created: "Creada",
    updated: "Actualizada",
  },
  credentials: {
    title: "Credenciales",
    subtitle: "Una credencial por proveedor. Cada una almacena una API key cifrada con AES-256-GCM.",
    add: "Nueva",
    addTitle: "Añadir credencial",
    addDescription: "Elige un proveedor e ingresa tu API key. La URL base está pre-llenada pero es editable. Los modelos se descubren automáticamente a menos que lo desactives abajo.",
    name: "Nombre visible",
    namePlaceholder: "Mi clave Anthropic",
    provider: "Proveedor",
    apiKey: "API Key",
    apiKeyPlaceholder: "sk-...",
    baseUrl: "URL base",
    notes: "Notas",
    notesPlaceholder: "¿Para qué es esta clave?",
    newApiKey: "Nueva API Key",
    newApiKeyHint: "(deja en blanco para mantener la actual)",
    availableModels: "Modelos disponibles",
    availableModelsHint: "Modelos descubiertos vía /v1/models de este proveedor.",
    knownModels: "Modelos conocidos",
    autoDiscover: "Descubrir modelos automáticamente",
    autoDiscoverHintDiscoverable: "Obtiene la lista de modelos vía /v1/models justo después de crear.",
    autoDiscoverHintBuiltin: "Usa la lista integrada (Anthropic no expone /v1/models).",
    categories: {
      major: "Principales labs",
      inference: "Plataformas de inferencia",
      local: "Local / Self-hosted",
      other: "Otros",
    },
    createdToast: "Credencial creada",
    createdToastDiscovered: "Credencial creada · {count} modelos descubiertos",
    deletedToast: "Credencial eliminada",
    updatedToast: "Credencial actualizada",
    discoveredToast: "{count} modelos descubiertos",
  },
  router: {
    title: "Router de fases",
    subtitle: "Cada fase de Claude Code (planificar, ejecutar, revisar, utilidad) usa la LLM configurada abajo. El gateway es un proxy transparente — solo cambia el modelo.",
    save: "Guardar",
    saved: "Configuración del router guardada",
    saveFailed: "Error al guardar",
    loadFailed: "Error al cargar la configuración",
    credential: "Credencial",
    credentialPlaceholder: "Selecciona una credencial...",
    credentialNone: "— ninguna —",
    protocolAnthropic: "Anthropic",
    protocolOpenAi: "OpenAI",
    model: "Modelo",
    modelPlaceholder: "ej: glm-5.3 o glm-5.3[1m]",
    phases: {
      PLAN: "Planificación",
      EXECUTE: "Ejecución",
      REVIEW: "Revisión",
      UTILITY: "Utilidad",
      FALLBACK: "Fallback",
    },
    phaseDesc: {
      PLAN: "plan mode activo (tool ExitPlanMode presente)",
      EXECUTE: "bucle principal del agente",
      REVIEW: "subagentes de revisión de código",
      UTILITY: "títulos, resúmenes, background (haiku)",
      FALLBACK: "cuando nada coincide",
    },
    banner: {
      noCredential: "Ruta sin credencial o modelo",
      noCredentialDesc: "El gateway devolverá 503 para esta fase. Selecciona una credencial y un modelo (crea nuevas en la pestaña Credenciales).",
      noRules: "Ninguna regla activa",
      noRulesDesc: "Sin reglas habilitadas, todas las peticiones caen en el fallback.",
    },
    rules: {
      title: "Reglas de detección",
      subtitle: "Se evalúan en orden; la primera que coincide define la fase. Edita, reordena o añade.",
      add: "Nueva regla",
      newName: "Nueva regla",
      enabled: "Activa",
      name: "Nombre",
      value: "Valor",
      invalidRegex: "Expresión regular inválida — corrígela antes de guardar.",
    },
    fields: {
      requestedModel: "Modelo pedido",
      tools: "Herramientas",
      systemPrompt: "System prompt",
      lastMessages: "Últimos mensajes",
    },
    operators: {
      contains: "contiene",
      regex: "regex",
      equals: "igual a",
    },
  },
  executions: {
    title: "Ejecuciones",
    subtitle: "Cada petición que Claude Code envía al gateway crea una ejecución. Haz clic en cualquier fila para ver los detalles.",
    noExecutions: "Aún no hay ejecuciones.",
    noExecutionsHint: "Apunta Claude Code a este gateway y haz una petición para ver ejecuciones aquí.",
    backToList: "Volver a la lista",
    detail: "Detalle de ejecución",
    duration: "Duración",
    tokens: "Tokens",
    tokensInOut: "Tokens (entra/sale)",
    cost: "Coste",
    matchedRule: "Regla que coincidió",
    routedModel: "Modelo enrutado",
    requestSummary: "Resumen de la petición (truncado)",
    responseSummary: "Resumen de la respuesta (truncado)",
    error: "Error",
    columns: {
      phase: "Fase",
      model: "Modelo (pedido → enrutado)",
      status: "Estado",
      duration: "Duración",
      tokens: "Tokens (entra/sale)",
      cost: "Coste",
    },
    statuses: {
      running: "en ejecución",
      completed: "completada",
      failed: "falló",
      cancelled: "cancelada",
    },
  },
  auth: {
    lockTitle: "App bloqueada",
    lockSubtitle: "Ingresa tu PIN para desbloquear y continuar.",
    pinPlaceholder: "••••",
    unlock: "Desbloquear",
    wrongPin: "PIN incorrecto. Inténtalo de nuevo.",
    setupTitle: "Crear PIN de acceso",
    setupSubtitle: "Protege tus credenciales con un PIN local. Tendrás que introducirlo para desbloquear la app.",
    setupPin: "Nuevo PIN (mín 4 dígitos)",
    setupConfirm: "Confirmar PIN",
    setupCreate: "Crear PIN",
    setupMismatch: "Los PINs no coinciden.",
    setupTooShort: "El PIN debe tener al menos 4 dígitos.",
    noPinSkip: "Saltar (no recomendado)",
    noPinSkipHint: "Tus credenciales serán accesibles para cualquiera que use este ordenador.",
    lockButton: "Bloquear",
    lockButtonTitle: "Bloquear app",
    pinSection: "Protección local",
    pinSectionDesc: "Establece un PIN para bloquear la app. Útil cuando necesitas ausentarte del ordenador y no quieres que otros vean tus credenciales.",
    setPin: "Establecer PIN",
    changePin: "Cambiar PIN",
    removePin: "Eliminar PIN",
    pinActive: "PIN activo",
    pinInactive: "Sin PIN configurado",
    autoLock: "Bloqueo automático",
    autoLockDesc: "Bloquea la app tras un periodo de inactividad.",
    autoLockNever: "Nunca",
    autoLock1m: "1 minuto",
    autoLock5m: "5 minutos",
    autoLock15m: "15 minutos",
    autoLock60m: "1 hora",
  },

  settings: {
    title: "Configuración",
    subtitle: "Configura Claude Code para apuntar a este gateway. Self-hosted, single-tenant — sin auth multi-tenant.",
    routerConfigured: "Router configurado",
    routerConfiguredOk: "Listo para recibir peticiones",
    routerConfiguredNotOk: "Falta credencial en las rutas",
    authEnabled: "Auth (HARNESS_API_KEY)",
    authEnabledOk: "Activada",
    authEnabledNotOk: "Abierta (sin auth)",
    encryptionKey: "Cifrado (HARNESS_ENCRYPTION_KEY)",
    encryptionKeyOk: "Activado",
    encryptionKeyNotOk: "Usando fallback de dev",
    encryptionWarningTitle: "Clave de cifrado no definida",
    encryptionWarningBody: "Las API keys se cifran con HARNESS_ENCRYPTION_KEY, pero no está definida — usando un fallback de dev determinístico. Genera una clave fuerte y añádela a .env antes de desplegar en serio:",
    noRouterWarningTitle: "Router sin configurar",
    noRouterWarningBody: "Al menos una ruta está sin credencial/modelo. Crea una credencial con el preset \"Z.ai (GLM) — Anthropic API\" en la pestaña",
    setupTitle: "Configuración de Claude Code",
    setupDesc: "Sigue estos pasos y el motor cambiará las LLMs por ti, de forma transparente.",
    step1: "En la pestaña Credenciales, crea una credencial con el preset \"Z.ai (GLM) — Anthropic API\" (tu clave de Z.ai).",
    step2: "En la pestaña Router, selecciona la credencial en cada fase y guarda.",
    step3: "En ~/.claude/settings.json, dentro de \"env\", pega el bloque de abajo.",
    step4: "Mantén la app corriendo (bun run dev) y usa claude con normalidad.",
    envBlockTitle: "Bloque env del settings.json",
    removeDefaultsTitle: "Importante: elimina los mapeos de modelo",
    removeDefaultsBody: "Si existen variables ANTHROPIC_DEFAULT_*_MODEL en tu settings.json, Claude Code nunca pide \"haiku\" y la fase Utilidad no se puede detectar. Elimínalas todas (y el ANTHROPIC_BASE_URL antiguo de Z.ai):",
    cacheNote: "Nota: cambiar de modelo entre fases invalida la prompt cache del proveedor — el coste de tokens de entrada puede subir un poco. Es el precio de cambiar de cerebro.",
    gatewayEndpoints: "Endpoints del gateway",
    gatewayEndpointsDesc: "Superficie de API compatible con Anthropic.",
    endpoints: {
      postMessages: "POST /api/v1/messages",
      countTokens: "POST /api/v1/messages/count_tokens",
      getModels: "GET /api/v1/models",
    },
    endpointLabels: {
      anthropic: "Anthropic Messages API",
      modelsList: "Lista de modelos",
    },
  },
};

export const TRANSLATIONS: Record<Locale, TranslationDict> = {
  "pt-BR": ptBR,
  en,
  es,
};

export interface LocaleOption {
  code: Locale;
  label: string;
  flag: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];
