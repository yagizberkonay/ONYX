import { invoke } from "@tauri-apps/api/core";

import type {
  AgentAuditFile,
  FileSnapshot,
  NativeHttpRequest,
  GeminiInteractionRequest,
  GeminiInteractionResponse,
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

export async function executeGeminiInteraction(
  request: GeminiInteractionRequest,
): Promise<GeminiInteractionResponse> {
  if (!isTauriRuntime()) {
    throw new Error("Gemini agent execution is available only in the Tauri desktop app.");
  }

  return invoke<GeminiInteractionResponse>("execute_gemini_interaction", { request });
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
