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
    deployed: string;
    notDeployed: string;
    bannerTip: string;
    bannerTipLink: string;
    footer: string;
    footerTag: string;
    openSource: string;
  };
  nav: {
    harnesses: string;
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

  // ─── Harnesses ───
  harnesses: {
    title: string;
    subtitle: string;
    new: string;
    newHarness: string;
    executionCount: string;
    noHarnessesYet: string;
    createFirst: string;
    deployed: string;
    deploy: string;
    deployedToast: string;
    deletedToast: string;
    createdToast: string;
    description: string;
    descriptionPlaceholder: string;
    export: string;
    exportedToast: string;
    back: string;
  };

  // ─── Canvas ───
  canvas: {
    addNode: string;
    palette: {
      trigger: string;
      triggerDesc: string;
      model: string;
      modelDesc: string;
      condition: string;
      conditionDesc: string;
      end: string;
      endDesc: string;
      dragHint: string;
    };
    nodes: {
      trigger: string;
      model: string;
      condition: string;
      end: string;
      planner: string;
      reviewer: string;
      executor: string;
      escalate: string;
      noModel: string;
      start: string;
      terminate: string;
    };
    edges: {
      true: string;
      false: string;
    };
  };

  // ─── Node config panel ───
  nodeConfig: {
    noSelection: string;
    noSelectionHint: string;
    credential: string;
    model: string;
    modelPlaceholder: string;
    noCredentialsWarning: string;
    suggestedModels: string;
    suggestedModelsHint: string;
    systemPrompt: string;
    systemPromptPlaceholder: string;
    temperature: string;
    maxTokens: string;
    topP: string;
    extendedThinking: string;
    extendedThinkingDesc: string;
    thinkingBudget: string;
    trigger: string;
    triggerDesc: string;
    end: string;
    endDesc: string;
    condition: string;
    conditionDesc: string;
    conditionField: string;
    conditionFieldPlaceholder: string;
    operator: string;
    value: string;
    valuePlaceholder: string;
    valueHint: string;
    operators: {
      ">": string;
      ">=": string;
      "<": string;
      "<=": string;
      "==": string;
      "!=": string;
      contains: string;
    };
    trueBranch: string;
    falseBranch: string;
    trueBranchHint: string;
    falseBranchHint: string;
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
    nodes: string;
    error: string;
    replayTitle: string;
    noNodeRuns: string;
    input: string;
    output: string;
    columns: {
      harness: string;
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
    deployedHarness: string;
    deployedHarnessOk: string;
    deployedHarnessNotOk: string;
    authEnabled: string;
    authEnabledOk: string;
    authEnabledNotOk: string;
    encryptionKey: string;
    encryptionKeyOk: string;
    encryptionKeyNotOk: string;
    encryptionWarningTitle: string;
    encryptionWarningBody: string;
    noHarnessWarningTitle: string;
    noHarnessWarningBody: string;
    noHarnessWarningBody2: string;
    noHarnessWarningBody3: string;
    setupTitle: string;
    setupDesc: string;
    setupHint: string;
    setupHint2: string;
    setupComment: string;
    setupComment2: string;
    gatewayEndpoints: string;
    gatewayEndpointsDesc: string;
    endpoints: {
      postMessages: string;
      getModels: string;
      getMessagesAlias: string;
    };
    endpointLabels: {
      anthropic: string;
      modelsList: string;
      alias: string;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// pt-BR — Português brasileiro (default)
// ─────────────────────────────────────────────────────────────────────────────
const ptBR: TranslationDict = {
  app: {
    title: "LLM Harness",
    subtitle: "Construtor visual de workflows para agentes de código",
    deployed: "Gateway ativo",
    notDeployed: "Nenhum harness implantado",
    bannerTip: "Dica: implante um harness e aponte o Claude Code para este gateway. Veja a aba",
    bannerTipLink: "Configurações",
    footer: "LLM Harness · Self-hosted · ",
    footerTag: "Single-tenant · Local-first",
    openSource: "Código aberto",
  },
  nav: {
    harnesses: "Harnesses",
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
  harnesses: {
    title: "Harnesses",
    subtitle: "Cada harness é um workflow visual que orquestra LLMs. Implante um para que ele receba os requests do Claude Code.",
    new: "Novo Harness",
    newHarness: "Novo Harness",
    executionCount: "execuções",
    noHarnessesYet: "Nenhum harness ainda.",
    createFirst: "Crie seu primeiro harness",
    deployed: "IMPLANTADO",
    deploy: "Implantar",
    deployedToast: "Harness implantado! Agora ele recebe os requests do Claude Code.",
    deletedToast: "Harness excluído",
    createdToast: "Novo harness criado",
    description: "Descrição",
    descriptionPlaceholder: "Descreva brevemente o que este harness faz...",
    export: "Exportar",
    exportedToast: "Harness exportado como JSON",
    back: "Voltar",
  },
  canvas: {
    addNode: "Adicionar nó",
    palette: {
      trigger: "Trigger",
      triggerDesc: "Ponto de entrada",
      model: "Modelo",
      modelDesc: "Chama uma LLM",
      condition: "Condição",
      conditionDesc: "Ramifica por variável",
      end: "Fim",
      endDesc: "Termina o workflow",
      dragHint: "Arraste para o canvas ou clique para adicionar.",
    },
    nodes: {
      trigger: "Trigger",
      model: "Modelo",
      condition: "Condição",
      end: "Fim",
      planner: "Planejador",
      reviewer: "Revisor",
      executor: "Executor",
      escalate: "Escalonar",
      noModel: "(sem modelo)",
      start: "Início",
      terminate: "Terminar",
    },
    edges: {
      true: "VERDADEIRO",
      false: "FALSO",
    },
  },
  nodeConfig: {
    noSelection: "Nenhum nó selecionado",
    noSelectionHint: "Clique em um nó no canvas para editar suas propriedades.",
    credential: "Credencial",
    model: "Modelo",
    modelPlaceholder: "Digite um id de modelo (ex: glm-5.3)...",
    noCredentialsWarning: "Nenhuma credencial ainda. Crie uma na aba Credenciais primeiro.",
    suggestedModels: "Modelos sugeridos",
    suggestedModelsHint: "Clique em \"Descobrir\" acima para buscar a lista ao vivo do provider.",
    systemPrompt: "Prompt do sistema",
    systemPromptPlaceholder: "Você é um revisor de código meticuloso...",
    temperature: "Temperatura",
    maxTokens: "Tokens máximos de saída",
    topP: "Top P",
    extendedThinking: "Raciocínio estendido",
    extendedThinkingDesc: "Ativa modo de raciocínio (Claude extended thinking, GLM thinking, DeepSeek R1).",
    thinkingBudget: "Orçamento de raciocínio (tokens)",
    trigger: "Trigger",
    triggerDesc: "O nó trigger é o ponto de entrada do workflow. Todo request recebido pelo gateway começa aqui e flui pela aresta conectada.",
    end: "Fim",
    endDesc: "O nó fim termina o workflow. A última mensagem do assistente produzida upstream é enviada de volta ao cliente (Claude Code) como resposta final.",
    condition: "Condição",
    conditionDesc: "Ramifica com base em uma variável da conversa. Se a variável não existir em \"variables\", o motor tenta extraí-la da última mensagem do assistente (ex: \"score: 72\").",
    conditionField: "Campo",
    conditionFieldPlaceholder: "score | tokens | complexity | approved",
    operator: "Operador",
    value: "Valor",
    valuePlaceholder: "7 | 100000 | high | true",
    valueHint: "Dica: números são comparados numericamente; strings são comparadas lexicamente.",
    operators: {
      ">": "> maior que",
      ">=": ">= maior ou igual",
      "<": "< menor que",
      "<=": "<= menor ou igual",
      "==": "== igual",
      "!=": "!= diferente",
      contains: "contém (subtexto)",
    },
    trueBranch: "Branch VERDADEIRO",
    falseBranch: "Branch FALSO",
    trueBranchHint: "Conecte a partir do handle inferior esquerdo (verde).",
    falseBranchHint: "Conecte a partir do handle inferior direito (vermelho).",
  },
  executions: {
    title: "Execuções",
    subtitle: "Cada request que o Claude Code envia ao gateway cria uma execução. Clique em qualquer linha para ver o replay nó por nó.",
    noExecutions: "Nenhuma execução ainda.",
    noExecutionsHint: "Implante um harness e faça um request via Claude Code para ver execuções aqui.",
    backToList: "Voltar à lista",
    detail: "Detalhe da execução",
    duration: "Duração",
    tokens: "Tokens",
    tokensInOut: "Tokens (entra/sai)",
    cost: "Custo",
    nodes: "Nós",
    error: "Erro",
    replayTitle: "Replay nó por nó",
    noNodeRuns: "Nenhuma execução de nó registrada.",
    input: "Entrada",
    output: "Saída",
    columns: {
      harness: "Harness",
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
    deployedHarness: "Harness implantado",
    deployedHarnessOk: "Ativo",
    deployedHarnessNotOk: "Não implantado",
    authEnabled: "Auth (HARNESS_API_KEY)",
    authEnabledOk: "Ativada",
    authEnabledNotOk: "Aberta (sem auth)",
    encryptionKey: "Criptografia (HARNESS_ENCRYPTION_KEY)",
    encryptionKeyOk: "Ativada",
    encryptionKeyNotOk: "Usando fallback de dev",
    encryptionWarningTitle: "Chave de criptografia não definida",
    encryptionWarningBody: "As API keys são criptografadas com HARNESS_ENCRYPTION_KEY, mas ela não está definida — usando um fallback de dev determinístico. Gere uma chave forte e adicione em .env antes de implantar para valer:",
    noHarnessWarningTitle: "Nenhum harness implantado ainda",
    noHarnessWarningBody: "Abra a aba ",
    noHarnessWarningBody2: ", crie ou abra um harness, e clique em ",
    noHarnessWarningBody3: ". Apenas harnesses implantados recebem requests do gateway.",
    setupTitle: "Configuração do Claude Code",
    setupDesc: "Defina estas variáveis de ambiente no seu shell antes de rodar claude. O Claude Code então vai rotear todos os requests por este gateway.",
    setupHint: "Você pode colocá-las no seu ",
    setupHint2: " ou ",
    setupComment: "# Aponta o Claude Code para este gateway em vez de api.anthropic.com",
    setupComment2: "# Use o HARNESS_API_KEY do seu .env (ou qualquer valor se auth estiver desativada)",
    gatewayEndpoints: "Endpoints do gateway",
    gatewayEndpointsDesc: "Superfície de API compatível com Anthropic.",
    endpoints: {
      postMessages: "POST /api/v1/messages",
      getModels: "GET /api/v1/models",
      getMessagesAlias: "GET /api/v1/messages",
    },
    endpointLabels: {
      anthropic: "Anthropic Messages API",
      modelsList: "Lista de modelos",
      alias: "Mesmo (alias)",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// en — English
// ─────────────────────────────────────────────────────────────────────────────
const en: TranslationDict = {
  app: {
    title: "LLM Harness",
    subtitle: "Visual workflow builder for coding agents",
    deployed: "Gateway live",
    notDeployed: "No harness deployed",
    bannerTip: "Tip: deploy a harness and point Claude Code at this gateway. See the",
    bannerTipLink: "Settings tab",
    footer: "LLM Harness · Self-hosted · ",
    footerTag: "Single-tenant · Local-first",
    openSource: "Open source",
  },
  nav: {
    harnesses: "Harnesses",
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
  harnesses: {
    title: "Harnesses",
    subtitle: "Each harness is a visual workflow that orchestrates LLMs. Deploy one to make it receive requests from Claude Code.",
    new: "New Harness",
    newHarness: "New Harness",
    executionCount: "executions",
    noHarnessesYet: "No harnesses yet.",
    createFirst: "Create your first harness",
    deployed: "DEPLOYED",
    deploy: "Deploy",
    deployedToast: "Harness deployed! It will now receive Claude Code requests.",
    deletedToast: "Harness deleted",
    createdToast: "New harness created",
    description: "Description",
    descriptionPlaceholder: "Briefly describe what this harness does...",
    export: "Export",
    exportedToast: "Harness exported as JSON",
    back: "Back",
  },
  canvas: {
    addNode: "Add node",
    palette: {
      trigger: "Trigger",
      triggerDesc: "Entry point",
      model: "Model",
      modelDesc: "Call an LLM",
      condition: "Condition",
      conditionDesc: "Branch on variable",
      end: "End",
      endDesc: "Terminate workflow",
      dragHint: "Drag to the canvas or click to add.",
    },
    nodes: {
      trigger: "Trigger",
      model: "Model",
      condition: "Condition",
      end: "End",
      planner: "Planner",
      reviewer: "Reviewer",
      executor: "Executor",
      escalate: "Escalate",
      noModel: "(no model)",
      start: "Start",
      terminate: "Terminate",
    },
    edges: {
      true: "TRUE",
      false: "FALSE",
    },
  },
  nodeConfig: {
    noSelection: "No node selected",
    noSelectionHint: "Click a node on the canvas to edit its properties.",
    credential: "Credential",
    model: "Model",
    modelPlaceholder: "Type a model id (e.g. glm-5.3)...",
    noCredentialsWarning: "No credentials yet. Create one in the Credentials tab first.",
    suggestedModels: "Suggested models",
    suggestedModelsHint: "Click \"Discover\" above to fetch the live list from the provider.",
    systemPrompt: "System prompt",
    systemPromptPlaceholder: "You are a meticulous code reviewer...",
    temperature: "Temperature",
    maxTokens: "Max output tokens",
    topP: "Top P",
    extendedThinking: "Extended thinking",
    extendedThinkingDesc: "Enables reasoning mode (Claude extended thinking, GLM thinking, DeepSeek R1).",
    thinkingBudget: "Thinking budget (tokens)",
    trigger: "Trigger",
    triggerDesc: "The trigger node is the entry point of the workflow. Every request received by the gateway starts here and flows through the connected edge.",
    end: "End",
    endDesc: "The end node terminates the workflow. The last assistant message produced upstream is sent back to the client (Claude Code) as the final response.",
    condition: "Condition",
    conditionDesc: "Branch based on a variable from the conversation. If the variable doesn't exist in \"variables\", the engine tries to extract it from the last assistant message (e.g. \"score: 72\").",
    conditionField: "Field",
    conditionFieldPlaceholder: "score | tokens | complexity | approved",
    operator: "Operator",
    value: "Value",
    valuePlaceholder: "7 | 100000 | high | true",
    valueHint: "Tip: numbers are compared numerically; strings are compared lexically.",
    operators: {
      ">": "> greater than",
      ">=": ">= greater or equal",
      "<": "< less than",
      "<=": "<= less or equal",
      "==": "== equal",
      "!=": "!= not equal",
      contains: "contains (substring)",
    },
    trueBranch: "TRUE branch",
    falseBranch: "FALSE branch",
    trueBranchHint: "Connect from the bottom-left handle (green).",
    falseBranchHint: "Connect from the bottom-right handle (red).",
  },
  executions: {
    title: "Executions",
    subtitle: "Every request Claude Code sends to the gateway creates one execution. Click any row to see the per-node replay.",
    noExecutions: "No executions yet.",
    noExecutionsHint: "Deploy a harness and make a request via Claude Code to see executions here.",
    backToList: "Back to list",
    detail: "Execution detail",
    duration: "Duration",
    tokens: "Tokens",
    tokensInOut: "Tokens (in/out)",
    cost: "Cost",
    nodes: "Nodes",
    error: "Error",
    replayTitle: "Node-by-node replay",
    noNodeRuns: "No node runs recorded.",
    input: "Input",
    output: "Output",
    columns: {
      harness: "Harness",
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
    deployedHarness: "Deployed harness",
    deployedHarnessOk: "Active",
    deployedHarnessNotOk: "Not deployed",
    authEnabled: "Auth (HARNESS_API_KEY)",
    authEnabledOk: "Enabled",
    authEnabledNotOk: "Open (no auth)",
    encryptionKey: "Encryption (HARNESS_ENCRYPTION_KEY)",
    encryptionKeyOk: "Enabled",
    encryptionKeyNotOk: "Using dev fallback",
    encryptionWarningTitle: "Encryption key not set",
    encryptionWarningBody: "API keys are encrypted with HARNESS_ENCRYPTION_KEY, but it is not set — using a deterministic dev fallback. Generate a strong key and add it to .env before deploying for real:",
    noHarnessWarningTitle: "No harness deployed yet",
    noHarnessWarningBody: "Open the ",
    noHarnessWarningBody2: " tab, create or open a harness, then click ",
    noHarnessWarningBody3: ". Only deployed harnesses receive requests from the gateway.",
    setupTitle: "Claude Code setup",
    setupDesc: "Set these environment variables in your shell before running claude. Claude Code will then route every request through this gateway.",
    setupHint: "You can put these in your ",
    setupHint2: " or ",
    setupComment: "# Point Claude Code at this gateway instead of api.anthropic.com",
    setupComment2: "# Use the HARNESS_API_KEY from your .env (or any value if auth is disabled)",
    gatewayEndpoints: "Gateway endpoints",
    gatewayEndpointsDesc: "Anthropic-compatible API surface.",
    endpoints: {
      postMessages: "POST /api/v1/messages",
      getModels: "GET /api/v1/models",
      getMessagesAlias: "GET /api/v1/messages",
    },
    endpointLabels: {
      anthropic: "Anthropic Messages API",
      modelsList: "Models list",
      alias: "Same (alias)",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// es — Español
// ─────────────────────────────────────────────────────────────────────────────
const es: TranslationDict = {
  app: {
    title: "LLM Harness",
    subtitle: "Constructor visual de workflows para agentes de código",
    deployed: "Gateway activo",
    notDeployed: "Ningún harness desplegado",
    bannerTip: "Consejo: despliega un harness y apunta Claude Code a este gateway. Mira la pestaña",
    bannerTipLink: "Configuración",
    footer: "LLM Harness · Self-hosted · ",
    footerTag: "Single-tenant · Local-first",
    openSource: "Código abierto",
  },
  nav: {
    harnesses: "Harnesses",
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
  harnesses: {
    title: "Harnesses",
    subtitle: "Cada harness es un workflow visual que orquesta LLMs. Despliega uno para que reciba las peticiones de Claude Code.",
    new: "Nuevo Harness",
    newHarness: "Nuevo Harness",
    executionCount: "ejecuciones",
    noHarnessesYet: "Aún no hay harnesses.",
    createFirst: "Crea tu primer harness",
    deployed: "DESPLEGADO",
    deploy: "Desplegar",
    deployedToast: "¡Harness desplegado! Ahora recibe las peticiones de Claude Code.",
    deletedToast: "Harness eliminado",
    createdToast: "Nuevo harness creado",
    description: "Descripción",
    descriptionPlaceholder: "Describe brevemente qué hace este harness...",
    export: "Exportar",
    exportedToast: "Harness exportado como JSON",
    back: "Volver",
  },
  canvas: {
    addNode: "Añadir nodo",
    palette: {
      trigger: "Trigger",
      triggerDesc: "Punto de entrada",
      model: "Modelo",
      modelDesc: "Llama a una LLM",
      condition: "Condición",
      conditionDesc: "Bifurca por variable",
      end: "Fin",
      endDesc: "Termina el workflow",
      dragHint: "Arrastra al canvas o haz clic para añadir.",
    },
    nodes: {
      trigger: "Trigger",
      model: "Modelo",
      condition: "Condición",
      end: "Fin",
      planner: "Planificador",
      reviewer: "Revisor",
      executor: "Ejecutor",
      escalate: "Escalar",
      noModel: "(sin modelo)",
      start: "Inicio",
      terminate: "Terminar",
    },
    edges: {
      true: "VERDADERO",
      false: "FALSO",
    },
  },
  nodeConfig: {
    noSelection: "Ningún nodo seleccionado",
    noSelectionHint: "Haz clic en un nodo del canvas para editar sus propiedades.",
    credential: "Credencial",
    model: "Modelo",
    modelPlaceholder: "Escribe un id de modelo (ej: glm-5.3)...",
    noCredentialsWarning: "Aún no hay credenciales. Crea una en la pestaña Credenciales primero.",
    suggestedModels: "Modelos sugeridos",
    suggestedModelsHint: "Haz clic en \"Descubrir\" arriba para obtener la lista en vivo del proveedor.",
    systemPrompt: "Prompt del sistema",
    systemPromptPlaceholder: "Eres un revisor de código meticuloso...",
    temperature: "Temperatura",
    maxTokens: "Tokens máximos de salida",
    topP: "Top P",
    extendedThinking: "Razonamiento extendido",
    extendedThinkingDesc: "Activa modo de razonamiento (Claude extended thinking, GLM thinking, DeepSeek R1).",
    thinkingBudget: "Presupuesto de razonamiento (tokens)",
    trigger: "Trigger",
    triggerDesc: "El nodo trigger es el punto de entrada del workflow. Cada petición recibida por el gateway empieza aquí y fluye por la arista conectada.",
    end: "Fin",
    endDesc: "El nodo fin termina el workflow. El último mensaje del asistente producido aguas arriba se envía de vuelta al cliente (Claude Code) como respuesta final.",
    condition: "Condición",
    conditionDesc: "Bifurca basado en una variable de la conversación. Si la variable no existe en \"variables\", el motor intenta extraerla del último mensaje del asistente (ej: \"score: 72\").",
    conditionField: "Campo",
    conditionFieldPlaceholder: "score | tokens | complexity | approved",
    operator: "Operador",
    value: "Valor",
    valuePlaceholder: "7 | 100000 | high | true",
    valueHint: "Consejo: los números se comparan numéricamente; las strings lexicográficamente.",
    operators: {
      ">": "> mayor que",
      ">=": ">= mayor o igual",
      "<": "< menor que",
      "<=": "<= menor o igual",
      "==": "== igual",
      "!=": "!= diferente",
      contains: "contiene (subcadena)",
    },
    trueBranch: "Branch VERDADERO",
    falseBranch: "Branch FALSO",
    trueBranchHint: "Conecta desde el handle inferior izquierdo (verde).",
    falseBranchHint: "Conecta desde el handle inferior derecho (rojo).",
  },
  executions: {
    title: "Ejecuciones",
    subtitle: "Cada petición que Claude Code envía al gateway crea una ejecución. Haz clic en cualquier fila para ver el replay nodo por nodo.",
    noExecutions: "Aún no hay ejecuciones.",
    noExecutionsHint: "Despliega un harness y haz una petición vía Claude Code para ver ejecuciones aquí.",
    backToList: "Volver a la lista",
    detail: "Detalle de ejecución",
    duration: "Duración",
    tokens: "Tokens",
    tokensInOut: "Tokens (entra/sale)",
    cost: "Coste",
    nodes: "Nodos",
    error: "Error",
    replayTitle: "Replay nodo por nodo",
    noNodeRuns: "No hay ejecuciones de nodo registradas.",
    input: "Entrada",
    output: "Salida",
    columns: {
      harness: "Harness",
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
    deployedHarness: "Harness desplegado",
    deployedHarnessOk: "Activo",
    deployedHarnessNotOk: "No desplegado",
    authEnabled: "Auth (HARNESS_API_KEY)",
    authEnabledOk: "Activada",
    authEnabledNotOk: "Abierta (sin auth)",
    encryptionKey: "Cifrado (HARNESS_ENCRYPTION_KEY)",
    encryptionKeyOk: "Activado",
    encryptionKeyNotOk: "Usando fallback de dev",
    encryptionWarningTitle: "Clave de cifrado no definida",
    encryptionWarningBody: "Las API keys se cifran con HARNESS_ENCRYPTION_KEY, pero no está definida — usando un fallback de dev determinístico. Genera una clave fuerte y añádela a .env antes de desplegar en serio:",
    noHarnessWarningTitle: "Aún no hay harness desplegado",
    noHarnessWarningBody: "Abre la pestaña ",
    noHarnessWarningBody2: ", crea o abre un harness, y haz clic en ",
    noHarnessWarningBody3: ". Solo los harnesses desplegados reciben peticiones del gateway.",
    setupTitle: "Configuración de Claude Code",
    setupDesc: "Define estas variables de entorno en tu shell antes de ejecutar claude. Claude Code entonces enrutará cada petición por este gateway.",
    setupHint: "Puedes ponerlas en tu ",
    setupHint2: " o ",
    setupComment: "# Apunta Claude Code a este gateway en vez de api.anthropic.com",
    setupComment2: "# Usa el HARNESS_API_KEY de tu .env (o cualquier valor si auth está desactivada)",
    gatewayEndpoints: "Endpoints del gateway",
    gatewayEndpointsDesc: "Superficie de API compatible con Anthropic.",
    endpoints: {
      postMessages: "POST /api/v1/messages",
      getModels: "GET /api/v1/models",
      getMessagesAlias: "GET /api/v1/messages",
    },
    endpointLabels: {
      anthropic: "Anthropic Messages API",
      modelsList: "Lista de modelos",
      alias: "Mismo (alias)",
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
