"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import {
  deleteAgentApiKey,
  executeAgentInteraction,
  executeHttpRequest,
  getAgentKeyStatuses,
  inspectWorkspace,
  pickWorkspaceDirectory,
  readAgentAudit,
  readLocalFile,
  readWorkspaceFile,
  setAgentApiKey,
  writeAgentAudit,
  writeLocalFile,
  writeWorkspaceFile,
} from "@/lib/local-files";
import { AppContextMenu, type ContextMenuAction } from "@/components/app-context-menu";
import { AppToastStack, type AppToast, type ToastTone } from "@/components/app-toast-stack";
import { OnyxAgent, type ToolResult } from "@/components/onyx-agent";
import { CollectionTestRunner } from "@/components/collection-test-runner";
import { JsonTreeViewer } from "@/components/json-tree-viewer";
import { QuickOpen } from "@/components/quick-open";
import { ResponseTimeline } from "@/components/response-timeline";
import { GitReviewPanel } from "@/components/git-review-panel";
import { OnyxNotebookPanel } from "@/components/onyx-notebook-panel";
import { TimeMachinePanel } from "@/components/time-machine-panel";
import { createCollectionReview } from "@/lib/onyx-diff";
import { createOnyxDocument, parseOnyxDocument, serializeOnyxDocument, type OnyxDocument } from "@/lib/onyx-document";
import { redactHeaders, redactForAgent } from "@/lib/privacy";
import { parseApiCollection } from "@/lib/openapi";
import { runSandboxedScript } from "@/lib/scripts";
import {
  DEFAULT_AGENT_AUDIT_FILE,
  DEFAULT_APP_SETTINGS,
  DEFAULT_COLLECTION,
  DEFAULT_ENVIRONMENT_FILE,
  DEFAULT_HISTORY_FILE,
  DEFAULT_REQUEST,
  HTTP_METHODS,
  formatHeaders,
  makeId,
  normalizeAgentAuditFile,
  normalizeAppSettings,
  normalizeCollection,
  normalizeEnvironmentFile,
  normalizeHistoryFile,
  parseHeaders,
  resolveVariables,
  textToVariables,
  variablesToText,
  AGENT_PROVIDER_OPTIONS,
  type AgentAuditEntry,
  type AgentAuditFile,
  type AgentProvider,
  type AppSettings,
  type CollectionFile,
  type EditorPanel,
  type EnvironmentFile,
  type EnvironmentRecord,
  type HistoryEntry,
  type GeminiToolCall,
  type HistoryFile,
  type HttpMethod,
  type NativeHttpResponse,
  type RequestRecord,
  type WorkspaceInfo,
  type ResponsePanel,
} from "@/lib/onyx-types";

type SidebarView = "collection" | "history" | "environments";
type IconName =
  | "chevron-down"
  | "chevron-right"
  | "close"
  | "copy"
  | "download"
  | "file"
  | "folder"
  | "folder-open"
  | "globe"
  | "history"
  | "more"
  | "panel-left"
  | "plus"
  | "refresh"
  | "save"
  | "search"
  | "send"
  | "settings"
  | "trash"
  | "upload"
  | "variable";

const EMPTY_RESPONSE_MESSAGE = "Run a request to inspect the response.";

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.5,
  };

  const paths: Record<IconName, ReactNode> = {
    "chevron-down": <path {...common} d="m4 6 4 4 4-4" />,
    "chevron-right": <path {...common} d="m6 4 4 4-4 4" />,
    close: <path {...common} d="m5 5 6 6m0-6-6 6" />,
    copy: (
      <>
        <rect {...common} x="5" y="5" width="7" height="7" rx="1" />
        <path {...common} d="M3 10V4a1 1 0 0 1 1-1h6" />
      </>
    ),
    download: (
      <>
        <path {...common} d="M8 2.75v7m0 0 2.5-2.5M8 9.75l-2.5-2.5M3 12.5h10" />
      </>
    ),
    file: <path {...common} d="M4 2.75h4l3 3v6.5H4zm4 0v3h3M6 8h3m-3 2h3" />,
    folder: <path {...common} d="M2.75 4.25h3l1.2 1.5h5.3v6H2.75zM2.75 5.75h9.5" />,
    "folder-open": <path {...common} d="m2.75 5.25 1.5-2h3l1.2 1.5h4.8l-1.1 7H3.1zM2.75 5.25h10.5" />,
    globe: (
      <>
        <circle {...common} cx="8" cy="8" r="5.25" />
        <path {...common} d="M2.9 8h10.2M8 2.75c1.2 1.45 1.8 3.2 1.8 5.25S9.2 11.8 8 13.25C6.8 11.8 6.2 10.05 6.2 8S6.8 4.2 8 2.75" />
      </>
    ),
    history: (
      <>
        <path {...common} d="M3 7.5A5 5 0 1 0 4.4 4M3 3v4.5h4.5" />
        <path {...common} d="M8 5.25v3l2 1.25" />
      </>
    ),
    more: <path {...common} d="M3.5 8h.01M8 8h.01m4.5 0h.01" strokeWidth={2.5} />,
    "panel-left": (
      <>
        <rect {...common} x="2.75" y="3" width="10.5" height="10" rx="1" />
        <path {...common} d="M6 3v10" />
      </>
    ),
    plus: <path {...common} d="M8 3.5v9M3.5 8h9" />,
    refresh: <path {...common} d="M12.2 5.5A5 5 0 1 0 13 9M12.2 2.75v2.75H9.45" />,
    save: (
      <>
        <path {...common} d="M3 3h8.5L13 4.5V13H3z" />
        <path {...common} d="M5 3v3h5V3M5 9h6v4H5z" />
      </>
    ),
    search: (
      <>
        <circle {...common} cx="7" cy="7" r="3.75" />
        <path {...common} d="m10 10 3 3" />
      </>
    ),
    send: (
      <>
        <path {...common} d="m2.75 7.75 10.5-5-3.5 10.5-2.25-4.25z" />
        <path {...common} d="m7.5 9 5.75-6.25" />
      </>
    ),
    settings: (
      <>
        <circle {...common} cx="8" cy="8" r="2.25" />
        <path {...common} d="M8 2.5v1.25m0 8.5v1.25M13.5 8h-1.25M5.75 8H4.5m7.9-3.9-.9.9M6.5 11.5l-.9.9m5.9 0-.9-.9m-5-5-.9-.9" />
      </>
    ),
    trash: <path {...common} d="M3.5 4.5h9M6 4.5V3h4v1.5m-5 2v5.75h6V6.5M7 7.5v3m2-3v3" />,
    upload: <path {...common} d="M8 13.25v-7m0 0-2.5 2.5M8 6.25l2.5 2.5M3 3.5h10" />,
    variable: (
      <>
        <path {...common} d="M5 3.5c0 2.25-1.25 2.75-2.25 2.75S5 7.25 5 9.5 6.25 12.25 7.25 12.25M11 3.5c0 2.25 1.25 2.75 2.25 2.75S11 7.25 11 9.5 9.75 12.25 8.75 12.25" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="shrink-0" height={size} viewBox="0 0 16 16" width={size}>
      {paths[name]}
    </svg>
  );
}

function methodClass(method: HttpMethod): string {
  if (method === "GET") return "text-neutral-300";
  if (method === "POST") return "text-neutral-100";
  if (method === "DELETE") return "text-neutral-500";
  return "text-neutral-400";
}

function statusClass(status: number | null): string {
  if (status === null) return "text-neutral-500";
  if (status >= 200 && status < 300) return "text-neutral-200";
  return "text-neutral-400";
}

function responseText(response: NativeHttpResponse | null): string {
  if (!response) return EMPTY_RESPONSE_MESSAGE;
  if (!response.body) return "<empty response>";

  if (response.contentType?.includes("json")) {
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      return response.body;
    }
  }

  return response.body;
}

function workspaceName(root: string | null): string {
  if (!root) return "Local app data";
  const normalized = root.replace(/[\\/]+$/, "");
  return normalized.split(/[\\/]/).at(-1) || root;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseJsonOr<T>(content: string, fallback: T): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function safeFileName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "onyx-notebook";
}

export function OnyxWorkspace() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollectionOpen, setIsCollectionOpen] = useState(true);
  const [activeView, setActiveView] = useState<SidebarView>("collection");
  const [collection, setCollection] = useState<CollectionFile>(DEFAULT_COLLECTION);
  const [environmentFile, setEnvironmentFile] = useState<EnvironmentFile>(DEFAULT_ENVIRONMENT_FILE);
  const [historyFile, setHistoryFile] = useState<HistoryFile>(DEFAULT_HISTORY_FILE);
  const [auditFile, setAuditFile] = useState<AgentAuditFile>(DEFAULT_AGENT_AUDIT_FILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo>({ root: "", exists: false, isGitRepository: false });
  const [activeRequestId, setActiveRequestId] = useState(DEFAULT_REQUEST.id);
  const [draft, setDraft] = useState<RequestRecord>(DEFAULT_REQUEST);
  const [activePanel, setActivePanel] = useState<EditorPanel>("headers");
  const [responsePanel, setResponsePanel] = useState<ResponsePanel>("body");
  const [response, setResponse] = useState<NativeHttpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Local workspace");
  const [searchQuery, setSearchQuery] = useState("");
  const [commandQuery, setCommandQuery] = useState("");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnvironmentEditing, setIsEnvironmentEditing] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"general" | "editor" | "notifications" | "agent" | "about">("general");
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);
  const [onyxDocument, setOnyxDocument] = useState<OnyxDocument | null>(null);
  const [reviewBaseline, setReviewBaseline] = useState<CollectionFile>(DEFAULT_COLLECTION);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>();
  const [openTabs, setOpenTabs] = useState<string[]>([DEFAULT_REQUEST.id]);
  const [agentKeyStatuses, setAgentKeyStatuses] = useState<Record<AgentProvider, boolean>>({
    openai: false,
    anthropic: false,
    gemini: false,
    manus: false,
    kimi: false,
    groq: false,
  });
  const [agentKeyDraft, setAgentKeyDraft] = useState("");
  const [agentTestStatus, setAgentTestStatus] = useState<string | null>(null);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; hasEditableTarget: boolean } | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const openApiInputRef = useRef<HTMLInputElement>(null);
  const onyxInputRef = useRef<HTMLInputElement>(null);
  const auditFileRef = useRef<AgentAuditFile>(DEFAULT_AGENT_AUDIT_FILE);
  const contextTargetRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const toastSequenceRef = useRef(0);

  const pushToast = useCallback((tone: ToastTone, message: string, detail?: string) => {
    if (!settings.notifications.enabled) return;
    if (tone === "error" && !settings.notifications.errors) return;
    if (tone !== "error" && !settings.notifications.requestCompletion && message.toLowerCase().includes("request")) return;
    const id = `toast-${Date.now()}-${toastSequenceRef.current++}`;
    setToasts((current) => [...current, { id, tone, message, detail }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, tone === "error" ? 6500 : 4200);
  }, [settings.notifications.enabled, settings.notifications.errors, settings.notifications.requestCompletion]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    contextTargetRef.current = null;
  }, []);

  const handleContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    const target = event.target;
    const editableTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null;
    contextTargetRef.current = editableTarget;
    setContextMenu({ x: event.clientX, y: event.clientY, hasEditableTarget: Boolean(editableTarget) });
  }, []);

  useEffect(() => {
    auditFileRef.current = auditFile;
  }, [auditFile]);

  const activeEnvironment = useMemo<EnvironmentRecord>(() => {
    return (
      environmentFile.environments.find((environment) => environment.id === settings.activeEnvironmentId) ??
      environmentFile.environments[0] ??
      DEFAULT_ENVIRONMENT_FILE.environments[0]
    );
  }, [environmentFile.environments, settings.activeEnvironmentId]);

  const resolvedDraft = useMemo<RequestRecord>(() => ({
    ...draft,
    url: resolveVariables(draft.url, activeEnvironment.variables),
    headers: draft.headers.map((header) => ({
      ...header,
      name: resolveVariables(header.name, activeEnvironment.variables),
      value: resolveVariables(header.value, activeEnvironment.variables),
    })),
    body: resolveVariables(draft.body, activeEnvironment.variables),
  }), [activeEnvironment.variables, draft]);

  const agentContext = useMemo(() => {
    const maskSecrets = settings.gemini.policy.maskSecrets;
    const requestHeaders = maskSecrets ? redactHeaders(resolvedDraft.headers) : resolvedDraft.headers;
    const responseBody = redactForAgent(response?.body ?? "<no response yet>", maskSecrets);

    return JSON.stringify({
      request: {
        name: draft.name,
        method: resolvedDraft.method,
        url: resolvedDraft.url,
        headers: requestHeaders,
        body: settings.gemini.policy.shareRequestBody
          ? redactForAgent(resolvedDraft.body, settings.gemini.policy.maskSecrets)
          : "[REDACTED OR OMITTED]",
      },
      response: {
        status: response?.status ?? null,
        statusText: response?.statusText ?? null,
        body: responseBody,
      },
      environment: activeEnvironment.name,
    }, null, 2);
  }, [
    activeEnvironment.name,
    draft.name,
    response,
    resolvedDraft,
    settings.gemini.policy.maskSecrets,
    settings.gemini.policy.shareRequestBody,
  ]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return collection.requests;
    return collection.requests.filter((request) =>
      [request.name, request.method, request.url, request.folder]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [collection.requests, searchQuery]);

  const visibleHistory = useMemo(
    () => historyFile.entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40),
    [historyFile.entries],
  );

  const reviewDocument = useMemo(() => createCollectionReview(reviewBaseline, collection, "workspace baseline", "working tree"), [collection, reviewBaseline]);

  const persistSettings = useCallback(async (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    await writeLocalFile("settings.json", JSON.stringify(nextSettings, null, 2));
  }, []);

  const loadWorkspace = useCallback(async (workspaceRoot: string | null) => {
    const [collectionSnapshot, environmentSnapshot, historySnapshot, legacySnapshot] = await Promise.all([
      readWorkspaceFile("collection.json", workspaceRoot),
      readWorkspaceFile("environments.json", workspaceRoot),
      readWorkspaceFile("history.json", workspaceRoot),
      readWorkspaceFile("workspace.json", workspaceRoot),
    ]);

    const legacyValue = legacySnapshot.exists
      ? parseJsonOr<Record<string, unknown>>(legacySnapshot.content, {})
      : {};
    const nextCollection = collectionSnapshot.exists
      ? normalizeCollection(parseJsonOr(collectionSnapshot.content, DEFAULT_COLLECTION))
      : Array.isArray(legacyValue.requests)
        ? normalizeCollection(legacyValue)
        : DEFAULT_COLLECTION;
    const nextEnvironmentFile = environmentSnapshot.exists
      ? normalizeEnvironmentFile(parseJsonOr(environmentSnapshot.content, DEFAULT_ENVIRONMENT_FILE))
      : DEFAULT_ENVIRONMENT_FILE;
    const nextHistoryFile = historySnapshot.exists
      ? normalizeHistoryFile(parseJsonOr(historySnapshot.content, DEFAULT_HISTORY_FILE))
      : DEFAULT_HISTORY_FILE;
    const firstRequest = nextCollection.requests[0] ?? DEFAULT_REQUEST;

    setCollection(nextCollection);
    setReviewBaseline(nextCollection);
    setEnvironmentFile(nextEnvironmentFile);
    setHistoryFile(nextHistoryFile);
    setActiveRequestId(firstRequest.id);
    setOpenTabs([firstRequest.id]);
    setDraft(firstRequest);
    setResponse(null);
    setWorkspaceInfo(await inspectWorkspace(workspaceRoot));
    setStatusMessage(workspaceRoot ? `Workspace: ${workspaceName(workspaceRoot)}` : "Local app data");
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const [settingsSnapshot, auditSnapshot] = await Promise.all([
          readLocalFile("settings.json"),
          readAgentAudit(),
        ]);
        const loadedSettings = settingsSnapshot.exists
          ? normalizeAppSettings(parseJsonOr(settingsSnapshot.content, DEFAULT_APP_SETTINGS))
          : DEFAULT_APP_SETTINGS;
        if (!isMounted) return;
        setSettings(loadedSettings);
        const loadedAudit = auditSnapshot.exists
          ? normalizeAgentAuditFile(parseJsonOr(auditSnapshot.content, DEFAULT_AGENT_AUDIT_FILE))
          : DEFAULT_AGENT_AUDIT_FILE;
        auditFileRef.current = loadedAudit;
        setAuditFile(loadedAudit);
        setAgentKeyStatuses(await getAgentKeyStatuses().catch(() => ({
          openai: false,
          anthropic: false,
          gemini: false,
          manus: false,
          kimi: false,
          groq: false,
        })));
        await loadWorkspace(loadedSettings.workspaceRoot);
      } catch {
        if (isMounted) setStatusMessage("New local workspace");
      }
    }

    void hydrate();
    return () => {
      isMounted = false;
    };
  }, [loadWorkspace]);

  const persistCollection = useCallback(async (nextCollection: CollectionFile) => {
    await writeWorkspaceFile(
      "collection.json",
      JSON.stringify(nextCollection, null, 2),
      settings.workspaceRoot,
    );
  }, [settings.workspaceRoot]);

  const persistHistory = useCallback(async (nextHistoryFile: HistoryFile) => {
    await writeWorkspaceFile(
      "history.json",
      JSON.stringify(nextHistoryFile, null, 2),
      settings.workspaceRoot,
    );
  }, [settings.workspaceRoot]);

  const persistAudit = useCallback(async (nextAuditFile: AgentAuditFile) => {
    const normalized = normalizeAgentAuditFile(nextAuditFile);
    auditFileRef.current = normalized;
    setAuditFile(normalized);
    await writeAgentAudit(normalized);
  }, []);

  const recordAudit = useCallback(async (entry: Omit<AgentAuditEntry, "id" | "createdAt">) => {
    const nextAuditFile: AgentAuditFile = {
      version: 1,
      entries: [...auditFileRef.current.entries, {
        ...entry,
        id: makeId("audit"),
        createdAt: new Date().toISOString(),
        summary: entry.summary.slice(0, 512),
        result: entry.result.slice(0, 1024),
      }].slice(-200),
    };
    await persistAudit(nextAuditFile);
  }, [persistAudit]);

  const persistEnvironmentFile = useCallback(async (nextEnvironmentFile: EnvironmentFile) => {
    await writeWorkspaceFile(
      "environments.json",
      JSON.stringify(nextEnvironmentFile, null, 2),
      settings.workspaceRoot,
    );
  }, [settings.workspaceRoot]);

  const saveRequest = useCallback(async () => {
    setIsSaving(true);
    setStatusMessage("Saving collection…");
    const nextCollection: CollectionFile = {
      ...collection,
      requests: collection.requests.some((request) => request.id === draft.id)
        ? collection.requests.map((request) => (request.id === draft.id ? draft : request))
        : [...collection.requests, draft],
    };

    try {
      setCollection(nextCollection);
      await persistCollection(nextCollection);
      setStatusMessage("Saved to collection.json");
      pushToast("success", "Request saved", "collection.json");
    } catch (error) {
      const message = errorMessage(error);
      setStatusMessage(`Save failed: ${message}`);
      pushToast("error", "Save failed", message);
    } finally {
      setIsSaving(false);
    }
  }, [collection, draft, persistCollection, pushToast]);

  const runRequest = useCallback(async () => {
    if (!resolvedDraft.url.trim()) {
      setStatusMessage("Request URL is required");
      pushToast("warning", "Request URL is required");
      urlInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Sending ${resolvedDraft.method} request…`);
    const startedAt = performance.now();

    try {
      const preScript = runSandboxedScript(resolvedDraft.preRequestScript ?? "", { request: resolvedDraft, response: null, variables: activeEnvironment.variables });
      if (!preScript.ok) {
        setStatusMessage(`Pre-request script blocked: ${preScript.message}`);
        pushToast("warning", "Pre-request script blocked", preScript.message);
        return;
      }
      const requestForExecution: RequestRecord = preScript.requestPatch ? { ...resolvedDraft, ...preScript.requestPatch } : resolvedDraft;
      const nextResponse = await executeHttpRequest({
        method: requestForExecution.method,
        url: requestForExecution.url,
        headers: requestForExecution.headers,
        body: requestForExecution.body,
        timeoutMs: 30_000,
      });
      setResponse(nextResponse);
      const postScript = runSandboxedScript(requestForExecution.postResponseScript ?? "", { request: requestForExecution, response: nextResponse, variables: activeEnvironment.variables });
      setStatusMessage(postScript.ok ? `${nextResponse.status} ${nextResponse.statusText || "OK"} · ${nextResponse.responseTimeMs} ms` : `Post-response script blocked: ${postScript.message}`);
      pushToast(postScript.ok && nextResponse.status >= 200 && nextResponse.status < 400 ? "success" : "warning", `${nextResponse.status} ${nextResponse.statusText || "Response received"}`, `${nextResponse.responseTimeMs} ms`);

      const historyEntry: HistoryEntry = {
        id: makeId("history"),
        requestId: draft.id,
        name: draft.name,
        method: draft.method,
        url: requestForExecution.url,
        status: nextResponse.status,
        statusText: nextResponse.statusText,
        responseTimeMs: nextResponse.responseTimeMs,
        responseBody: nextResponse.body,
        responseHeaders: nextResponse.headers,
        requestHeaders: requestForExecution.headers,
        requestBody: requestForExecution.body,
        environmentId: activeEnvironment.id,
        resolvedUrl: requestForExecution.url,
        contentType: nextResponse.contentType,
        truncated: nextResponse.truncated,
        timing: nextResponse.timing,
        createdAt: new Date().toISOString(),
      };
      const nextHistoryFile: HistoryFile = {
        version: 1,
        entries: [historyEntry, ...historyFile.entries].slice(0, 100),
      };
      setHistoryFile(nextHistoryFile);
      await persistHistory(nextHistoryFile);
    } catch (error) {
      const message = errorMessage(error);
      const errorResponse: NativeHttpResponse = {
        status: 0,
        statusText: "Request failed",
        url: resolvedDraft.url,
        headers: [],
        body: message,
        responseTimeMs: Math.round(performance.now() - startedAt),
        contentType: "text/plain",
        truncated: false,
      };
      setResponse(errorResponse);
      setStatusMessage("Request failed");
      pushToast("error", "Request failed", message);

      const nextHistoryFile: HistoryFile = {
        version: 1,
        entries: [
          {
            id: makeId("history"),
            requestId: draft.id,
            name: draft.name,
            method: draft.method,
            url: resolvedDraft.url,
            status: null,
            statusText: "Request failed",
            responseTimeMs: errorResponse.responseTimeMs,
            responseBody: message,
            responseHeaders: [],
            requestHeaders: resolvedDraft.headers,
            requestBody: resolvedDraft.body,
            environmentId: activeEnvironment.id,
            resolvedUrl: resolvedDraft.url,
            contentType: errorResponse.contentType,
            truncated: false,
            createdAt: new Date().toISOString(),
            error: message,
          },
          ...historyFile.entries,
        ].slice(0, 100),
      };
      setHistoryFile(nextHistoryFile);
      await persistHistory(nextHistoryFile).catch(() => undefined);
    } finally {
      setIsLoading(false);
    }
  }, [activeEnvironment.id, activeEnvironment.variables, draft, historyFile.entries, persistHistory, pushToast, resolvedDraft]);

  const createRequest = useCallback(() => {
    const nextRequest: RequestRecord = {
      id: makeId("request"),
      name: "Untitled request",
      method: "GET",
      url: "",
      headers: [],
      body: "",
    };
    const nextCollection = { ...collection, requests: [...collection.requests, nextRequest] };
    setCollection(nextCollection);
    setActiveRequestId(nextRequest.id);
    setOpenTabs((current) => [...current.filter((id) => id !== nextRequest.id), nextRequest.id]);
    setDraft(nextRequest);
    setActiveView("collection");
    setResponse(null);
    void persistCollection(nextCollection);
    pushToast("success", "New request created");
  }, [collection, persistCollection, pushToast]);

  const selectRequest = useCallback((request: RequestRecord) => {
    setActiveRequestId(request.id);
    setOpenTabs((current) => [...current.filter((id) => id !== request.id), request.id]);
    setDraft(request);
    setResponse(null);
  }, []);

  const deleteRequest = useCallback(async () => {
    if (collection.requests.length <= 1) {
      setStatusMessage("Keep at least one request in the collection");
      pushToast("warning", "Keep at least one request in the collection");
      return;
    }

    const nextRequests = collection.requests.filter((request) => request.id !== draft.id);
    const nextCollection = { ...collection, requests: nextRequests };
    const nextRequest = nextRequests[0];
    setCollection(nextCollection);
    setActiveRequestId(nextRequest.id);
    setDraft(nextRequest);
    await persistCollection(nextCollection);
    setStatusMessage("Request removed");
    pushToast("success", "Request removed");
  }, [collection, draft.id, persistCollection, pushToast]);

  const chooseWorkspace = useCallback(async () => {
    try {
      const selectedRoot = await pickWorkspaceDirectory();
      if (!selectedRoot) return;
      const nextSettings: AppSettings = {
        ...settings,
        workspaceRoot: selectedRoot,
        recentWorkspaceRoots: [selectedRoot, ...settings.recentWorkspaceRoots.filter((root) => root !== selectedRoot)].slice(0, 8),
      };
      await persistSettings(nextSettings);
      await loadWorkspace(selectedRoot);
      setStatusMessage(`Workspace selected: ${workspaceName(selectedRoot)}`);
      pushToast("success", "Workspace selected", workspaceName(selectedRoot));
    } catch (error) {
      const message = errorMessage(error);
      setStatusMessage(`Workspace selection failed: ${message}`);
      pushToast("error", "Workspace selection failed", message);
    }
  }, [loadWorkspace, persistSettings, pushToast, settings]);

  const changeEnvironment = useCallback(async (environmentId: string) => {
    const nextSettings = { ...settings, activeEnvironmentId: environmentId };
    await persistSettings(nextSettings);
    setStatusMessage(`Environment: ${environmentFile.environments.find((environment) => environment.id === environmentId)?.name ?? environmentId}`);
  }, [environmentFile.environments, persistSettings, settings]);

  const updateEnvironmentVariables = useCallback((text: string) => {
    const nextEnvironmentFile: EnvironmentFile = {
      ...environmentFile,
      environments: environmentFile.environments.map((environment) =>
        environment.id === activeEnvironment.id
          ? { ...environment, variables: textToVariables(text) }
          : environment,
      ),
    };
    setEnvironmentFile(nextEnvironmentFile);
  }, [activeEnvironment.id, environmentFile]);

  const saveEnvironment = useCallback(async () => {
    await persistEnvironmentFile(environmentFile);
    setIsEnvironmentEditing(false);
    setStatusMessage("Saved to environments.json");
    pushToast("success", "Environment saved", "environments.json");
  }, [environmentFile, persistEnvironmentFile, pushToast]);

  const createEnvironment = useCallback(async () => {
    const nextEnvironment: EnvironmentRecord = {
      id: makeId("environment"),
      name: "New environment",
      variables: { baseUrl: "https://api.example.com" },
    };
    const nextFile = {
      ...environmentFile,
      environments: [...environmentFile.environments, nextEnvironment],
      activeEnvironmentId: nextEnvironment.id,
    };
    setEnvironmentFile(nextFile);
    await persistEnvironmentFile(nextFile);
    await changeEnvironment(nextEnvironment.id);
    setIsEnvironmentEditing(true);
  }, [changeEnvironment, environmentFile, persistEnvironmentFile]);

  const selectHistory = useCallback((entry: HistoryEntry) => {
    const matchingRequest = collection.requests.find((request) => request.id === entry.requestId);
    if (matchingRequest) {
      setActiveRequestId(matchingRequest.id);
      setDraft(matchingRequest);
    }
    setResponse({
      status: entry.status ?? 0,
      statusText: entry.statusText,
      url: entry.url,
      headers: entry.responseHeaders,
      body: entry.responseBody,
      responseTimeMs: entry.responseTimeMs ?? 0,
      contentType: entry.responseHeaders.find((header) => header.name.toLowerCase() === "content-type")?.value ?? null,
      truncated: false,
    });
    setActiveView("history");
    setStatusMessage(`History · ${new Date(entry.createdAt).toLocaleString()}`);
  }, [collection.requests]);

  const copyAsCurl = useCallback(async () => {
    const headerFlags = resolvedDraft.headers
      .filter((header) => header.enabled && header.name.trim())
      .map((header) => ` -H ${JSON.stringify(`${header.name}: ${header.value}`)}`)
      .join("");
    const bodyFlag = resolvedDraft.body && !["GET", "HEAD"].includes(resolvedDraft.method)
      ? ` --data-raw ${JSON.stringify(resolvedDraft.body)}`
      : "";
    const curl = `curl -X ${resolvedDraft.method}${headerFlags}${bodyFlag} ${JSON.stringify(resolvedDraft.url)}`;
    try {
      await navigator.clipboard?.writeText(curl);
      setStatusMessage("cURL command copied");
      pushToast("success", "cURL command copied");
    } catch (error) {
      pushToast("error", "Could not copy cURL", errorMessage(error));
    }
  }, [pushToast, resolvedDraft]);

  const duplicateRequest = useCallback(async () => {
    const duplicated: RequestRecord = {
      ...draft,
      id: makeId("request"),
      name: `${draft.name} copy`,
      headers: draft.headers.map((header) => ({ ...header })),
    };
    const nextCollection = { ...collection, requests: [...collection.requests, duplicated] };
    setCollection(nextCollection);
    setActiveRequestId(duplicated.id);
    setOpenTabs((current) => [...current.filter((id) => id !== duplicated.id), duplicated.id]);
    setDraft(duplicated);
    await persistCollection(nextCollection);
    setStatusMessage("Request duplicated");
    pushToast("success", "Request duplicated", duplicated.name);
  }, [collection, draft, persistCollection, pushToast]);

  const exportCollection = useCallback(() => {
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "collection.json";
    link.click();
    URL.revokeObjectURL(objectUrl);
    setStatusMessage("Collection exported");
    pushToast("success", "Collection exported", "collection.json");
  }, [collection, pushToast]);

  const openOnyxContent = useCallback(async (content: string, label: string) => {
    try {
      const parsed = parseOnyxDocument(content);
      setOnyxDocument(parsed);
      setIsNotebookOpen(true);
      if (parsed.source?.collection) setReviewBaseline(normalizeCollection(parsed.source.collection));
      setStatusMessage(`Opened ${label}`);
      pushToast("success", "Onyx notebook opened", label);
    } catch (error) {
      const message = errorMessage(error);
      setStatusMessage(`Open failed: ${message}`);
      pushToast("error", "Could not open .onyx", message);
    }
  }, [pushToast]);

  const openOnyxDocument = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await openOnyxContent(await file.text(), file.name);
  }, [openOnyxContent]);

  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void import("@tauri-apps/api/event")
      .then(({ listen }) => listen<string>("onyx-open-file", (event) => {
        if (!cancelled) {
          const path = event.payload;
          void import("@/lib/local-files").then(({ readOpenedOnyxFile }) =>
            readOpenedOnyxFile(path).then((snapshot) => openOnyxContent(snapshot.content, path.split(/[\\/]/).pop() ?? "document.onyx")),
          ).catch((error: unknown) => pushToast("error", "Could not open associated .onyx", errorMessage(error)));
        }
      }))
      .then((stop) => {
        if (cancelled) stop();
        else unlisten = stop;
      })
      .catch((error: unknown) => pushToast("error", "File association unavailable", errorMessage(error)));

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [openOnyxContent, pushToast]);

  const saveOnyxDocument = useCallback(async (document: OnyxDocument) => {
    const fileName = `${safeFileName(document.title)}.onyx`;
    const nextDocument: OnyxDocument = {
      ...document,
      updatedAt: new Date().toISOString(),
      review: reviewDocument,
      source: {
        ...document.source,
        collection,
        environment: { version: 1, activeEnvironmentId: activeEnvironment.id, environments: environmentFile.environments },
        historyEntryIds: visibleHistory.map((entry) => entry.id),
      },
    };
    setOnyxDocument(nextDocument);
    await writeWorkspaceFile(fileName, serializeOnyxDocument(nextDocument), settings.workspaceRoot);
    setStatusMessage(`Saved ${fileName}`);
    pushToast("success", "Onyx notebook saved", fileName);
  }, [activeEnvironment, collection, environmentFile.environments, pushToast, reviewDocument, settings.workspaceRoot, visibleHistory]);

  const createNotebook = useCallback(() => {
    setOnyxDocument(createOnyxDocument({ title: `${draft.name} Notebook`, documentType: "notebook" }));
    setIsNotebookOpen(true);
  }, [draft.name]);

  const importCollection = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const imported = normalizeCollection(JSON.parse(await file.text()));
      const firstRequest = imported.requests[0] ?? DEFAULT_REQUEST;
      setCollection(imported);
      setActiveRequestId(firstRequest.id);
      setDraft(firstRequest);
      await persistCollection(imported);
      setStatusMessage(`Imported ${imported.requests.length} requests`);
      pushToast("success", "Collection imported", `${imported.requests.length} requests`);
    } catch (error) {
      const message = errorMessage(error);
      setStatusMessage(`Import failed: ${message}`);
      pushToast("error", "Collection import failed", message);
    }
  }, [persistCollection, pushToast]);

  const importApiCollection = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseApiCollection(await file.text());
      const nextCollection: CollectionFile = { version: 2, name: imported.name, requests: imported.requests };
      const firstRequest = imported.requests[0] ?? DEFAULT_REQUEST;
      setCollection(nextCollection);
      setActiveRequestId(firstRequest.id);
      setOpenTabs([firstRequest.id]);
      setDraft(firstRequest);
      setActiveView("collection");
      await persistCollection(nextCollection);
      setStatusMessage(`Imported ${imported.requests.length} API requests`);
      pushToast("success", "API collection imported", `${imported.requests.length} requests`);
    } catch (error) {
      const message = errorMessage(error);
      setStatusMessage(`API import failed: ${message}`);
      pushToast("error", "API import failed", message);
    }
  }, [persistCollection, pushToast]);

  const replayHistoryEntry = useCallback((entry: HistoryEntry) => {
    const replayRequest: RequestRecord = {
      id: entry.requestId,
      name: entry.name,
      method: entry.method,
      url: entry.url,
      headers: entry.requestHeaders ?? [],
      body: entry.requestBody ?? "",
    };
    setDraft(replayRequest);
    setActiveRequestId(replayRequest.id);
    setOpenTabs((current) => [...current.filter((id) => id !== replayRequest.id), replayRequest.id]);
    setActiveView("collection");
    if (entry.status !== null) {
      setResponse({
        status: entry.status,
        statusText: entry.statusText,
        url: entry.resolvedUrl ?? entry.url,
        headers: entry.responseHeaders,
        body: entry.responseBody,
        responseTimeMs: entry.responseTimeMs ?? 0,
        contentType: entry.contentType ?? "application/json",
        truncated: entry.truncated === true,
        timing: entry.timing,
      });
    }
    setIsTimeMachineOpen(false);
    pushToast("success", "Snapshot loaded", "Replay it with the current environment when ready.");
  }, [pushToast]);

  const restoreReviewBaseline = useCallback(async () => {
    setCollection(reviewBaseline);
    const firstRequest = reviewBaseline.requests[0] ?? DEFAULT_REQUEST;
    setDraft(firstRequest);
    setActiveRequestId(firstRequest.id);
    setOpenTabs([firstRequest.id]);
    await persistCollection(reviewBaseline);
    setIsReviewOpen(false);
    pushToast("success", "Source restored", "Working tree replaced with the review baseline.");
  }, [persistCollection, pushToast, reviewBaseline]);

  const executeRequestForTest = useCallback(async (request: RequestRecord) => {
    const resolvedRequest: RequestRecord = {
      ...request,
      url: resolveVariables(request.url, activeEnvironment.variables),
      headers: request.headers.map((header) => ({ ...header, name: resolveVariables(header.name, activeEnvironment.variables), value: resolveVariables(header.value, activeEnvironment.variables) })),
      body: resolveVariables(request.body, activeEnvironment.variables),
    };
    const preScript = runSandboxedScript(resolvedRequest.preRequestScript ?? "", { request: resolvedRequest, response: null, variables: activeEnvironment.variables });
    if (!preScript.ok) throw new Error(`Pre-request script blocked: ${preScript.message}`);
    const scriptedRequest: RequestRecord = preScript.requestPatch ? { ...resolvedRequest, ...preScript.requestPatch } : resolvedRequest;
    const result = await executeHttpRequest({ method: scriptedRequest.method, url: scriptedRequest.url, headers: scriptedRequest.headers, body: scriptedRequest.body, timeoutMs: 30_000 });
    const postScript = runSandboxedScript(scriptedRequest.postResponseScript ?? "", { request: scriptedRequest, response: result, variables: activeEnvironment.variables });
    if (!postScript.ok) throw new Error(`Post-response script blocked: ${postScript.message}`);
    return result;
  }, [activeEnvironment.variables]);

  const saveEverything = useCallback(async () => {
    await saveRequest();
    await persistEnvironmentFile(environmentFile);
    await persistHistory(historyFile);
  }, [environmentFile, historyFile, persistEnvironmentFile, persistHistory, saveRequest]);

  const handleAgentToolCall = useCallback(async (call: GeminiToolCall, approved: boolean): Promise<ToolResult> => {
    const allowedTools = new Set(["inspect_current_request", "analyze_response", "send_current_request", "save_current_request"]);
    const isKnownTool = allowedTools.has(call.name);
    const isNetworkSideEffect = call.name === "send_current_request";
    const isFileWriteSideEffect = call.name === "save_current_request";
    const risk = isNetworkSideEffect ? "network" : isFileWriteSideEffect ? "filesystem" : "read";
    const policy = settings.gemini.policy;
    const unknownToolSummary = `${call.name}${call.arguments && typeof call.arguments === "object" ? ` ${JSON.stringify(call.arguments)}` : ""}`;

    if (!isKnownTool) {
      const message = `Tool is not allowlisted: ${call.name}`;
      await recordAudit({ tool: call.name, risk: "read", decision: "failed", summary: unknownToolSummary, result: message });
      return { status: "rejected", message };
    }

    const mustApprove = !approved && (
      policy.mode === "suggest"
      || (isNetworkSideEffect && policy.requireApprovalForNetwork)
      || (isFileWriteSideEffect && policy.requireApprovalForFileWrites)
    );
    const summary = `${call.name}${call.arguments && typeof call.arguments === "object" ? ` ${JSON.stringify(call.arguments)}` : ""}`;

    if (mustApprove) {
      const message = isNetworkSideEffect
        ? "This will send the current request to the network."
        : isFileWriteSideEffect
          ? "This will write the current request to the active collection."
          : "This action is not enabled for automatic execution.";
      await recordAudit({ tool: call.name, risk, decision: "pending", summary, result: message });
      return { status: "approval-required", message };
    }

    if (call.name === "inspect_current_request") {
      const result = { status: "executed" as const, message: agentContext };
      await recordAudit({ tool: call.name, risk, decision: approved ? "approved" : "auto-approved", summary, result: "Current request context inspected." });
      return result;
    }
    if (call.name === "analyze_response") {
      const message = response ? responseText(response) : "No response is available yet.";
      await recordAudit({ tool: call.name, risk, decision: approved ? "approved" : "auto-approved", summary, result: "Latest response analyzed." });
      return { status: "executed", message };
    }
    if (call.name === "send_current_request") {
      if (!resolvedDraft.url.trim()) {
        const message = "The current request URL is empty.";
        await recordAudit({ tool: call.name, risk, decision: "failed", summary, result: message });
        return { status: "rejected", message };
      }
      await runRequest();
      const message = "The current request was sent through Onyx native HTTP.";
      await recordAudit({ tool: call.name, risk, decision: approved ? "approved" : "auto-approved", summary, result: message });
      return { status: "executed", message };
    }
    if (call.name === "save_current_request") {
      await saveRequest();
      const message = "The current request was saved to the active collection.";
      await recordAudit({ tool: call.name, risk, decision: approved ? "approved" : "auto-approved", summary, result: message });
      return { status: "executed", message };
    }

    const message = `Tool is not allowlisted: ${call.name}`;
    await recordAudit({ tool: call.name, risk, decision: "failed", summary, result: message });
    return { status: "rejected", message };
  }, [agentContext, recordAudit, response, resolvedDraft.url, runRequest, saveRequest, settings.gemini.policy]);

  const handleAgentToolRejected = useCallback(async (call: GeminiToolCall) => {
    const isNetworkSideEffect = call.name === "send_current_request";
    const isFileWriteSideEffect = call.name === "save_current_request";
    await recordAudit({
      tool: call.name,
      risk: isNetworkSideEffect ? "network" : isFileWriteSideEffect ? "filesystem" : "read",
      decision: "rejected",
      summary: `${call.name}${call.arguments && typeof call.arguments === "object" ? ` ${JSON.stringify(call.arguments)}` : ""}`,
      result: "User rejected the proposed action.",
    });
  }, [recordAudit]);

  const activeAgentProvider = settings.gemini.provider;
  const activeAgentProviderLabel = AGENT_PROVIDER_OPTIONS.find((provider) => provider.id === activeAgentProvider)?.label ?? activeAgentProvider;

  const saveAgentKey = useCallback(async () => {
    const apiKey = agentKeyDraft.trim();
    if (!apiKey) {
      setStatusMessage(`${activeAgentProviderLabel} API key is required`);
      pushToast("warning", `${activeAgentProviderLabel} API key is required`);
      return;
    }
    try {
      await setAgentApiKey(activeAgentProvider, apiKey);
      setAgentKeyDraft("");
      setAgentKeyStatuses((current) => ({ ...current, [activeAgentProvider]: true }));
      setStatusMessage(`${activeAgentProviderLabel} API key saved to the OS keychain`);
      pushToast("success", `${activeAgentProviderLabel} API key saved`, "OS keychain");
    } catch (error) {
      const message = errorMessage(error);
      setStatusMessage(`${activeAgentProviderLabel} keychain save failed: ${message}`);
      pushToast("error", `${activeAgentProviderLabel} keychain save failed`, message);
    }
  }, [activeAgentProvider, activeAgentProviderLabel, agentKeyDraft, pushToast]);

  const removeAgentKey = useCallback(async () => {
    try {
      await deleteAgentApiKey(activeAgentProvider);
      setAgentKeyStatuses((current) => ({ ...current, [activeAgentProvider]: false }));
      setAgentTestStatus(null);
      setStatusMessage(`${activeAgentProviderLabel} API key removed from the OS keychain`);
      pushToast("success", `${activeAgentProviderLabel} API key removed`, "OS keychain");
    } catch (error) {
      const message = errorMessage(error);
      setStatusMessage(`${activeAgentProviderLabel} keychain removal failed: ${message}`);
      pushToast("error", `${activeAgentProviderLabel} keychain removal failed`, message);
    }
  }, [activeAgentProvider, activeAgentProviderLabel, pushToast]);

  const testAgentConnection = useCallback(async () => {
    if (!agentKeyStatuses[activeAgentProvider]) {
      setAgentTestStatus("No key configured");
      return;
    }
    setAgentTestStatus("Testing…");
    try {
      const result = await executeAgentInteraction({
        provider: activeAgentProvider,
        model: settings.gemini.model,
        input: "Reply with exactly: OK",
        systemInstruction: "You are performing a connectivity check. Reply with exactly OK and do not call tools.",
        temperature: 0,
        maxOutputTokens: 16,
        tools: [],
        timeoutMs: settings.gemini.timeoutMs,
        endpointOverride: settings.gemini.endpointOverride || undefined,
      });
      setAgentTestStatus(`Connected · ${result.responseTimeMs} ms`);
      pushToast("success", `${activeAgentProviderLabel} connection verified`, `${result.responseTimeMs} ms`);
    } catch (error) {
      const message = errorMessage(error);
      setAgentTestStatus(`Failed · ${message}`);
      pushToast("error", `${activeAgentProviderLabel} connection failed`, message);
    }
  }, [activeAgentProvider, activeAgentProviderLabel, agentKeyStatuses, pushToast, settings.gemini.endpointOverride, settings.gemini.model, settings.gemini.timeoutMs]);

  const updateAppearanceSettings = useCallback((patch: Partial<AppSettings["appearance"]>) => {
    setSettings((current) => ({ ...current, appearance: { ...current.appearance, ...patch } }));
  }, []);

  const updateEditorSettings = useCallback((patch: Partial<AppSettings["editor"]>) => {
    setSettings((current) => ({ ...current, editor: { ...current.editor, ...patch } }));
  }, []);

  const updateLayoutSettings = useCallback((patch: Partial<AppSettings["layout"]>) => {
    setSettings((current) => ({ ...current, layout: { ...current.layout, ...patch } }));
  }, []);

  const updateStartupSettings = useCallback((patch: Partial<AppSettings["startup"]>) => {
    setSettings((current) => ({ ...current, startup: { ...current.startup, ...patch } }));
  }, []);

  const updateNotificationSettings = useCallback((patch: Partial<AppSettings["notifications"]>) => {
    setSettings((current) => ({ ...current, notifications: { ...current.notifications, ...patch } }));
  }, []);

  const updateAgentSettings = useCallback((patch: Partial<AppSettings["gemini"]>) => {
    setSettings((current) => ({ ...current, gemini: { ...current.gemini, ...patch } }));
  }, []);

  const updateAgentPolicy = useCallback((patch: Partial<AppSettings["gemini"]["policy"]>) => {
    setSettings((current) => ({
      ...current,
      gemini: { ...current.gemini, policy: { ...current.gemini.policy, ...patch } },
    }));
  }, []);

  useEffect(() => {
    function handleKeyboardShortcuts(event: globalThis.KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        setIsCommandOpen(false);
        setIsQuickOpenOpen(false);
        setIsTestRunnerOpen(false);
        setIsNotebookOpen(false);
        setIsReviewOpen(false);
        setIsTimeMachineOpen(false);
        return;
      }
      if (!modifier) return;

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen(true);
        setCommandQuery("");
      }
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        setIsQuickOpenOpen(true);
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveEverything();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void runRequest();
      }
      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        setIsSidebarOpen((current) => !current);
      }
      if (event.key.toLowerCase() === "g" && event.shiftKey) {
        event.preventDefault();
        setIsAssistantOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [runRequest, saveEverything]);

  useEffect(() => {
    if (isCommandOpen) commandInputRef.current?.focus();
  }, [isCommandOpen]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = settings.appearance.reduceMotion ? "true" : "false";
    return () => {
      delete document.documentElement.dataset.reduceMotion;
    };
  }, [settings.appearance.reduceMotion]);

  function updateDraft<K extends keyof RequestRecord>(key: K, value: RequestRecord[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleUrlKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void runRequest();
    }
  }

  function handleMethodChange(event: ChangeEvent<HTMLSelectElement>) {
    updateDraft("method", event.target.value as HttpMethod);
  }

  const handleContextMenuAction = useCallback(async (action: ContextMenuAction) => {
    const target = contextTargetRef.current;
    closeContextMenu();

    if (["copy", "cut", "select-all"].includes(action)) {
      if (!target) return;
      target.focus();
      const command = action === "select-all" ? "selectAll" : action;
      const completed = document.execCommand(command);
      pushToast(completed ? "success" : "warning", completed ? `${action === "select-all" ? "All text selected" : `${action[0].toUpperCase()}${action.slice(1)} completed`}` : "Clipboard action unavailable");
      return;
    }

    if (action === "paste") {
      if (!target) return;
      try {
        const text = await navigator.clipboard.readText();
        const start = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? start;
        target.focus();
        target.setRangeText(text, start, end, "end");
        target.dispatchEvent(new Event("input", { bubbles: true }));
        pushToast("success", "Pasted from clipboard");
      } catch (error) {
        pushToast("error", "Paste failed", errorMessage(error));
      }
      return;
    }

    if (action === "send") void runRequest();
    if (action === "save") void saveEverything();
    if (action === "duplicate") void duplicateRequest();
    if (action === "copy-curl") void copyAsCurl();
    if (action === "new-request") createRequest();
  }, [closeContextMenu, copyAsCurl, createRequest, duplicateRequest, pushToast, runRequest, saveEverything]);

  function runCommand(commandId: string) {
    setIsCommandOpen(false);
    setCommandQuery("");
    if (commandId === "new") createRequest();
    if (commandId === "save") void saveEverything();
    if (commandId === "send") void runRequest();
    if (commandId === "workspace") void chooseWorkspace();
    if (commandId === "collection") setActiveView("collection");
    if (commandId === "history") setActiveView("history");
    if (commandId === "environment") setActiveView("environments");
    if (commandId === "export") exportCollection();
    if (commandId === "import") importInputRef.current?.click();
    if (commandId === "openapi") openApiInputRef.current?.click();
    if (commandId === "open-onyx") onyxInputRef.current?.click();
    if (commandId === "tests") setIsTestRunnerOpen(true);
    if (commandId === "quick-open") setIsQuickOpenOpen(true);
    if (commandId === "review") setIsReviewOpen(true);
    if (commandId === "time-machine") setIsTimeMachineOpen(true);
    if (commandId === "notebook") createNotebook();
    if (commandId === "curl") void copyAsCurl();
    if (commandId === "duplicate") void duplicateRequest();
    if (commandId === "assistant") setIsAssistantOpen(true);
    if (commandId === "settings") setIsSettingsOpen(true);
  }

  const commands = [
    { id: "new", label: "New request", shortcut: "⌘N" },
    { id: "send", label: "Send current request", shortcut: "⌘↵" },
    { id: "save", label: "Save workspace", shortcut: "⌘S" },
    { id: "workspace", label: "Choose Git workspace folder", shortcut: "" },
    { id: "collection", label: "Open collection", shortcut: "" },
    { id: "history", label: "Open request history", shortcut: "" },
    { id: "environment", label: "Open environments", shortcut: "" },
    { id: "export", label: "Export collection.json", shortcut: "" },
    { id: "import", label: "Import collection.json", shortcut: "" },
    { id: "openapi", label: "Import OpenAPI or Postman JSON", shortcut: "" },
    { id: "open-onyx", label: "Open Onyx notebook (.onyx)", shortcut: "" },
    { id: "notebook", label: "Create API notebook (.onyx)", shortcut: "" },
    { id: "review", label: "Review collection changes", shortcut: "" },
    { id: "time-machine", label: "Open Request Time Machine", shortcut: "" },
    { id: "tests", label: "Run collection tests", shortcut: "" },
    { id: "quick-open", label: "Quick open request", shortcut: "⌘P" },
    { id: "curl", label: "Copy current request as cURL", shortcut: "" },
    { id: "duplicate", label: "Duplicate current request", shortcut: "" },
    { id: "assistant", label: "Open AI Agent", shortcut: "⌘⇧G" },
    { id: "settings", label: "Open Settings", shortcut: "" },
  ].filter((command) => command.label.toLowerCase().includes(commandQuery.toLowerCase()));

  return (
    <main
      className="flex h-screen min-h-[560px] w-full overflow-hidden bg-background text-sm text-foreground antialiased"
      data-density={settings.appearance.density}
      data-theme={settings.appearance.theme}
      onContextMenu={handleContextMenu}
      style={{ "--onyx-sidebar-width": `${settings.layout.sidebarWidth}px`, "--onyx-editor-font-size": `${settings.editor.fontSize}px` } as CSSProperties}
    >
      <input ref={importInputRef} accept=".json,application/json" className="hidden" onChange={(event) => void importCollection(event)} type="file" />
      <input ref={openApiInputRef} accept=".json,application/json" className="hidden" onChange={(event) => void importApiCollection(event)} type="file" />
      <input ref={onyxInputRef} accept=".onyx,application/json" className="hidden" onChange={(event) => void openOnyxDocument(event)} type="file" />

      <aside className={`flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${isSidebarOpen ? "w-[var(--onyx-sidebar-width)]" : "w-14"}`}>
        <div className="flex h-14 items-center border-b border-border px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-neutral-400 text-[11px] font-semibold tracking-[-0.08em] text-neutral-100">O/</div>
            {isSidebarOpen ? <span className="truncate font-mono text-[12px] font-semibold tracking-[0.18em] text-neutral-200">ONYX</span> : null}
          </div>
          <button aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"} className="flex h-7 w-7 items-center justify-center text-neutral-500 transition-colors hover:bg-surface-hover hover:text-neutral-200" onClick={() => setIsSidebarOpen((current) => !current)} title="Toggle sidebar (⌘/Ctrl+B)" type="button"><Icon name="panel-left" size={15} /></button>
        </div>

        {isSidebarOpen ? (
          <>
            <div className="flex items-center gap-1 border-b border-border px-2 py-2">
              <button className="flex h-8 flex-1 items-center gap-2 border border-border bg-surface-raised px-3 text-[11px] font-medium text-neutral-300 transition-colors hover:border-border-strong hover:bg-surface-hover" onClick={createRequest} type="button"><Icon name="plus" size={14} />New request</button>
              <button aria-label="Open command palette" className="flex h-8 w-8 items-center justify-center border border-border bg-surface-raised text-neutral-500 transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => setIsCommandOpen(true)} title="Command palette (⌘/Ctrl+K)" type="button"><Icon name="search" size={14} /></button>
            </div>

            <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-2 py-3">
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600"><span>Workspace</span><button aria-label="Workspace actions" className="text-neutral-600 hover:text-neutral-300" type="button"><Icon name="more" size={14} /></button></div>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-neutral-300 transition-colors hover:bg-surface-hover" onClick={() => setIsCollectionOpen((current) => !current)} type="button"><Icon name={isCollectionOpen ? "chevron-down" : "chevron-right"} size={13} /><Icon name="folder" size={14} /><span className="truncate">{collection.name}</span></button>
                {isCollectionOpen && activeView === "collection" ? (
                  <>
                  <div className="mb-2 ml-3 flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-2"><Icon name="search" size={13} /><input aria-label="Filter requests" className="h-7 min-w-0 flex-1 bg-transparent font-mono text-[10px] text-neutral-300 outline-none placeholder:text-neutral-700" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Filter requests…" value={searchQuery} /></div>
                  <div className="ml-3 border-l border-border pl-2">
                    <div className="mb-1 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-600">Requests · {collection.requests.length.toString().padStart(2, "0")}</div>
                    {filteredRequests.map((request) => (
                      <button className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-colors ${activeRequestId === request.id ? "bg-surface-active text-neutral-100" : "text-neutral-500 hover:bg-surface-hover hover:text-neutral-300"}`} key={request.id} onClick={() => selectRequest(request)} type="button"><span className={`w-12 shrink-0 font-mono text-[10px] font-semibold ${methodClass(request.method)}`}>{request.method}</span><Icon name="file" size={13} /><span className="truncate">{request.name}</span></button>
                    ))}
                    {filteredRequests.length === 0 ? <div className="px-2 py-4 text-[11px] text-neutral-600">No matching requests.</div> : null}
                  </div>
                  </>
                ) : null}
              </div>

              <div className="mb-5">
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Navigate</div>
                <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-colors ${activeView === "collection" ? "bg-surface-active text-neutral-200" : "text-neutral-500 hover:bg-surface-hover hover:text-neutral-300"}`} onClick={() => setActiveView("collection")} type="button"><Icon name="folder" size={14} />Collection</button>
                <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-colors ${activeView === "history" ? "bg-surface-active text-neutral-200" : "text-neutral-500 hover:bg-surface-hover hover:text-neutral-300"}`} onClick={() => setActiveView("history")} type="button"><Icon name="history" size={14} />History <span className="ml-auto font-mono text-[10px] text-neutral-600">{historyFile.entries.length}</span></button>
                <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-colors ${activeView === "environments" ? "bg-surface-active text-neutral-200" : "text-neutral-500 hover:bg-surface-hover hover:text-neutral-300"}`} onClick={() => setActiveView("environments")} type="button"><Icon name="variable" size={14} />Environments</button>
              </div>

              <div>
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Workspace root</div>
                <button className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-neutral-500 transition-colors hover:bg-surface-hover hover:text-neutral-300" onClick={() => void chooseWorkspace()} type="button"><Icon name="folder-open" size={14} /><span className="min-w-0 truncate">{workspaceName(settings.workspaceRoot)}{workspaceInfo.isGitRepository ? " · git" : ""}</span></button>
              </div>
            </nav>

            <div className="border-t border-border bg-surface/60 p-3"><button className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-neutral-500 transition-colors hover:bg-surface-hover hover:text-neutral-300" onClick={() => setIsSettingsOpen(true)} type="button"><Icon name="settings" size={14} />Settings</button></div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center gap-2 py-3"><button aria-label="Collection" className="flex h-8 w-8 items-center justify-center text-neutral-500 hover:bg-surface-hover hover:text-neutral-200" onClick={() => setActiveView("collection")} type="button"><Icon name="folder" size={15} /></button><button aria-label="History" className="flex h-8 w-8 items-center justify-center text-neutral-500 hover:bg-surface-hover hover:text-neutral-200" onClick={() => setActiveView("history")} type="button"><Icon name="history" size={15} /></button><button aria-label="Environments" className="flex h-8 w-8 items-center justify-center text-neutral-500 hover:bg-surface-hover hover:text-neutral-200" onClick={() => setActiveView("environments")} type="button"><Icon name="variable" size={15} /></button></div>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3 text-[11px] text-neutral-600"><span className="font-mono text-neutral-500">{collection.name}</span><span className="text-neutral-700">/</span><span className="truncate text-neutral-200">{activeView === "collection" ? draft.name : activeView === "history" ? "History" : "Environments"}</span><span className="hidden truncate text-[10px] text-neutral-700 xl:inline">{statusMessage}</span></div>
          <div className="flex items-center gap-2"><button className="onyx-command-button hidden sm:inline-flex" onClick={() => setIsQuickOpenOpen(true)} title="Quick open (⌘/Ctrl+P)" type="button"><Icon name="search" size={13} /><span>Search requests</span><span className="onyx-command-key">⌘P</span></button><label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 text-[10px] uppercase tracking-[0.12em] text-neutral-600"><span className="hidden lg:inline">Env</span><select aria-label="Active environment" className="h-7 bg-transparent px-1 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none" onChange={(event) => void changeEnvironment(event.target.value)} value={activeEnvironment.id}>{environmentFile.environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)}</select></label><span className="hidden font-mono text-[10px] text-neutral-600 lg:inline">{collection.requests.length.toString().padStart(2, "0")} REQUESTS</span><button className="hidden rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200 xl:inline-flex" onClick={() => setIsReviewOpen(true)} title="Git Review Mode" type="button">Review</button><button className="hidden rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200 xl:inline-flex" onClick={createNotebook} title="Create .onyx notebook" type="button">Notebook</button><button className="hidden rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200 xl:inline-flex" onClick={() => setIsTimeMachineOpen(true)} title="Request Time Machine" type="button">Replay</button><button aria-label="Toggle Onyx Agent" className={`rounded-lg border px-3 py-1.5 text-[10px] transition-colors ${isAssistantOpen ? "border-neutral-300 bg-surface-active text-neutral-100" : "border-border text-neutral-500 hover:border-border-strong hover:text-neutral-200"}`} onClick={() => setIsAssistantOpen((current) => !current)} title="Toggle Onyx Agent (⌘/Ctrl+Shift+G)" type="button">Agent</button><button aria-label="Open Settings" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-neutral-500 transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => setIsSettingsOpen(true)} title="Settings" type="button"><Icon name="settings" size={14} /></button></div>
        </header>

        {activeView === "collection" ? <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-surface/45 px-3 py-2">{openTabs.map((tabId) => { const tab = collection.requests.find((request) => request.id === tabId); if (!tab) return null; return <div className={`group flex shrink-0 items-center rounded-lg border px-1 ${activeRequestId === tab.id ? "border-border-strong bg-surface-active" : "border-transparent hover:bg-surface-hover"}`} key={tab.id}><button className="flex max-w-[180px] items-center gap-2 px-2 py-1 text-left text-[11px]" onClick={() => selectRequest(tab)} type="button"><span className={`font-mono text-[10px] font-semibold ${methodClass(tab.method)}`}>{tab.method}</span><span className="truncate text-neutral-300">{tab.name}</span></button><button aria-label={`Close ${tab.name} tab`} className="flex h-5 w-5 items-center justify-center rounded text-neutral-700 hover:bg-surface-raised hover:text-neutral-200" onClick={() => { const remaining = openTabs.filter((id) => id !== tab.id); setOpenTabs(remaining.length > 0 ? remaining : [collection.requests[0]?.id ?? tab.id]); if (activeRequestId === tab.id) { const next = collection.requests.find((request) => request.id === remaining.at(-1)); if (next) selectRequest(next); } }} type="button"><Icon name="close" size={12} /></button></div>; })}<button className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-neutral-600 hover:border-border-strong hover:text-neutral-200" onClick={createRequest} title="New request" type="button"><Icon name="plus" size={13} /></button></div> : null}

        {activeView === "collection" && (!settings.workspaceRoot || collection.requests.length === 0) ? <div className="mx-5 mt-4 flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.12)]"><div><div className="text-sm font-medium text-neutral-100">Welcome to Onyx</div><div className="mt-1 text-[11px] text-neutral-600">Choose a local Git folder or import an API definition to start with a clean, versionable workspace.</div></div><div className="flex shrink-0 gap-2"><button className="rounded-lg border border-border px-3 py-2 text-[10px] text-neutral-300 hover:border-border-strong hover:bg-surface-hover" onClick={() => void chooseWorkspace()} type="button">Choose workspace</button><button className="rounded-lg bg-neutral-200 px-3 py-2 text-[10px] font-semibold text-black hover:bg-white" onClick={() => openApiInputRef.current?.click()} type="button">Import API</button></div></div> : null}

        {activeView === "environments" ? (
          <section className="flex min-h-0 flex-1 flex-col p-5">
            <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><div className="text-sm font-medium text-neutral-200">Environments</div><div className="mt-1 text-[11px] text-neutral-600">Variables resolve from {'{{variable}}'} placeholders at request time.</div></div><div className="flex items-center gap-2"><button className="flex h-7 items-center gap-2 border border-border px-2 text-[11px] text-neutral-400 hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => void createEnvironment()} type="button"><Icon name="plus" size={13} />New environment</button><button className="flex h-7 items-center gap-2 border border-border px-2 text-[11px] text-neutral-400 hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => setIsEnvironmentEditing((current) => !current)} type="button"><Icon name={isEnvironmentEditing ? "close" : "variable"} size={13} />{isEnvironmentEditing ? "Close editor" : "Edit variables"}</button></div></div>
              <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">
                <div className="border-r border-border p-2">{environmentFile.environments.map((environment) => <button className={`mb-1 flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] ${environment.id === activeEnvironment.id ? "bg-surface-raised text-neutral-100" : "text-neutral-500 hover:bg-surface-hover hover:text-neutral-300"}`} key={environment.id} onClick={() => void changeEnvironment(environment.id)} type="button"><Icon name="globe" size={14} />{environment.name}</button>)}</div>
                <div className="flex min-h-0 flex-col p-4"><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-medium text-neutral-200">{activeEnvironment.name}</div><div className="mt-1 font-mono text-[10px] text-neutral-600">environments.json</div></div><button className="flex h-7 items-center gap-2 border border-border px-2 text-[11px] text-neutral-400 hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => void saveEnvironment()} type="button"><Icon name="save" size={13} />Save</button></div><textarea aria-label="Environment variables" className="min-h-0 flex-1 resize-none rounded-xl border border-border bg-surface-raised p-4 font-mono leading-6 text-neutral-300 outline-none focus:border-border-strong" disabled={!isEnvironmentEditing} style={{ fontSize: "var(--onyx-editor-font-size)", whiteSpace: settings.editor.wordWrap ? "pre-wrap" : "pre" }} onChange={(event) => updateEnvironmentVariables(event.target.value)} value={isEnvironmentEditing ? variablesToText(activeEnvironment.variables) : variablesToText(Object.fromEntries(Object.entries(activeEnvironment.variables).map(([key, value]) => [key, (activeEnvironment.secretKeys ?? []).includes(key) ? "••••••••" : value])))} /><label className="mt-3 block text-[10px] uppercase tracking-[0.12em] text-neutral-600">Secret keys<input aria-label="Secret environment keys" className="mt-1 h-8 w-full rounded-lg border border-border bg-surface-raised px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" disabled={!isEnvironmentEditing} onChange={(event) => { const secretKeys = event.target.value.split(",").map((key) => key.trim()).filter(Boolean); setEnvironmentFile((current) => ({ ...current, environments: current.environments.map((environment) => environment.id === activeEnvironment.id ? { ...environment, secretKeys } : environment) })); }} placeholder="apiKey, password, token" value={(activeEnvironment.secretKeys ?? []).join(", ")} /></label><div className="mt-3 text-[10px] text-neutral-600">Secret values are masked outside edit mode and redacted from AI context.</div></div>
              </div>
            </div>
          </section>
        ) : activeView === "history" ? (
          <section className="flex min-h-0 flex-1 flex-col p-5"><div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.18)]"><div className="flex items-center justify-between border-b border-border px-4 py-3"><div><div className="text-sm font-medium text-neutral-200">Request history</div><div className="mt-1 text-[11px] text-neutral-600">Last 100 local executions are stored in history.json.</div></div><button className="flex h-7 items-center gap-2 border border-border px-2 text-[11px] text-neutral-400 hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => { setHistoryFile(DEFAULT_HISTORY_FILE); void persistHistory(DEFAULT_HISTORY_FILE); }} type="button"><Icon name="trash" size={13} />Clear history</button></div><div className="min-h-0 flex-1 overflow-y-auto p-2">{visibleHistory.length === 0 ? <div className="flex h-full items-center justify-center text-[12px] text-neutral-600">No request history yet.</div> : visibleHistory.map((entry) => <button className="flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left hover:bg-surface-hover" key={entry.id} onClick={() => selectHistory(entry)} type="button"><span className={`w-12 font-mono text-[10px] font-semibold ${methodClass(entry.method)}`}>{entry.method}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] text-neutral-300">{entry.name}</span><span className="mt-1 block truncate font-mono text-[10px] text-neutral-600">{entry.url}</span></span><span className={`font-mono text-[10px] ${statusClass(entry.status)}`}>{entry.status ?? "ERR"}</span><span className="font-mono text-[10px] text-neutral-600">{entry.responseTimeMs ?? "—"} ms</span></button>)}</div></div></section>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col p-3">
              <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3"><div className="flex min-w-0 flex-1 items-center gap-2"><Icon name="file" size={14} /><input aria-label="Request name" className="min-w-0 flex-1 bg-transparent font-medium text-neutral-200 outline-none placeholder:text-neutral-600" onChange={(event) => updateDraft("name", event.target.value)} value={draft.name} /></div><div className="flex items-center gap-1"><button aria-label="Save request" className="flex h-7 items-center gap-2 border border-border px-2 text-[11px] text-neutral-400 transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200 disabled:opacity-40" disabled={isSaving} onClick={() => void saveRequest()} title="Save request (⌘/Ctrl+S)" type="button"><Icon name="save" size={13} />{isSaving ? "Saving" : "Save"}</button><button aria-label="Delete request" className="flex h-7 w-7 items-center justify-center border border-border text-neutral-500 hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => void deleteRequest()} title="Delete request" type="button"><Icon name="trash" size={13} /></button><button aria-label="Copy as cURL" className="flex h-7 w-7 items-center justify-center border border-border text-neutral-500 hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => void copyAsCurl()} title="Copy as cURL" type="button"><Icon name="copy" size={13} /></button><button aria-label="More request actions" className="flex h-7 w-7 items-center justify-center border border-border text-neutral-500 hover:border-border-strong hover:bg-surface-hover hover:text-neutral-200" onClick={() => setIsCommandOpen(true)} type="button"><Icon name="more" size={14} /></button></div></div>
                <div className="flex shrink-0 items-center gap-2 border-b border-border p-3"><select aria-label="HTTP method" className="h-10 w-[104px] rounded-xl border border-border bg-surface-raised px-3 font-mono text-[11px] text-neutral-200 outline-none transition-colors focus:border-border-strong" onChange={handleMethodChange} value={draft.method}>{HTTP_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select><input ref={urlInputRef} aria-label="Request URL" className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface-raised px-4 font-mono text-[12px] text-neutral-300 outline-none transition-colors placeholder:text-neutral-700 focus:border-border-strong" onChange={(event) => updateDraft("url", event.target.value)} onKeyDown={handleUrlKeyDown} placeholder="https://api.example.com/resource or {{baseUrl}}/resource" value={draft.url} /><button className="flex h-10 items-center gap-2 rounded-xl bg-neutral-200 px-5 text-[11px] font-semibold text-black transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-50" disabled={isLoading} onClick={() => void runRequest()} type="button"><Icon name={isLoading ? "refresh" : "send"} size={14} />{isLoading ? "Sending" : "Send"}</button></div>
                {draft.url !== resolvedDraft.url ? <div className="border-b border-border px-3 py-2 font-mono text-[10px] text-neutral-600">Resolved URL: <span className="text-neutral-400">{resolvedDraft.url}</span></div> : null}
                <div className="flex shrink-0 items-center gap-4 border-b border-border px-3"><button className={`border-b-2 py-2 text-[11px] ${activePanel === "headers" ? "border-neutral-300 text-neutral-200" : "border-transparent text-neutral-600 hover:text-neutral-300"}`} onClick={() => setActivePanel("headers")} type="button">Headers <span className="ml-1 font-mono text-[10px] text-neutral-600">{draft.headers.filter((header) => header.enabled).length.toString().padStart(2, "0")}</span></button><button className={`border-b-2 py-2 text-[11px] ${activePanel === "body" ? "border-neutral-300 text-neutral-200" : "border-transparent text-neutral-600 hover:text-neutral-300"}`} onClick={() => setActivePanel("body")} type="button">Body</button><button className={`border-b-2 py-2 text-[11px] ${activePanel === "scripts" ? "border-neutral-300 text-neutral-200" : "border-transparent text-neutral-600 hover:text-neutral-300"}`} onClick={() => setActivePanel("scripts")} type="button">Scripts</button></div>
                <div className="min-h-[170px] flex-1 p-3">{activePanel === "headers" ? <textarea aria-label="Request headers" className="h-full min-h-[170px] w-full resize-none rounded-xl border border-border bg-surface-raised p-4 font-mono leading-6 text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => updateDraft("headers", parseHeaders(event.target.value))} style={{ fontSize: "var(--onyx-editor-font-size)", whiteSpace: settings.editor.wordWrap ? "pre-wrap" : "pre" }} placeholder="Header-Name: value" value={formatHeaders(draft.headers)} /> : activePanel === "body" ? <textarea aria-label="Request body" className="h-full min-h-[170px] w-full resize-none rounded-xl border border-border bg-surface-raised p-4 font-mono leading-6 text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => updateDraft("body", event.target.value)} style={{ fontSize: "var(--onyx-editor-font-size)", whiteSpace: settings.editor.wordWrap ? "pre-wrap" : "pre" }} placeholder={'{\n  "key": "value"\n}'} value={draft.body} /> : <div className="grid h-full min-h-[170px] gap-3 md:grid-cols-2"><label className="flex min-h-0 flex-col gap-2 text-[10px] uppercase tracking-[0.12em] text-neutral-600">Pre-request script<textarea aria-label="Pre-request script" className="min-h-0 flex-1 resize-none rounded-xl border border-border bg-surface-raised p-3 font-mono leading-5 text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => updateDraft("preRequestScript", event.target.value)} style={{ fontSize: "var(--onyx-editor-font-size)", whiteSpace: settings.editor.wordWrap ? "pre-wrap" : "pre" }} placeholder={'// Return a request patch\nreturn { headers: request.headers };'} value={draft.preRequestScript ?? ""} /></label><label className="flex min-h-0 flex-col gap-2 text-[10px] uppercase tracking-[0.12em] text-neutral-600">Post-response script<textarea aria-label="Post-response script" className="min-h-0 flex-1 resize-none rounded-xl border border-border bg-surface-raised p-3 font-mono leading-5 text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => updateDraft("postResponseScript", event.target.value)} style={{ fontSize: "var(--onyx-editor-font-size)", whiteSpace: settings.editor.wordWrap ? "pre-wrap" : "pre" }} placeholder={'// Read response.status or response.body\nconsole.log(response?.status);'} value={draft.postResponseScript ?? ""} /></label><div className="col-span-full text-[10px] text-neutral-600">Scripts run locally with a restricted API. Network, DOM, storage, dynamic imports and global evaluation are blocked.</div></div>}</div>
              </div>
            </div>

            <section className="flex min-h-[250px] shrink-0 flex-col border-t border-border bg-surface/70"><div className="flex h-10 items-center justify-between border-b border-border px-3"><div className="flex items-center gap-3"><span className="text-[11px] font-medium text-neutral-300">Response</span><span className="font-mono text-[10px] text-neutral-600">{response?.contentType ?? "application/json"}</span><button className={`border-b-2 py-2 text-[10px] ${responsePanel === "body" ? "border-neutral-300 text-neutral-200" : "border-transparent text-neutral-600"}`} onClick={() => setResponsePanel("body")} type="button">Body</button><button className={`border-b-2 py-2 text-[10px] ${responsePanel === "headers" ? "border-neutral-300 text-neutral-200" : "border-transparent text-neutral-600"}`} onClick={() => setResponsePanel("headers")} type="button">Headers</button><button className={`border-b-2 py-2 text-[10px] ${responsePanel === "timeline" ? "border-neutral-300 text-neutral-200" : "border-transparent text-neutral-600"}`} onClick={() => setResponsePanel("timeline")} type="button">Timeline</button></div><div className="flex items-center gap-3 font-mono text-[10px]"><span className={statusClass(response?.status ?? null)}>{response ? `${response.status || "ERR"} ${response.statusText}` : "Ready"}</span><span className="text-neutral-600">{response ? `${response.responseTimeMs} ms` : "—"}</span>{response?.timing ? <span className="hidden text-neutral-700 lg:inline">request {response.timing.requestMs} · download {response.timing.downloadMs}</span> : null}{response?.truncated ? <span className="text-neutral-600">truncated</span> : null}<button aria-label="Copy response" className="text-neutral-600 hover:text-neutral-200" onClick={() => { if (response) void navigator.clipboard?.writeText(response.body); }} type="button"><Icon name="copy" size={13} /></button></div></div>{responsePanel === "body" ? (response?.contentType?.includes("json") && response?.body ? <JsonTreeViewer body={response.body} /> : <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[11px] leading-5 text-neutral-400">{responseText(response)}</pre>) : responsePanel === "headers" ? <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[11px] leading-5 text-neutral-400">{formatHeaders(response?.headers ?? [])}</pre> : <div className="min-h-0 flex-1 overflow-auto p-4"><ResponseTimeline bodyLength={response?.body.length} contentType={response?.contentType} status={response?.status} statusText={response?.statusText} timing={response?.timing} truncated={response?.truncated} /></div>}</section>
          </>
        )}

        {settings.layout.showStatusBar ? <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border px-3 font-mono text-[10px] text-neutral-600"><span>{settings.workspaceRoot ? workspaceName(settings.workspaceRoot) : "Local app data"}{workspaceInfo.isGitRepository ? " · Git repository" : ""} · UTF-8 · LF</span><span>⌘/Ctrl+K commands · ⌘/Ctrl+B sidebar · ⌘/Ctrl+S save · ⌘/Ctrl+↵ send · ⌘/Ctrl+Shift+G agent</span></footer> : null}
      </section>

      {isQuickOpenOpen ? <QuickOpen onClose={() => setIsQuickOpenOpen(false)} onSelect={(request) => { selectRequest(request); setIsQuickOpenOpen(false); setActiveView("collection"); }} requests={collection.requests} /> : null}
      {isTestRunnerOpen ? <CollectionTestRunner onClose={() => setIsTestRunnerOpen(false)} onRun={executeRequestForTest} requests={collection.requests} /> : null}
      {isReviewOpen ? <GitReviewPanel after={collection} before={reviewBaseline} beforeLabel="workspace baseline" afterLabel="working tree" changes={reviewDocument.changes} onApplyBefore={() => void restoreReviewBaseline()} onClose={() => setIsReviewOpen(false)} /> : null}
      {isTimeMachineOpen ? <TimeMachinePanel entries={visibleHistory} onClose={() => setIsTimeMachineOpen(false)} onReplay={replayHistoryEntry} onSelect={(entry) => setSelectedHistoryId(entry.id)} selectedId={selectedHistoryId} /> : null}
      {isNotebookOpen && onyxDocument ? <OnyxNotebookPanel currentRequest={draft} document={onyxDocument} onChange={setOnyxDocument} onClose={() => setIsNotebookOpen(false)} onSave={() => void saveOnyxDocument(onyxDocument)} response={response} /> : null}

      {isAssistantOpen ? <div className="flex w-[380px] shrink-0 border-l border-border"><OnyxAgent context={agentContext} keyConfigured={agentKeyStatuses[activeAgentProvider]} onClose={() => setIsAssistantOpen(false)} onOpenSettings={() => setIsSettingsOpen(true)} onToolCall={handleAgentToolCall} onToolRejected={handleAgentToolRejected} settings={settings.gemini} /></div> : null}

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setIsSettingsOpen(false)}>
          <section aria-label="Onyx settings" className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.35)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><div className="text-sm font-medium text-neutral-200">Settings</div><div className="mt-1 text-[11px] text-neutral-600">Local app preferences and secure multi-provider AI controls.</div></div><button className="border border-border px-2 py-1 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200" onClick={() => setIsSettingsOpen(false)} type="button">Close</button></div>
            <div className="grid min-h-[560px] md:grid-cols-[180px_1fr]">
              <nav aria-label="Settings sections" className="onyx-settings-nav border-b border-border bg-surface-raised/45 p-2 md:border-b-0 md:border-r">
                <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Preferences</div>
                {([['general', 'General', 'Workspace and appearance'], ['editor', 'Editor', 'Request editing'], ['notifications', 'Notifications', 'Feedback and motion'], ['agent', 'Agent', 'AI provider and safety'], ['about', 'About', 'Build and storage']] as const).map(([id, label, description]) => <button aria-current={settingsSection === id ? 'page' : undefined} className="mb-1 w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-hover" key={id} onClick={() => setSettingsSection(id)} type="button"><span className="block text-[11px] font-medium">{label}</span><span className="mt-0.5 block truncate text-[9px] text-neutral-600">{description}</span></button>)}
              </nav>
              <div className="min-w-0 space-y-5 overflow-y-auto p-4">
                {settingsSection === "general" ? <>
                  <section className="onyx-settings-card"><div className="mb-4"><div className="text-xs font-medium text-neutral-200">Appearance</div><div className="mt-1 text-[11px] text-neutral-600">Tune the workspace without leaving your keyboard flow.</div></div><div className="grid gap-3 md:grid-cols-2"><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Theme<select className="onyx-control mt-1 h-9 w-full px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none" onChange={(event) => updateAppearanceSettings({ theme: event.target.value as AppSettings["appearance"]["theme"] })} value={settings.appearance.theme}><option value="onyx">Onyx · soft neutral</option><option value="midnight">Midnight · blue graphite</option><option value="graphite">Graphite · high contrast</option></select></label><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Density<select className="onyx-control mt-1 h-9 w-full px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none" onChange={(event) => updateAppearanceSettings({ density: event.target.value as AppSettings["appearance"]["density"] })} value={settings.appearance.density}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></div></section>
                  <section className="onyx-settings-card"><div className="mb-4"><div className="text-xs font-medium text-neutral-200">Workspace behavior</div><div className="mt-1 text-[11px] text-neutral-600">Keep local-first startup predictable and fast.</div></div><label className="block text-[10px] uppercase tracking-[0.12em] text-neutral-600">Sidebar width <span className="font-mono normal-case tracking-normal text-neutral-300">{settings.layout.sidebarWidth}px</span><input className="mt-3 w-full accent-neutral-200" max="420" min="240" onChange={(event) => updateLayoutSettings({ sidebarWidth: Number(event.target.value) })} type="range" value={settings.layout.sidebarWidth} /></label><div className="mt-4 grid gap-3 text-[11px] text-neutral-400 md:grid-cols-2"><label className="flex items-center gap-2"><input checked={settings.layout.restoreTabs} onChange={(event) => updateLayoutSettings({ restoreTabs: event.target.checked })} type="checkbox" />Restore open tabs</label><label className="flex items-center gap-2"><input checked={settings.startup.showWelcome} onChange={(event) => updateStartupSettings({ showWelcome: event.target.checked })} type="checkbox" />Show welcome guidance</label><label className="flex items-center gap-2"><input checked={settings.startup.restoreWorkspace} onChange={(event) => updateStartupSettings({ restoreWorkspace: event.target.checked })} type="checkbox" />Restore last workspace</label></div></section>
                </> : null}
                {settingsSection === "editor" ? <>
                  <section className="onyx-settings-card"><div className="mb-4"><div className="text-xs font-medium text-neutral-200">Editor experience</div><div className="mt-1 text-[11px] text-neutral-600">Make headers, bodies and scripts feel like a focused IDE editor.</div></div><div className="grid gap-3 md:grid-cols-2"><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Font size<input className="onyx-control mt-1 h-9 w-full px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none" max="18" min="10" onChange={(event) => updateEditorSettings({ fontSize: Number(event.target.value) })} type="number" value={settings.editor.fontSize} /></label><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Tab size<select className="onyx-control mt-1 h-9 w-full px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none" onChange={(event) => updateEditorSettings({ tabSize: Number(event.target.value) as 2 | 4 })} value={settings.editor.tabSize}><option value="2">2 spaces</option><option value="4">4 spaces</option></select></label></div><div className="mt-4 grid gap-3 text-[11px] text-neutral-400"><label className="flex items-center gap-2"><input checked={settings.editor.wordWrap} onChange={(event) => updateEditorSettings({ wordWrap: event.target.checked })} type="checkbox" />Wrap long JSON lines</label><div className="rounded-lg border border-border bg-surface px-3 py-2 text-[10px] text-neutral-600">The editor uses the system monospace stack and keeps request bodies lightweight for fast typing.</div></div></section>
                  <section className="onyx-settings-card"><div className="text-xs font-medium text-neutral-200">Keyboard-first defaults</div><div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] text-neutral-600"><div className="rounded-lg border border-border bg-surface px-3 py-2">⌘/Ctrl+K <span className="block mt-1 text-neutral-400">Commands</span></div><div className="rounded-lg border border-border bg-surface px-3 py-2">⌘/Ctrl+P <span className="block mt-1 text-neutral-400">Quick open</span></div><div className="rounded-lg border border-border bg-surface px-3 py-2">⌘/Ctrl+↵ <span className="block mt-1 text-neutral-400">Send request</span></div><div className="rounded-lg border border-border bg-surface px-3 py-2">⌘/Ctrl+B <span className="block mt-1 text-neutral-400">Toggle sidebar</span></div></div></section>
                </> : null}
                {settingsSection === "notifications" ? <>
                  <section className="onyx-settings-card"><div className="mb-4"><div className="text-xs font-medium text-neutral-200">In-app feedback</div><div className="mt-1 text-[11px] text-neutral-600">Onyx uses its own toast layer inside the desktop window, not browser notifications.</div></div><div className="space-y-3 text-[11px] text-neutral-400"><label className="flex items-center justify-between gap-4"><span><span className="block text-neutral-300">Enable notifications</span><span className="text-[10px] text-neutral-600">Show success, warning and error feedback.</span></span><input checked={settings.notifications.enabled} onChange={(event) => updateNotificationSettings({ enabled: event.target.checked })} type="checkbox" /></label><label className="flex items-center justify-between gap-4"><span><span className="block text-neutral-300">Request completion</span><span className="text-[10px] text-neutral-600">Show a toast after native HTTP requests finish.</span></span><input checked={settings.notifications.requestCompletion} onChange={(event) => updateNotificationSettings({ requestCompletion: event.target.checked })} type="checkbox" /></label><label className="flex items-center justify-between gap-4"><span><span className="block text-neutral-300">Error alerts</span><span className="text-[10px] text-neutral-600">Keep failures visible even during fast workflows.</span></span><input checked={settings.notifications.errors} onChange={(event) => updateNotificationSettings({ errors: event.target.checked })} type="checkbox" /></label><label className="flex items-center justify-between gap-4"><span><span className="block text-neutral-300">Reduce motion</span><span className="text-[10px] text-neutral-600">Respect a calmer interaction style.</span></span><input checked={settings.appearance.reduceMotion} onChange={(event) => updateAppearanceSettings({ reduceMotion: event.target.checked })} type="checkbox" /></label></div></section>
                </> : null}
                {settingsSection === "about" ? <>
                  <section className="onyx-settings-card"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-surface font-mono text-sm font-semibold tracking-[-0.12em] text-neutral-100">O/</div><div><div className="text-sm font-semibold tracking-[0.12em] text-neutral-100">ONYX</div><div className="mt-1 text-[10px] text-neutral-600">Local-first · Git-native · Native HTTP</div></div></div><div className="mt-5 grid gap-2 text-[11px] text-neutral-500"><div className="flex justify-between border-t border-border pt-2"><span>Version</span><span className="font-mono text-neutral-300">0.1.0</span></div><div className="flex justify-between border-t border-border pt-2"><span>Frontend</span><span className="font-mono text-neutral-300">Next.js static export</span></div><div className="flex justify-between border-t border-border pt-2"><span>Desktop shell</span><span className="font-mono text-neutral-300">Tauri v2 + Rust</span></div><div className="flex justify-between border-t border-border pt-2"><span>Storage</span><span className="font-mono text-neutral-300">Local JSON files</span></div></div></section>
                  <section className="onyx-settings-card"><div className="text-xs font-medium text-neutral-200">Workspace data</div><div className="mt-2 text-[11px] leading-5 text-neutral-600">Your collection, environments, history and audit log stay on the local machine. Git controls versioning; Onyx does not upload workspace files.</div></section>
                </> : null}
                {settingsSection === "agent" ? <>
              <section className="rounded-2xl border border-border bg-surface p-3 shadow-[0_16px_48px_rgba(0,0,0,0.18)]"><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-medium text-neutral-200">AI provider</div><div className="mt-1 text-[11px] text-neutral-600">Choose one provider. The key stays in the operating system credential store and never enters workspace JSON.</div></div><label className="flex items-center gap-2 text-[10px] text-neutral-400"><input checked={settings.gemini.enabled} onChange={(event) => updateAgentSettings({ enabled: event.target.checked })} type="checkbox" />Enable Agent</label></div>
                <div className="grid gap-3 md:grid-cols-2"><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Provider<select className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-raised px-2 text-[11px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => { const provider = event.target.value as AgentProvider; const option = AGENT_PROVIDER_OPTIONS.find((item) => item.id === provider); updateAgentSettings({ provider, model: option?.defaultModel ?? settings.gemini.model }); setAgentKeyDraft(""); setAgentTestStatus(null); }} value={activeAgentProvider}>{AGENT_PROVIDER_OPTIONS.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}</select></label><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Model<input className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-raised px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => updateAgentSettings({ model: event.target.value })} value={settings.gemini.model} /></label></div>
                <div className="mt-2 text-[10px] text-neutral-600">{AGENT_PROVIDER_OPTIONS.find((provider) => provider.id === activeAgentProvider)?.description}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><input className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-2 font-mono text-[11px] text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => setAgentKeyDraft(event.target.value)} placeholder={agentKeyStatuses[activeAgentProvider] ? "Keychain key configured · enter a new key to replace" : `Paste ${activeAgentProviderLabel} API key`} type="password" value={agentKeyDraft} /><button className="h-9 border border-border px-3 text-[10px] text-neutral-300 hover:border-border-strong hover:bg-surface-hover" disabled={!agentKeyDraft.trim()} onClick={() => void saveAgentKey()} type="button">Save key</button><button className="h-9 border border-border px-3 text-[10px] text-neutral-400 hover:border-border-strong hover:text-neutral-200" disabled={!agentKeyStatuses[activeAgentProvider]} onClick={() => void testAgentConnection()} type="button">Test</button><button className="h-9 border border-border px-3 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200" disabled={!agentKeyStatuses[activeAgentProvider]} onClick={() => void removeAgentKey()} type="button">Remove</button></div><div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-neutral-600"><span>{agentKeyStatuses[activeAgentProvider] ? "Keychain configured" : "No key configured"}</span>{agentTestStatus ? <span>{agentTestStatus}</span> : null}</div>
                <details className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2"><summary className="cursor-pointer text-[10px] text-neutral-500">Advanced connection settings</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Endpoint override<input className="mt-1 h-8 w-full rounded-lg border border-border bg-surface px-2 font-mono text-[10px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => updateAgentSettings({ endpointOverride: event.target.value })} placeholder="Optional HTTPS endpoint" value={settings.gemini.endpointOverride} /></label><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Temperature<input className="mt-1 h-8 w-full rounded-lg border border-border bg-surface px-2 font-mono text-[10px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" max="2" min="0" onChange={(event) => updateAgentSettings({ temperature: Number(event.target.value) })} step="0.1" type="number" value={settings.gemini.temperature} /></label></div><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Max output tokens<input className="mt-1 h-8 w-full rounded-lg border border-border bg-surface px-2 font-mono text-[10px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" max="65536" min="1" onChange={(event) => updateAgentSettings({ maxOutputTokens: Number(event.target.value) })} type="number" value={settings.gemini.maxOutputTokens} /></label><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Timeout ms<input className="mt-1 h-8 w-full rounded-lg border border-border bg-surface px-2 font-mono text-[10px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" max="120000" min="5000" onChange={(event) => updateAgentSettings({ timeoutMs: Number(event.target.value) })} type="number" value={settings.gemini.timeoutMs} /></label></div></details>
              </section>
              <section className="rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.18)] p-3"><div className="mb-3"><div className="text-xs font-medium text-neutral-200">Agent policy</div><div className="mt-1 text-[11px] text-neutral-600">Read-only analysis can be automatic; network and filesystem side effects remain approval guarded by default.</div></div><label className="block text-[10px] uppercase tracking-[0.12em] text-neutral-600">Mode<select className="mt-1 h-8 w-full rounded-lg border border-border bg-surface-raised px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => updateAgentPolicy({ mode: event.target.value as AppSettings["gemini"]["policy"]["mode"] })} value={settings.gemini.policy.mode}><option value="confirm">Confirm side effects</option><option value="suggest">Suggest only</option><option value="autonomous">Autonomous · policy guarded</option></select></label><div className="mt-3 grid gap-2 text-[11px] text-neutral-400 md:grid-cols-2"><label className="flex items-center gap-2"><input checked={settings.gemini.policy.autoApproveReadOnly} onChange={(event) => updateAgentPolicy({ autoApproveReadOnly: event.target.checked })} type="checkbox" />Auto-approve read-only tools</label><label className="flex items-center gap-2"><input checked={settings.gemini.policy.requireApprovalForNetwork} onChange={(event) => updateAgentPolicy({ requireApprovalForNetwork: event.target.checked })} type="checkbox" />Confirm network requests</label><label className="flex items-center gap-2"><input checked={settings.gemini.policy.requireApprovalForFileWrites} onChange={(event) => updateAgentPolicy({ requireApprovalForFileWrites: event.target.checked })} type="checkbox" />Confirm file writes</label><label className="flex items-center gap-2"><input checked={settings.gemini.policy.maskSecrets} onChange={(event) => updateAgentPolicy({ maskSecrets: event.target.checked })} type="checkbox" />Mask secrets in context</label><label className="flex items-center gap-2"><input checked={settings.gemini.policy.shareRequestBody} onChange={(event) => updateAgentPolicy({ shareRequestBody: event.target.checked })} type="checkbox" />Share request body with agent</label></div><p className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-[10px] leading-4 text-neutral-600">Request body sharing is off by default. When enabled, secret-like values are still redacted if masking remains active.</p></section>
              <section className="rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.18)] p-3"><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-medium text-neutral-200">Agent audit log</div><div className="mt-1 text-[11px] text-neutral-600">Only redacted tool names, risks, decisions and bounded results are retained in app-data.</div></div><span className="font-mono text-[10px] text-neutral-600">{auditFile.entries.length}/200</span></div>{auditFile.entries.length === 0 ? <div className="text-[11px] text-neutral-600">No agent actions recorded yet.</div> : <div className="max-h-48 space-y-1 overflow-y-auto">{auditFile.entries.slice().reverse().slice(0, 20).map((entry) => <div className="grid grid-cols-[auto_auto_1fr] items-start gap-2 border-t border-border py-2 text-[10px]" key={entry.id}><span className="font-mono text-neutral-600">{new Date(entry.createdAt).toLocaleTimeString()}</span><span className="font-mono text-neutral-400">{entry.decision}</span><div className="min-w-0"><div className="truncate text-neutral-300">{entry.tool} · {entry.risk}</div><div className="truncate text-neutral-600">{entry.result}</div></div></div>)}</div>}</section>
                </> : null}
              <div className="flex items-center justify-between border-t border-border pt-3"><span className="text-[10px] text-neutral-600">Changes are stored in local app-data settings.json. API keys stay in the OS credential store.</span><button className="bg-neutral-200 px-4 py-2 text-[11px] font-semibold text-black hover:bg-white" onClick={() => { void persistSettings(settings).then(() => { setIsSettingsOpen(false); setStatusMessage("Settings saved"); pushToast("success", "Settings saved", "settings.json"); }).catch((error: unknown) => pushToast("error", "Settings save failed", errorMessage(error))); }} type="button">Save settings</button></div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isCommandOpen ? <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onClick={() => setIsCommandOpen(false)}><div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.35)]" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-2 border-b border-border px-3"><Icon name="search" size={14} /><input ref={commandInputRef} aria-label="Command search" className="h-11 flex-1 bg-transparent font-mono text-[12px] text-neutral-200 outline-none placeholder:text-neutral-600" onChange={(event) => setCommandQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setIsCommandOpen(false); if (event.key === "Enter" && commands[0]) runCommand(commands[0].id); }} placeholder="Type a command…" value={commandQuery} /><span className="font-mono text-[10px] text-neutral-600">ESC</span></div><div className="max-h-[360px] overflow-y-auto p-1">{commands.map((command) => <button className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[12px] text-neutral-400 hover:bg-surface-hover hover:text-neutral-100" key={command.id} onClick={() => runCommand(command.id)} type="button"><span>{command.label}</span><span className="font-mono text-[10px] text-neutral-600">{command.shortcut}</span></button>)}</div></div></div> : null}
      {contextMenu ? <AppContextMenu hasEditableTarget={contextMenu.hasEditableTarget} onAction={(action) => void handleContextMenuAction(action)} onClose={closeContextMenu} x={contextMenu.x} y={contextMenu.y} /> : null}
      <AppToastStack onDismiss={dismissToast} toasts={toasts} />
    </main>
  );
}
