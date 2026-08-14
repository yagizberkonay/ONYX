import type { CollectionFile } from "@/lib/onyx-types";
import type { OnyxDiffChange } from "@/lib/onyx-document";

interface GitReviewPanelProps {
  before: CollectionFile;
  after: CollectionFile;
  beforeLabel: string;
  afterLabel: string;
  changes: OnyxDiffChange[];
  onApplyBefore: () => void;
  onClose: () => void;
}

export function GitReviewPanel({
  before,
  after,
  beforeLabel,
  afterLabel,
  changes,
  onApplyBefore,
  onClose,
}: GitReviewPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <section aria-label="Git review" className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.4)]" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-neutral-100">Git Review Mode</div>
            <div className="mt-1 text-[11px] text-neutral-600">Review request-level changes before they become collection state.</div>
          </div>
          <button className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-neutral-400 hover:border-border-strong hover:text-neutral-100" onClick={onClose} type="button">Close</button>
        </header>

        <div className="grid grid-cols-2 gap-3 border-b border-border bg-surface-raised px-5 py-4 text-[11px]">
          <div className="rounded-xl border border-border bg-surface px-3 py-2"><div className="uppercase tracking-[0.14em] text-neutral-600">Source</div><div className="mt-1 font-mono text-neutral-300">{beforeLabel}</div><div className="mt-1 text-neutral-600">{before.requests.length} requests</div></div>
          <div className="rounded-xl border border-border bg-surface px-3 py-2"><div className="uppercase tracking-[0.14em] text-neutral-600">Working tree</div><div className="mt-1 font-mono text-neutral-300">{afterLabel}</div><div className="mt-1 text-neutral-600">{after.requests.length} requests</div></div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {changes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-[12px] text-neutral-600">No request-level changes detected.</div>
          ) : (
            <div className="space-y-2">
              {changes.map((change, index) => (
                <article className="rounded-xl border border-border bg-surface-raised p-3" key={`${change.path}-${index}`}>
                  <div className="flex items-center justify-between gap-3"><span className="font-mono text-[11px] text-neutral-200">{change.path}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${change.kind === "added" ? "border-neutral-300 text-neutral-200" : change.kind === "removed" ? "border-neutral-700 text-neutral-600" : "border-border-strong text-neutral-400"}`}>{change.kind}</span></div>
                  {change.before ? <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-2 font-mono text-[10px] leading-4 text-neutral-600">− {change.before}</pre> : null}
                  {change.after ? <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 font-mono text-[10px] leading-4 text-neutral-300">+ {change.after}</pre> : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border px-5 py-3">
          <div className="font-mono text-[10px] text-neutral-600">{changes.length} changes · review is local and Git-friendly</div>
          <div className="flex gap-2"><button className="rounded-lg border border-border px-3 py-2 text-[11px] text-neutral-400 hover:border-border-strong hover:text-neutral-100" onClick={onClose} type="button">Keep working tree</button><button className="rounded-lg bg-neutral-200 px-3 py-2 text-[11px] font-semibold text-black hover:bg-white" disabled={changes.length === 0} onClick={onApplyBefore} type="button">Restore source</button></div>
        </footer>
      </section>
    </div>
  );
}
