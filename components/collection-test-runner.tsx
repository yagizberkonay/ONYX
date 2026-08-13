"use client";

import { useMemo, useState } from "react";
import type { RequestRecord } from "@/lib/onyx-types";

export type CollectionTestResult = {
  requestId: string;
  name: string;
  status: number | null;
  responseTimeMs: number | null;
  passed: boolean;
  detail: string;
};

type RunnerResponse = { status: number; body: string; responseTimeMs: number };

type CollectionTestRunnerProps = {
  requests: RequestRecord[];
  onRun: (request: RequestRecord) => Promise<RunnerResponse>;
  onClose: () => void;
};

export function CollectionTestRunner({ requests, onRun, onClose }: CollectionTestRunnerProps) {
  const [expectedStatus, setExpectedStatus] = useState("2xx");
  const [bodyContains, setBodyContains] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CollectionTestResult[]>([]);
  const [currentName, setCurrentName] = useState("");

  const summary = useMemo(() => {
    const passed = results.filter((result) => result.passed).length;
    return `${passed}/${results.length} passed`;
  }, [results]);

  const matchesStatus = (status: number): boolean => {
    const expected = expectedStatus.trim().toLowerCase();
    if (!expected || expected === "any") return true;
    if (expected === "2xx") return status >= 200 && status < 300;
    if (expected === "3xx") return status >= 300 && status < 400;
    if (expected === "4xx") return status >= 400 && status < 500;
    if (expected === "5xx") return status >= 500 && status < 600;
    const numeric = Number(expected);
    return Number.isInteger(numeric) ? status === numeric : false;
  };

  const run = async () => {
    setIsRunning(true);
    setResults([]);
    const nextResults: CollectionTestResult[] = [];
    for (const request of requests) {
      setCurrentName(request.name);
      try {
        const response = await onRun(request);
        const statusPass = matchesStatus(response.status);
        const bodyPass = !bodyContains.trim() || response.body.toLowerCase().includes(bodyContains.trim().toLowerCase());
        nextResults.push({ requestId: request.id, name: request.name, status: response.status, responseTimeMs: response.responseTimeMs, passed: statusPass && bodyPass, detail: statusPass && bodyPass ? "Assertions passed" : `${statusPass ? "" : `Expected ${expectedStatus}; `}${bodyPass ? "" : "body text not found"}`.trim() });
      } catch (error) {
        nextResults.push({ requestId: request.id, name: request.name, status: null, responseTimeMs: null, passed: false, detail: error instanceof Error ? error.message : String(error) });
      }
      setResults([...nextResults]);
    }
    setCurrentName("");
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <section aria-label="Collection test runner" className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.35)]" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-medium text-neutral-100">Collection test runner</h2><p className="mt-1 text-[11px] text-neutral-600">Run every saved request with deterministic status and body assertions.</p></div><button className="rounded-lg border border-border px-2 py-1 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200" onClick={onClose} type="button">Close</button></header>
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[150px_1fr_auto]"><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Expected status<select className="mt-1 h-8 w-full rounded-lg border border-border bg-surface-raised px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => setExpectedStatus(event.target.value)} value={expectedStatus}><option value="2xx">2xx</option><option value="any">Any</option><option value="200">200</option><option value="201">201</option><option value="3xx">3xx</option><option value="4xx">4xx</option><option value="5xx">5xx</option></select></label><label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Body contains<input className="mt-1 h-8 w-full rounded-lg border border-border bg-surface-raised px-2 font-mono text-[11px] normal-case tracking-normal text-neutral-300 outline-none focus:border-border-strong" onChange={(event) => setBodyContains(event.target.value)} placeholder="Optional text assertion" value={bodyContains} /></label><button className="self-end rounded-lg bg-neutral-200 px-3 py-2 text-[10px] font-semibold text-black hover:bg-white disabled:cursor-wait disabled:opacity-50" disabled={isRunning || requests.length === 0} onClick={() => void run()} type="button">{isRunning ? "Running…" : "Run tests"}</button></div>
        <div className="flex items-center justify-between px-4 py-3 text-[10px] text-neutral-600"><span>{requests.length} requests{currentName ? ` · ${currentName}` : ""}</span><span className="font-mono">{summary}</span></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{results.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center text-[11px] text-neutral-600">Set assertions and run the collection. Tests execute sequentially through native HTTP.</div> : results.map((result) => <div className="flex items-center gap-3 border-t border-border py-3" key={result.requestId}><span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${result.passed ? "border-neutral-300 text-neutral-100" : "border-neutral-700 text-neutral-600"}`}>{result.passed ? "✓" : "×"}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] text-neutral-300">{result.name}</span><span className="block truncate text-[10px] text-neutral-600">{result.detail}</span></span><span className="font-mono text-[10px] text-neutral-500">{result.status ?? "ERR"}</span><span className="font-mono text-[10px] text-neutral-600">{result.responseTimeMs ?? "—"} ms</span></div>)}</div>
      </section>
    </div>
  );
}
