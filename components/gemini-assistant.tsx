"use client";

import { useMemo, useState } from "react";

import { executeGeminiInteraction } from "@/lib/local-files";
import type {
  GeminiInteractionResponse,
  GeminiSettings,
  GeminiToolCall,
  GeminiToolDeclaration,
} from "@/lib/onyx-types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

type ToolResult = {
  status: "executed" | "approval-required" | "rejected";
  message: string;
};

interface GeminiAssistantProps {
  settings: GeminiSettings;
  keyConfigured: boolean;
  context: string;
  onOpenSettings: () => void;
  onClose: () => void;
  onToolRejected: (call: GeminiToolCall) => Promise<void>;
  onToolCall: (call: GeminiToolCall, approved: boolean) => Promise<ToolResult>;
}

const TOOL_DECLARATIONS: GeminiToolDeclaration[] = [
  {
    type: "function",
    name: "inspect_current_request",
    description: "Read the current request editor state without changing or sending anything.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "analyze_response",
    description: "Read and analyze the latest response currently visible in Onyx.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "send_current_request",
    description: "Send the current request through Onyx native HTTP. This is a network side effect and requires approval unless policy allows it.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "save_current_request",
    description: "Save the current request to the active local collection. This writes to the local filesystem.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
];

function makeMessageId(): string {
  return `gemini-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toolSummary(call: GeminiToolCall): string {
  return `${call.name}${call.arguments && typeof call.arguments === "object" ? ` ${JSON.stringify(call.arguments)}` : ""}`;
}

export function GeminiAssistant({
  settings,
  keyConfigured,
  context,
  onOpenSettings,
  onClose,
  onToolRejected,
  onToolCall,
}: GeminiAssistantProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<GeminiToolCall | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [previousInteractionId, setPreviousInteractionId] = useState<string | undefined>();

  const policyLabel = useMemo(() => {
    if (settings.policy.mode === "autonomous") return "Autonomous · policy guarded";
    if (settings.policy.mode === "suggest") return "Suggest only";
    return "Confirm side effects";
  }, [settings.policy.mode]);

  async function processToolCall(call: GeminiToolCall, approved = false): Promise<ToolResult> {
    const result = await onToolCall(call, approved);
    if (result.status === "approval-required") {
      setPendingAction(call);
      setMessages((current) => [
        ...current,
        { id: makeMessageId(), role: "system", content: `Approval required before: ${toolSummary(call)}\n${result.message}` },
      ]);
      return result;
    }

    setPendingAction(null);
    setMessages((current) => [
      ...current,
      { id: makeMessageId(), role: "system", content: `${result.status === "executed" ? "Action complete" : "Action rejected"}: ${result.message}` },
    ]);
    return result;
  }

  async function runAgentLoop(seedInput: string) {
    let nextInput = seedInput;
    let interactionId = previousInteractionId;
    const maxSteps = 6;

    for (let step = 0; step < maxSteps; step += 1) {
      const result: GeminiInteractionResponse = await executeGeminiInteraction({
        model: settings.model,
        input: nextInput,
        systemInstruction: [
          "You are Onyx Agent, a local-first API client assistant.",
          "Never invent tool results. Use only the declared tools.",
          "Read-only tools may be used when policy permits. Sending requests and writing files are side effects and must be approved by the user unless policy explicitly allows them.",
          "After receiving tool results, either answer the user or select the next declared tool. Do not repeat a completed tool without a reason.",
          "Keep responses concise, technical, and actionable. Do not expose API keys or secret values.",
        ].join(" "),
        temperature: settings.temperature,
        maxOutputTokens: settings.maxOutputTokens,
        previousInteractionId: interactionId,
        tools: TOOL_DECLARATIONS,
        timeoutMs: settings.timeoutMs,
      });
      interactionId = result.interactionId;
      setPreviousInteractionId(result.interactionId);
      if (result.text) {
        setMessages((current) => [...current, { id: makeMessageId(), role: "assistant", content: result.text }]);
      }
      if (result.toolCalls.length === 0) {
        setStatus(`${result.responseTimeMs} ms · ${policyLabel}`);
        return;
      }

      const toolResults: string[] = [];
      for (const call of result.toolCalls) {
        const toolResult = await processToolCall(call);
        if (toolResult.status === "approval-required") {
          setStatus(`Approval required · ${policyLabel}`);
          return;
        }
        toolResults.push(`Tool ${call.name} result (${toolResult.status}): ${toolResult.message}`);
      }
      nextInput = `${toolResults.join("\n\n")}\n\nContinue the task using only the tool results above. If the task is complete, answer concisely.`;
    }

    setStatus(`Stopped after ${maxSteps} agent steps · ${policyLabel}`);
  }

  async function sendMessage() {
    const prompt = input.trim();
    if (!prompt || isBusy) return;
    if (!settings.enabled) {
      setStatus("Enable Gemini in Settings first");
      return;
    }
    if (!keyConfigured) {
      setStatus("Configure a Gemini API key in Settings first");
      return;
    }

    setInput("");
    setMessages((current) => [...current, { id: makeMessageId(), role: "user", content: prompt }]);
    setIsBusy(true);
    setStatus("Thinking…");

    try {
      await runAgentLoop(`${prompt}\n\nCurrent Onyx context:\n${context}`);
    } catch (error) {
      setMessages((current) => [...current, { id: makeMessageId(), role: "system", content: error instanceof Error ? error.message : String(error) }]);
      setStatus("Gemini request failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function approvePendingAction() {
    if (!pendingAction || isBusy) return;
    const approvedAction = pendingAction;
    setIsBusy(true);
    try {
      const result = await processToolCall(approvedAction, true);
      if (result.status !== "approval-required") {
        await runAgentLoop(`Tool ${approvedAction.name} result (${result.status}): ${result.message}\n\nContinue the task using this tool result.`);
      }
    } catch (error) {
      setStatus("Approved agent action failed");
      setMessages((current) => [...current, { id: makeMessageId(), role: "system", content: error instanceof Error ? error.message : String(error) }]);
    } finally {
      setIsBusy(false);
    }
  }

  function rejectPendingAction() {
    if (!pendingAction) return;
    const rejected = pendingAction;
    setMessages((current) => [...current, { id: makeMessageId(), role: "system", content: `Action rejected: ${toolSummary(rejected)}` }]);
    setPendingAction(null);
    void onToolRejected(rejected);
  }

  function clearConversation() {
    setMessages([]);
    setPendingAction(null);
    setPreviousInteractionId(undefined);
    setStatus("Ready");
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-l border-border bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <div className="text-[11px] font-medium text-neutral-200">Gemini Agent</div>
          <div className="mt-0.5 font-mono text-[10px] text-neutral-600">{settings.model} · {policyLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] ${keyConfigured ? "text-neutral-300" : "text-neutral-600"}`}>{keyConfigured ? "KEYCHAIN READY" : "NO KEY"}</span>
          <button className="border border-border px-2 py-1 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200" onClick={onOpenSettings} type="button">Settings</button>
          <button className="border border-border px-2 py-1 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200" disabled={messages.length === 0 && !previousInteractionId} onClick={clearConversation} type="button">Clear</button><button aria-label="Close Gemini Agent" className="border border-border px-2 py-1 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200" onClick={onClose} type="button">Close</button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {!settings.enabled || !keyConfigured ? (
          <div className="border border-dashed border-border p-3 text-[11px] leading-5 text-neutral-500">
            {settings.enabled ? "Add a Gemini API key in the operating system keychain to activate the agent." : "Enable Gemini Agent in Settings to analyze requests and responses."}
            <button className="mt-2 block text-neutral-300 underline underline-offset-2" onClick={onOpenSettings} type="button">Open Gemini settings</button>
          </div>
        ) : null}
        {messages.length === 0 && settings.enabled && keyConfigured ? <div className="text-[11px] leading-5 text-neutral-600">Ask Gemini to inspect the current request, explain a response, suggest headers, or send the request after approval.</div> : null}
        {messages.map((message) => (
          <div className={`border-l-2 px-3 py-2 text-[11px] leading-5 ${message.role === "user" ? "border-neutral-600 text-neutral-300" : message.role === "assistant" ? "border-neutral-300 text-neutral-200" : "border-neutral-800 text-neutral-500"}`} key={message.id}>
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-700">{message.role}</div>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}
        {pendingAction ? (
          <div className="border border-neutral-500 bg-[#111111] p-3 text-[11px] text-neutral-300">
            <div className="font-medium text-neutral-100">Approve agent action?</div>
            <div className="mt-1 font-mono text-[10px] text-neutral-500">{toolSummary(pendingAction)}</div>
            <div className="mt-3 flex gap-2"><button className="bg-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-black hover:bg-white" onClick={() => void approvePendingAction()} type="button">Approve once</button><button className="border border-border px-3 py-1.5 text-[10px] text-neutral-400 hover:border-border-strong hover:text-neutral-200" onClick={rejectPendingAction} type="button">Reject</button></div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border p-2">
        <textarea aria-label="Gemini agent prompt" className="min-h-[64px] w-full resize-none border border-border bg-[#090909] p-2 font-mono text-[11px] leading-5 text-neutral-300 outline-none focus:border-border-strong" disabled={!settings.enabled || !keyConfigured || isBusy} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask Gemini… (⌘/Ctrl+Enter to send)" value={input} />
        <div className="mt-2 flex items-center justify-between"><span className="font-mono text-[10px] text-neutral-600">{status}</span><button className="border border-border px-3 py-1.5 text-[10px] text-neutral-300 hover:border-border-strong hover:bg-surface-hover disabled:opacity-40" disabled={!input.trim() || !settings.enabled || !keyConfigured || isBusy} onClick={() => void sendMessage()} type="button">{isBusy ? "Working" : "Ask Gemini"}</button></div>
      </div>
    </section>
  );
}

export { TOOL_DECLARATIONS };
export type { ToolResult };
