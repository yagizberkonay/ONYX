"use client";

import type { ResponseTiming } from "@/lib/onyx-types";

export function ResponseTimeline({ timing }: { timing?: ResponseTiming }) {
  if (!timing) return <div className="rounded-xl border border-dashed border-border p-3 text-[10px] text-neutral-600">Timeline metrics will appear after the next native request.</div>;
  const total = Math.max(timing.totalMs, 1);
  const requestWidth = Math.max((timing.requestMs / total) * 100, 2);
  const downloadWidth = Math.max((timing.downloadMs / total) * 100, 2);
  return <div className="rounded-xl border border-border bg-surface-raised p-3"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] uppercase tracking-[0.14em] text-neutral-600">Request timeline</span><span className="font-mono text-[10px] text-neutral-400">{timing.totalMs} ms total</span></div><div className="flex h-2 overflow-hidden rounded-full bg-background"><span className="bg-neutral-400" style={{ width: `${requestWidth}%` }} /><span className="bg-neutral-700" style={{ width: `${downloadWidth}%` }} /></div><div className="mt-3 grid grid-cols-2 gap-3 font-mono text-[10px]"><div><div className="text-neutral-400">DNS · connect · TLS · wait</div><div className="mt-1 text-neutral-600">{timing.requestMs} ms · reqwest aggregate</div></div><div><div className="text-neutral-400">Download</div><div className="mt-1 text-neutral-600">{timing.downloadMs} ms · response body</div></div></div></div>;
}
