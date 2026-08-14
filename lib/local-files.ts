import { invoke } from "@tauri-apps/api/core";

import type {
  AgentAuditFile,
  FileSnapshot,
  NativeHttpRequest,
  AgentInteractionRequest,
  AgentKeyStatus,
  AgentProvider,
  AgentInteractionResponse,
  NativeHttpResponse,
  WorkspaceInfo,
} from "@/lib/onyx-types";

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as TauriWindow).__TAURI_INTERNALS__)
  );
}

function storageKey(relativePath: string, workspaceRoot?: string | null): string {
  return `onyx:file:${workspaceRoot ?? "app-data"}:${relativePath}`;
}

export async function readLocalFile(relativePath: string): Promise<FileSnapshot> {
  if (isTauriRuntime()) {
    return invoke<FileSnapshot>("read_local_file", { relativePath });
  }

  const content = window.localStorage.getItem(storageKey(relativePath));

  return {
    path: relativePath,
    content: content ?? "",
    exists: content !== null,
  };
}

export async function readOpenedOnyxFile(path: string): Promise<FileSnapshot> {
  if (isTauriRuntime()) {
    return invoke<FileSnapshot>("read_onyx_file", { path });
  }

  throw new Error("Opening an associated .onyx file requires the native Onyx runtime.");
}

export async function writeLocalFile(
  relativePath: string,
  content: string,
): Promise<FileSnapshot> {
  if (isTauriRuntime()) {
    return invoke<FileSnapshot>("write_local_file", { relativePath, content });
  }

  window.localStorage.setItem(storageKey(relativePath), content);

  return {
    path: relativePath,
    content,
    exists: true,
  };
}

export async function readWorkspaceFile(
  relativePath: string,
  workspaceRoot: string | null,
): Promise<FileSnapshot> {
  if (isTauriRuntime()) {
    return invoke<FileSnapshot>("read_workspace_file", {
      workspaceRoot,
      relativePath,
    });
  }

  const content = window.localStorage.getItem(storageKey(relativePath, workspaceRoot));
  return {
    path: relativePath,
    content: content ?? "",
    exists: content !== null,
  };
}

export async function writeWorkspaceFile(
  relativePath: string,
  content: string,
  workspaceRoot: string | null,
): Promise<FileSnapshot> {
  if (isTauriRuntime()) {
    return invoke<FileSnapshot>("write_workspace_file", {
      workspaceRoot,
      relativePath,
      content,
    });
  }

  window.localStorage.setItem(storageKey(relativePath, workspaceRoot), content);
  return {
    path: relativePath,
    content,
    exists: true,
  };
}

export async function pickWorkspaceDirectory(): Promise<string | null> {
  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose Onyx workspace",
    });

    return typeof selected === "string" ? selected : null;
  }

  return window.prompt("Workspace folder path", "");
}

export async function inspectWorkspace(workspaceRoot: string | null): Promise<WorkspaceInfo> {
  if (isTauriRuntime()) {
    return invoke<WorkspaceInfo>("inspect_workspace", { workspaceRoot });
  }

  return {
    root: workspaceRoot ?? "",
    exists: Boolean(workspaceRoot),
    isGitRepository: false,
  };
}

export async function readAgentAudit(): Promise<FileSnapshot> {
  return readLocalFile("agent-audit.json");
}

export async function writeAgentAudit(audit: AgentAuditFile): Promise<FileSnapshot> {
  return writeLocalFile("agent-audit.json", JSON.stringify(audit, null, 2));
}

export async function executeAgentInteraction(
  request: AgentInteractionRequest,
): Promise<AgentInteractionResponse> {
  if (!isTauriRuntime()) {
    throw new Error("AI agent execution is available only in the Tauri desktop app.");
  }

  return invoke<AgentInteractionResponse>("execute_agent_interaction", { request });
}

export async function executeGeminiInteraction(
  request: AgentInteractionRequest,
): Promise<AgentInteractionResponse> {
  return executeAgentInteraction({ ...request, provider: "gemini" });
}

export async function getAgentKeyStatuses(): Promise<AgentKeyStatus> {
  if (isTauriRuntime()) {
    return invoke<AgentKeyStatus>("get_agent_key_statuses");
  }

  return { openai: false, anthropic: false, gemini: false, manus: false, kimi: false, groq: false };
}

export async function getAgentKeyStatus(provider: AgentProvider): Promise<boolean> {
  if (isTauriRuntime()) {
    return invoke<boolean>("get_agent_key_status", { provider });
  }

  return false;
}

export async function setAgentApiKey(provider: AgentProvider, apiKey: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("AI API key storage is available only in the Tauri desktop app.");
  }

  await invoke("set_agent_api_key", { provider, apiKey });
}

export async function deleteAgentApiKey(provider: AgentProvider): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("AI API key storage is available only in the Tauri desktop app.");
  }

  await invoke("delete_agent_api_key", { provider });
}

export async function getGeminiKeyStatus(): Promise<boolean> {
  if (isTauriRuntime()) {
    return invoke<boolean>("get_gemini_key_status");
  }

  return false;
}

export async function setGeminiApiKey(apiKey: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("Gemini API key storage is available only in the Tauri desktop app.");
  }

  await invoke("set_gemini_api_key", { apiKey });
}

export async function deleteGeminiApiKey(): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("Gemini API key storage is available only in the Tauri desktop app.");
  }

  await invoke("delete_gemini_api_key");
}

export async function executeHttpRequest(
  request: NativeHttpRequest,
): Promise<NativeHttpResponse> {
  if (isTauriRuntime()) {
    return invoke<NativeHttpResponse>("execute_http_request", { request });
  }

  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const headers = new Headers();
    request.headers
      .filter((header) => header.enabled && header.name.trim())
      .forEach((header) => headers.set(header.name.trim(), header.value));

    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body || undefined,
      signal: controller.signal,
    });

    const body = await response.text();
    return {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Array.from(response.headers.entries()).map(([name, value]) => ({
        name,
        value,
        enabled: true,
      })),
      body,
      responseTimeMs: Math.round(performance.now() - startedAt),
      contentType: response.headers.get("content-type"),
      truncated: false,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
