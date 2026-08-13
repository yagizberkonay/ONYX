import type { NativeHttpResponse, RequestRecord } from "@/lib/onyx-types";

const BLOCKED_GLOBALS = /\b(?:fetch|XMLHttpRequest|WebSocket|window|document|localStorage|sessionStorage|globalThis|import|eval|Function|process|require)\b/;

export type ScriptRunResult = {
  ok: boolean;
  message: string;
  requestPatch?: Partial<RequestRecord>;
};

function redactConsole(): Pick<Console, "log" | "warn" | "error"> {
  return {
    log: (...args: unknown[]) => console.log("[Onyx script]", ...args),
    warn: (...args: unknown[]) => console.warn("[Onyx script]", ...args),
    error: (...args: unknown[]) => console.error("[Onyx script]", ...args),
  };
}

export function runSandboxedScript(script: string, context: { request: RequestRecord; response: NativeHttpResponse | null; variables: Record<string, string> }): ScriptRunResult {
  const source = script.trim();
  if (!source) return { ok: true, message: "No script configured." };
  if (source.length > 50_000) return { ok: false, message: "Script exceeds the 50 KB safety limit." };
  if (BLOCKED_GLOBALS.test(source)) return { ok: false, message: "Script references a blocked global or side-effect API." };

  try {
    const execute = new Function("request", "response", "variables", "console", `"use strict";\n${source}`) as (request: RequestRecord, response: NativeHttpResponse | null, variables: Record<string, string>, consoleApi: Pick<Console, "log" | "warn" | "error">) => unknown;
    const result = execute(structuredClone(context.request), context.response ? structuredClone(context.response) : null, structuredClone(context.variables), redactConsole());
    const requestPatch = result && typeof result === "object" && !Array.isArray(result) ? result as Partial<RequestRecord> : undefined;
    return { ok: true, message: requestPatch ? "Script completed and returned a request patch." : "Script completed." , requestPatch };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
