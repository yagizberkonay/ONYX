import type { ResponseTiming } from "@/lib/onyx-types";

interface ResponseTimelineProps {
  timing?: ResponseTiming;
  status?: number;
  statusText?: string;
  contentType?: string | null;
  bodyLength?: number;
  truncated?: boolean;
}

function statusTone(status?: number): string {
  if (!status) return "text-neutral-500";
  if (status >= 200 && status < 300) return "text-neutral-200";
  if (status >= 400) return "text-neutral-400";
  return "text-neutral-300";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function ResponseTimeline({ timing, status, statusText, contentType, bodyLength, truncated }: ResponseTimelineProps) {
  if (!timing) {
    return <div className="rounded-xl border border-dashed border-border p-4 text-[10px] text-neutral-600">Timeline metrics will appear after the next native request.</div>;
  }

  const total = Math.max(timing.totalMs, 1);
  const requestWidth = Math.max((timing.requestMs / total) * 100, 2);
  const downloadWidth = Math.max((timing.downloadMs / total) * 100, 2);
  const responseLabel = status ? `${status}${statusText ? ` ${statusText}` : ""}` : "No status";

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_12px_36px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Request diagnostics</div>
          <p className="mt-1 text-[11px] text-neutral-600">Native timing snapshot from the last execution.</p>
        </div>
        <div className="text-right font-mono text-[10px]">
          <div className="text-neutral-400">{timing.totalMs} ms total</div>
          <div className={`${statusTone(status)} mt-1`}>{responseLabel}</div>
        </div>
      </div>

      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-background" aria-label="Request timing breakdown" role="img">
        <span className="bg-neutral-400 transition-[width] duration-300" style={{ width: `${requestWidth}%` }} title={`Request aggregate ${timing.requestMs} ms`} />
        <span className="bg-neutral-700 transition-[width] duration-300" style={{ width: `${downloadWidth}%` }} title={`Response transfer ${timing.downloadMs} ms`} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Dispatch</div>
          <div className="mt-2 font-mono text-sm text-neutral-300">{timing.requestMs} ms</div>
          <div className="mt-1 text-[10px] leading-4 text-neutral-600">DNS, connect, TLS and server wait aggregate</div>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Transfer</div>
          <div className="mt-2 font-mono text-sm text-neutral-300">{timing.downloadMs} ms</div>
          <div className="mt-1 text-[10px] leading-4 text-neutral-600">Response body transfer phase</div>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-neutral-600">Payload</div>
          <div className="mt-2 font-mono text-sm text-neutral-300">{bodyLength === undefined ? "—" : `${formatNumber(bodyLength)} chars`}</div>
          <div className="mt-1 truncate text-[10px] leading-4 text-neutral-600" title={contentType ?? undefined}>{contentType ?? "Unknown content type"}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[10px] text-neutral-600">
        <span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-neutral-400 align-middle" />request aggregate <span className="mx-2 text-neutral-700">·</span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-neutral-700 align-middle" />response transfer</span>
        <span>{truncated ? "Response body truncated by safety limit" : "Response body complete"}</span>
      </div>
    </div>
  );
}
