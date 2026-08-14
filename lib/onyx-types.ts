export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type EditorPanel = "headers" | "body" | "scripts";
export type ResponsePanel = "body" | "headers" | "timeline";

export interface HeaderEntry {
  name: string;
  value: string;
  enabled: boolean;
}

export interface RequestRecord {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  body: string;
  preRequestScript?: string;
  postResponseScript?: string;
  folder?: string;
}

export interface CollectionFile {
  version: 2;
  name: string;
  requests: RequestRecord[];
}

export type EnvironmentVariableType = "plain" | "secret";

export interface EnvironmentRecord {
  id: string;
  name: string;
  variables: Record<string, string>;
  secretKeys?: string[];
  variableTypes?: Record<string, EnvironmentVariableType>;
}

export interface EnvironmentFile {
  version: 1;
  activeEnvironmentId: string;
  environments: EnvironmentRecord[];
}

export interface HistoryEntry {
  id: string;
  requestId: string;
  name: string;
  method: HttpMethod;
  url: string;
  status: number | null;
  statusText: string;
  responseTimeMs: number | null;
  responseBody: string;
  responseHeaders: HeaderEntry[];
  createdAt: string;
  requestHeaders?: HeaderEntry[];
  requestBody?: string;
  environmentId?: string;
  resolvedUrl?: string;
  contentType?: string | null;
  truncated?: boolean;
  timing?: ResponseTiming;
  error?: string;
}

export interface HistoryFile {
  version: 1;
  entries: HistoryEntry[];
}

export type AppearanceTheme = "onyx" | "midnight" | "graphite";
export type UiDensity = "compact" | "comfortable";

export interface AppearanceSettings {
  theme: AppearanceTheme;
  density: UiDensity;
  reduceMotion: boolean;
}

export interface EditorSettings {
  fontSize: number;
  wordWrap: boolean;
  tabSize: 2 | 4;
}

export interface LayoutSettings {
  sidebarWidth: number;
  showStatusBar: boolean;
  restoreTabs: boolean;
}

export interface StartupSettings {
  showSplash: boolean;
  showWelcome: boolean;
  restoreWorkspace: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  requestCompletion: boolean;
  errors: boolean;
}

export interface AppSettings {
  version: 1;
  workspaceRoot: string | null;
  activeEnvironmentId: string;
  recentWorkspaceRoots: string[];
  appearance: AppearanceSettings;
  editor: EditorSettings;
  layout: LayoutSettings;
  startup: StartupSettings;
  notifications: NotificationSettings;
  gemini: AgentSettings;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: "onyx",
  density: "comfortable",
  reduceMotion: false,
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 12,
  wordWrap: true,
  tabSize: 2,
};

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  sidebarWidth: 288,
  showStatusBar: true,
  restoreTabs: true,
};

export const DEFAULT_STARTUP_SETTINGS: StartupSettings = {
  showSplash: true,
  showWelcome: true,
  restoreWorkspace: true,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  requestCompletion: true,
  errors: true,
};

export interface WorkspaceInfo {
  root: string;
  exists: boolean;
  isGitRepository: boolean;
}

export interface NativeHttpRequest {
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  body: string;
  timeoutMs: number;
}

export interface ResponseTiming {
  totalMs: number;
  requestMs: number;
  downloadMs: number;
}

export interface NativeHttpResponse {
  status: number;
  statusText: string;
  url: string;
  headers: HeaderEntry[];
  body: string;
  responseTimeMs: number;
  contentType: string | null;
  truncated: boolean;
  timing?: ResponseTiming;
}

export interface AgentToolDeclaration {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** @deprecated Use AgentToolDeclaration. */
export type GeminiToolDeclaration = AgentToolDeclaration;

export type AgentProvider = "openai" | "anthropic" | "gemini" | "manus" | "kimi" | "groq";

export const AGENT_PROVIDER_OPTIONS: Array<{
  id: AgentProvider;
  label: string;
  description: string;
  defaultModel: string;
}> = [
  { id: "openai", label: "ChatGPT / OpenAI", description: "OpenAI Responses-compatible model access.", defaultModel: "gpt-5-mini" },
  { id: "anthropic", label: "Claude / Anthropic", description: "Claude Messages API with native tool support.", defaultModel: "claude-sonnet-4-6" },
  { id: "gemini", label: "Gemini / Google", description: "Gemini Interactions API for agent workflows.", defaultModel: "gemini-3.6-flash" },
  { id: "manus", label: "Manus", description: "Asynchronous Manus task execution.", defaultModel: "manus-1.6-lite" },
  { id: "kimi", label: "Kimi / Moonshot", description: "OpenAI-compatible Kimi API access.", defaultModel: "kimi-k3" },
  { id: "groq", label: "Groq", description: "OpenAI-compatible low-latency inference.", defaultModel: "llama-3.3-70b-versatile" },
];

export function isAgentProvider(value: unknown): value is AgentProvider {
  return AGENT_PROVIDER_OPTIONS.some((provider) => provider.id === value);
}

export type AgentKeyStatus = Record<AgentProvider, boolean>;

export interface AgentInteractionRequest {
  provider?: AgentProvider;
  model: string;
  input: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  previousInteractionId?: string;
  tools?: AgentToolDeclaration[];
  timeoutMs?: number;
  endpointOverride?: string;
}

/** @deprecated Use AgentInteractionRequest. */
export type GeminiInteractionRequest = AgentInteractionRequest;

export interface AgentToolCall {
  id?: string;
  name: string;
  arguments: unknown;
}

/** @deprecated Use AgentToolCall. */
export type GeminiToolCall = AgentToolCall;

export interface AgentInteractionResponse {
  interactionId?: string;
  status?: string;
  text: string;
  toolCalls: AgentToolCall[];
  totalTokens?: number;
  raw: unknown;
  responseTimeMs: number;
}

/** @deprecated Use AgentInteractionResponse. */
export type GeminiInteractionResponse = AgentInteractionResponse;

export type AgentMode = "suggest" | "confirm" | "autonomous";

export interface AgentPolicy {
  mode: AgentMode;
  autoApproveReadOnly: boolean;
  requireApprovalForNetwork: boolean;
  requireApprovalForFileWrites: boolean;
  maskSecrets: boolean;
  shareRequestBody: boolean;
}

export interface AgentSettings {
  enabled: boolean;
  provider: AgentProvider;
  endpointOverride: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  storeInteractions: false;
  policy: AgentPolicy;
}

/** @deprecated Use AgentSettings. */
export type GeminiSettings = AgentSettings;

export type AgentToolRisk = "read" | "network" | "filesystem";
export type AgentAuditDecision = "pending" | "auto-approved" | "approved" | "rejected" | "failed";

export interface AgentAuditEntry {
  id: string;
  createdAt: string;
  tool: string;
  risk: AgentToolRisk;
  decision: AgentAuditDecision;
  summary: string;
  result: string;
}

export interface AgentAuditFile {
  version: 1;
  entries: AgentAuditEntry[];
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  enabled: false,
  provider: "gemini",
  endpointOverride: "",
  model: "gemini-3.6-flash",
  temperature: 0.2,
  maxOutputTokens: 4096,
  timeoutMs: 30_000,
  storeInteractions: false,
  policy: {
    mode: "confirm",
    autoApproveReadOnly: true,
    requireApprovalForNetwork: true,
    requireApprovalForFileWrites: true,
    maskSecrets: true,
    shareRequestBody: false,
  },
};

/** @deprecated Use DEFAULT_AGENT_SETTINGS. */
export const DEFAULT_GEMINI_SETTINGS = DEFAULT_AGENT_SETTINGS;

export interface FileSnapshot {
  path: string;
  content: string;
  exists: boolean;
}

export const DEFAULT_REQUEST: RequestRecord = {
  id: "list-users",
  name: "List users",
  method: "GET",
  url: "{{baseUrl}}/users",
  headers: [
    { name: "Accept", value: "application/json", enabled: true },
    { name: "X-Workspace", value: "onyx-local", enabled: true },
  ],
  body: "",
};

export const DEFAULT_COLLECTION: CollectionFile = {
  version: 2,
  name: "Onyx Workspace",
  requests: [
    DEFAULT_REQUEST,
    {
      id: "create-user",
      name: "Create user",
      method: "POST",
      url: "{{baseUrl}}/users",
      headers: [{ name: "Content-Type", value: "application/json", enabled: true }],
      body: '{\n  "name": "Ada Lovelace",\n  "email": "ada@example.com"\n}',
    },
    {
      id: "health-check",
      name: "Health check",
      method: "GET",
      url: "{{baseUrl}}/health",
      headers: [{ name: "Accept", value: "application/json", enabled: true }],
      body: "",
    },
  ],
};

export const DEFAULT_ENVIRONMENT_FILE: EnvironmentFile = {
  version: 1,
  activeEnvironmentId: "local",
  environments: [
    {
      id: "local",
      name: "Local",
      variables: {
        baseUrl: "https://api.example.com",
      },
    },
    {
      id: "staging",
      name: "Staging",
      variables: {
        baseUrl: "https://staging.example.com",
      },
    },
  ],
};

export const DEFAULT_HISTORY_FILE: HistoryFile = {
  version: 1,
  entries: [],
};

export const DEFAULT_AGENT_AUDIT_FILE: AgentAuditFile = {
  version: 1,
  entries: [],
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 1,
  workspaceRoot: null,
  activeEnvironmentId: DEFAULT_ENVIRONMENT_FILE.activeEnvironmentId,
  recentWorkspaceRoots: [],
  appearance: DEFAULT_APPEARANCE_SETTINGS,
  editor: DEFAULT_EDITOR_SETTINGS,
  layout: DEFAULT_LAYOUT_SETTINGS,
  startup: DEFAULT_STARTUP_SETTINGS,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  gemini: DEFAULT_AGENT_SETTINGS,
};

export function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function parseHeaders(text: string): HeaderEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) {
        return { name: line, value: "", enabled: true };
      }

      return {
        name: line.slice(0, separator).trim(),
        value: line.slice(separator + 1).trim(),
        enabled: true,
      };
    })
    .filter((header) => header.name.length > 0);
}

export function formatHeaders(headers: HeaderEntry[]): string {
  return headers
    .filter((header) => header.enabled && header.name.trim())
    .map((header) => `${header.name}: ${header.value}`)
    .join("\n");
}

export function resolveVariables(
  value: string,
  variables: Record<string, string>,
): string {
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) => {
    const resolved = variables[key.trim()];
    return resolved === undefined ? match : resolved;
  });
}

export function variablesToText(variables: Record<string, string>, secretKeys: string[] = []): string {
  const secrets = new Set(secretKeys);
  return Object.entries(variables)
    .map(([key, value]) => `${secrets.has(key) ? "# secret " : ""}${key}=${value}`)
    .join("\n");
}

export function textToVariables(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) return [line, ""];
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      })
      .filter(([key]) => key.length > 0),
  );
}

export function normalizeCollection(value: unknown): CollectionFile {
  if (!value || typeof value !== "object") return DEFAULT_COLLECTION;
  const candidate = value as Partial<CollectionFile>;
  if (!Array.isArray(candidate.requests)) return DEFAULT_COLLECTION;

  const requests = candidate.requests.filter(
    (request): request is RequestRecord =>
      Boolean(request) &&
      typeof request === "object" &&
      typeof (request as RequestRecord).id === "string" &&
      typeof (request as RequestRecord).name === "string" &&
      typeof (request as RequestRecord).url === "string",
  );

  return {
    version: 2,
    name: typeof candidate.name === "string" ? candidate.name : DEFAULT_COLLECTION.name,
    requests: requests.length > 0 ? requests.map(normalizeRequest) : DEFAULT_COLLECTION.requests,
  };
}

export function normalizeRequest(request: RequestRecord): RequestRecord {
  return {
    id: request.id,
    name: request.name || "Untitled request",
    method: HTTP_METHODS.includes(request.method) ? request.method : "GET",
    url: request.url || "",
    headers: Array.isArray(request.headers)
      ? request.headers.map((header) => ({
          name: header.name || "",
          value: header.value || "",
          enabled: header.enabled !== false,
        }))
      : [],
    body: typeof request.body === "string" ? request.body : "",
    preRequestScript: typeof request.preRequestScript === "string" ? request.preRequestScript : "",
    postResponseScript: typeof request.postResponseScript === "string" ? request.postResponseScript : "",
    folder: request.folder,
  };
}

export function normalizeEnvironmentFile(value: unknown): EnvironmentFile {
  if (!value || typeof value !== "object") return DEFAULT_ENVIRONMENT_FILE;
  const candidate = value as Partial<EnvironmentFile>;
  const environments = Array.isArray(candidate.environments)
    ? candidate.environments.filter(
        (environment): environment is EnvironmentRecord =>
          Boolean(environment) &&
          typeof environment === "object" &&
          typeof (environment as EnvironmentRecord).id === "string" &&
          typeof (environment as EnvironmentRecord).name === "string" &&
          typeof (environment as EnvironmentRecord).variables === "object",
      )
    : [];

  if (environments.length === 0) return DEFAULT_ENVIRONMENT_FILE;
  const activeEnvironmentId = environments.some(
    (environment) => environment.id === candidate.activeEnvironmentId,
  )
    ? candidate.activeEnvironmentId!
    : environments[0].id;

  return {
    version: 1,
    activeEnvironmentId,
    environments: environments.map((environment) => ({
      id: environment.id,
      name: environment.name || "Environment",
      variables: Object.fromEntries(
        Object.entries(environment.variables).map(([key, value]) => [key, String(value)]),
      ),
      secretKeys: environment.secretKeys,
      variableTypes: environment.variableTypes ?? Object.fromEntries(Object.keys(environment.variables).map((key) => [key, (environment.secretKeys ?? []).includes(key) ? "secret" : "plain"])),
    })),
  };
}

export function normalizeAgentAuditFile(value: unknown): AgentAuditFile {
  if (!value || typeof value !== "object") return DEFAULT_AGENT_AUDIT_FILE;
  const candidate = value as Partial<AgentAuditFile>;
  const entries = Array.isArray(candidate.entries) ? candidate.entries : [];
  return {
    version: 1,
    entries: entries
      .filter((entry): entry is AgentAuditEntry => Boolean(entry && typeof entry === "object"))
      .slice(-200)
      .map((entry) => ({
        id: typeof entry.id === "string" ? entry.id : makeId("audit"),
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
        tool: typeof entry.tool === "string" ? entry.tool.slice(0, 128) : "unknown",
        risk: entry.risk === "network" || entry.risk === "filesystem" ? entry.risk : "read",
        decision: entry.decision === "pending" || entry.decision === "approved" || entry.decision === "rejected" || entry.decision === "failed" ? entry.decision : "auto-approved",
        summary: typeof entry.summary === "string" ? entry.summary.slice(0, 512) : "",
        result: typeof entry.result === "string" ? entry.result.slice(0, 1024) : "",
      })),
  };
}

export function normalizeHistoryFile(value: unknown): HistoryFile {
  if (!value || typeof value !== "object") return DEFAULT_HISTORY_FILE;
  const candidate = value as Partial<HistoryFile>;
  const entries = Array.isArray(candidate.entries)
    ? candidate.entries.filter(
        (entry): entry is HistoryEntry =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as HistoryEntry).id === "string" &&
          typeof (entry as HistoryEntry).url === "string",
      )
    : [];

  return {
    version: 1,
    entries: entries.slice(0, 100).map((entry) => ({
      ...entry,
      responseHeaders: Array.isArray(entry.responseHeaders) ? entry.responseHeaders : [],
    })),
  };
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return DEFAULT_APP_SETTINGS;
  const candidate = value as Partial<AppSettings>;
  const candidateAppearance = candidate.appearance as Partial<AppearanceSettings> | undefined;
  const candidateEditor = candidate.editor as Partial<EditorSettings> | undefined;
  const candidateLayout = candidate.layout as Partial<LayoutSettings> | undefined;
  const candidateStartup = candidate.startup as Partial<StartupSettings> | undefined;
  const candidateNotifications = candidate.notifications as Partial<NotificationSettings> | undefined;
  const candidateGemini = candidate.gemini as Partial<AgentSettings> | undefined;
  const candidatePolicy = candidateGemini?.policy as Partial<AgentPolicy> | undefined;
  const normalizedProvider: AgentProvider = isAgentProvider(candidateGemini?.provider)
    ? candidateGemini.provider
    : DEFAULT_AGENT_SETTINGS.provider;
  const mode = candidatePolicy?.mode;
  const normalizedMode: AgentMode = mode === "suggest" || mode === "autonomous" ? mode : "confirm";
  const theme = candidateAppearance?.theme;
  const density = candidateAppearance?.density;
  const tabSize = candidateEditor?.tabSize;

  return {
    version: 1,
    workspaceRoot: typeof candidate.workspaceRoot === "string" ? candidate.workspaceRoot : null,
    activeEnvironmentId:
      typeof candidate.activeEnvironmentId === "string"
        ? candidate.activeEnvironmentId
        : DEFAULT_APP_SETTINGS.activeEnvironmentId,
    recentWorkspaceRoots: Array.isArray(candidate.recentWorkspaceRoots)
      ? candidate.recentWorkspaceRoots.filter((root): root is string => typeof root === "string").slice(0, 8)
      : [],
    appearance: {
      theme: theme === "midnight" || theme === "graphite" ? theme : DEFAULT_APPEARANCE_SETTINGS.theme,
      density: density === "compact" ? density : DEFAULT_APPEARANCE_SETTINGS.density,
      reduceMotion: candidateAppearance?.reduceMotion === true,
    },
    editor: {
      fontSize: typeof candidateEditor?.fontSize === "number" && Number.isFinite(candidateEditor.fontSize)
        ? Math.min(18, Math.max(10, Math.round(candidateEditor.fontSize)))
        : DEFAULT_EDITOR_SETTINGS.fontSize,
      wordWrap: candidateEditor?.wordWrap !== false,
      tabSize: tabSize === 4 ? 4 : DEFAULT_EDITOR_SETTINGS.tabSize,
    },
    layout: {
      sidebarWidth: typeof candidateLayout?.sidebarWidth === "number" && Number.isFinite(candidateLayout.sidebarWidth)
        ? Math.min(420, Math.max(240, Math.round(candidateLayout.sidebarWidth)))
        : DEFAULT_LAYOUT_SETTINGS.sidebarWidth,
      showStatusBar: candidateLayout?.showStatusBar !== false,
      restoreTabs: candidateLayout?.restoreTabs !== false,
    },
    startup: {
      showSplash: candidateStartup?.showSplash !== false,
      showWelcome: candidateStartup?.showWelcome !== false,
      restoreWorkspace: candidateStartup?.restoreWorkspace !== false,
    },
    notifications: {
      enabled: candidateNotifications?.enabled !== false,
      requestCompletion: candidateNotifications?.requestCompletion !== false,
      errors: candidateNotifications?.errors !== false,
    },
    gemini: {
      enabled: candidateGemini?.enabled === true,
      provider: normalizedProvider,
      endpointOverride: typeof candidateGemini?.endpointOverride === "string"
        ? candidateGemini.endpointOverride.trim().slice(0, 512)
        : DEFAULT_AGENT_SETTINGS.endpointOverride,
      model: typeof candidateGemini?.model === "string" && candidateGemini.model.trim()
        ? candidateGemini.model.trim().slice(0, 128)
        : DEFAULT_AGENT_SETTINGS.model,
      temperature: typeof candidateGemini?.temperature === "number" && Number.isFinite(candidateGemini.temperature)
        ? Math.min(2, Math.max(0, candidateGemini.temperature))
        : DEFAULT_AGENT_SETTINGS.temperature,
      maxOutputTokens: typeof candidateGemini?.maxOutputTokens === "number" && Number.isFinite(candidateGemini.maxOutputTokens)
        ? Math.min(65_536, Math.max(1, Math.round(candidateGemini.maxOutputTokens)))
        : DEFAULT_AGENT_SETTINGS.maxOutputTokens,
      timeoutMs: typeof candidateGemini?.timeoutMs === "number" && Number.isFinite(candidateGemini.timeoutMs)
        ? Math.min(120_000, Math.max(5_000, Math.round(candidateGemini.timeoutMs)))
        : DEFAULT_AGENT_SETTINGS.timeoutMs,
      storeInteractions: false,
      policy: {
        mode: normalizedMode,
        autoApproveReadOnly: candidatePolicy?.autoApproveReadOnly !== false,
        requireApprovalForNetwork: candidatePolicy?.requireApprovalForNetwork !== false,
        requireApprovalForFileWrites: candidatePolicy?.requireApprovalForFileWrites !== false,
        maskSecrets: candidatePolicy?.maskSecrets !== false,
        shareRequestBody: candidatePolicy?.shareRequestBody === true,
      },
    },
  };
}
