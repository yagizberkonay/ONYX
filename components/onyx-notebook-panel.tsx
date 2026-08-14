import { useMemo, useState } from "react";
import type { NativeHttpResponse, RequestRecord } from "@/lib/onyx-types";
import type { OnyxDocument, OnyxDocumentBlock, OnyxResponseSnapshot } from "@/lib/onyx-document";
import { makeId } from "@/lib/onyx-types";

interface OnyxNotebookPanelProps {
  document: OnyxDocument;
  currentRequest: RequestRecord;
  response: NativeHttpResponse | null;
  onChange: (document: OnyxDocument) => void;
  onClose: () => void;
  onSave: () => void;
}

function responsePreview(response: OnyxResponseSnapshot): string {
  if (!response.body) return "<empty response>";
  try {
    return response.contentType?.includes("json") ? JSON.stringify(JSON.parse(response.body), null, 2) : response.body;
  } catch {
    return response.body;
  }
}

export function OnyxNotebookPanel({ document, currentRequest, response, onChange, onClose, onSave }: OnyxNotebookPanelProps) {
  const [draftTitle, setDraftTitle] = useState(document.title);
  const [markdown, setMarkdown] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const blocks = useMemo(() => document.blocks, [document.blocks]);

  function updateDocument(nextBlocks: OnyxDocumentBlock[]) {
    onChange({ ...document, title: draftTitle.trim() || document.title, updatedAt: new Date().toISOString(), blocks: nextBlocks });
  }

  function addBlock(block: OnyxDocumentBlock) {
    updateDocument([...blocks, block]);
    setSelectedBlockId(block.id);
  }

  function addMarkdown() {
    const content = markdown.trim();
    if (!content) return;
    addBlock({ id: makeId("note"), type: "markdown", title: "Note", content });
    setMarkdown("");
  }

  function addRequest() {
    addBlock({ id: makeId("request-block"), type: "request", title: currentRequest.name, requestId: currentRequest.id, request: currentRequest });
  }

  function addResponse() {
    if (!response) return;
    addBlock({ id: makeId("response-block"), type: "response", title: `${response.status} response`, requestId: currentRequest.id, response: { status: response.status, statusText: response.statusText, url: response.url, headers: response.headers, body: response.body, contentType: response.contentType, truncated: response.truncated, responseTimeMs: response.responseTimeMs, timing: response.timing } });
  }

  function removeSelected() {
    if (!selectedBlockId) return;
    updateDocument(blocks.filter((block) => block.id !== selectedBlockId));
    setSelectedBlockId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <section aria-label="Onyx notebook" className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.4)]" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-5 py-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">.onyx</span><input aria-label="Notebook title" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-neutral-100 outline-none" onChange={(event) => setDraftTitle(event.target.value)} value={draftTitle} /></div><div className="mt-1 text-[11px] text-neutral-600">A local API runbook. Request, response and review blocks stay inside Onyx.</div></div><div className="flex gap-2"><button className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-neutral-400 hover:border-border-strong hover:text-neutral-100" onClick={onClose} type="button">Close</button><button className="rounded-lg bg-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-black hover:bg-white" onClick={onSave} type="button">Save .onyx</button></div></header>
        <div className="flex min-h-0 flex-1"><aside className="w-64 shrink-0 border-r border-border bg-surface-raised p-4"><div className="text-[10px] uppercase tracking-[0.14em] text-neutral-600">Insert block</div><div className="mt-3 space-y-2"><button className="w-full rounded-lg border border-border px-3 py-2 text-left text-[11px] text-neutral-300 hover:border-border-strong hover:bg-surface-hover" onClick={addRequest} type="button"><span className="block text-neutral-100">Current request</span><span className="mt-1 block text-[10px] text-neutral-600">Capture request as a notebook block</span></button><button className="w-full rounded-lg border border-border px-3 py-2 text-left text-[11px] text-neutral-300 hover:border-border-strong hover:bg-surface-hover" disabled={!response} onClick={addResponse} type="button"><span className="block text-neutral-100">Latest response</span><span className="mt-1 block text-[10px] text-neutral-600">Attach response and timing</span></button><div className="rounded-lg border border-border p-2"><textarea aria-label="Notebook markdown" className="min-h-24 w-full resize-none bg-transparent text-[11px] leading-5 text-neutral-300 outline-none placeholder:text-neutral-700" onChange={(event) => setMarkdown(event.target.value)} placeholder="Write a note…" value={markdown} /><button className="mt-2 w-full rounded-md bg-surface-active px-2 py-1.5 text-[10px] text-neutral-300 hover:bg-surface-hover" onClick={addMarkdown} type="button">Add markdown note</button></div></div><div className="mt-6 border-t border-border pt-4"><div className="text-[10px] uppercase tracking-[0.14em] text-neutral-600">Document safety</div><p className="mt-2 text-[10px] leading-4 text-neutral-600">`.onyx` is an Onyx document envelope. It is intentionally not imported as a regular collection JSON file.</p><button className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-[10px] text-neutral-500 hover:border-border-strong hover:text-neutral-200" disabled={!selectedBlockId} onClick={removeSelected} type="button">Remove selected block</button></div></aside><main className="min-h-0 flex-1 overflow-y-auto bg-background p-5">{blocks.length === 0 ? <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-border text-center text-[12px] text-neutral-600">Start a local runbook by inserting the current request or a markdown note.</div> : <div className="mx-auto max-w-3xl space-y-4">{blocks.map((block, index) => <article className={`rounded-2xl border bg-surface-raised p-4 ${selectedBlockId === block.id ? "border-border-strong" : "border-border"}`} key={block.id} onClick={() => setSelectedBlockId(block.id)}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-600">{String(index + 1).padStart(2, "0")} · {block.type}</span><span className="text-[11px] font-medium text-neutral-200">{block.title ?? "Untitled block"}</span></div><span className="text-[10px] text-neutral-700">{selectedBlockId === block.id ? "selected" : ""}</span></div>{block.type === "markdown" ? <p className="mt-3 whitespace-pre-wrap text-[12px] leading-6 text-neutral-300">{block.content}</p> : null}{block.type === "request" && block.request ? <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-3 font-mono text-[10px] leading-5 text-neutral-400">{block.request.method} {block.request.url}{"\n\n"}{block.request.body || "<empty body>"}</pre> : null}{block.type === "response" && block.response ? <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-3 font-mono text-[10px] leading-5 text-neutral-400">{block.response.status} {block.response.statusText} · {block.response.responseTimeMs ?? "—"} ms{"\n\n"}{responsePreview({ ...block.response, headers: block.response.headers })}</pre> : null}</article>)}</div>}</main></div>
        <footer className="flex items-center justify-between border-t border-border px-5 py-3 font-mono text-[10px] text-neutral-600"><span>{blocks.length} blocks · local-only notebook</span><span>Use .onyx for reviewable API documentation</span></footer>
      </section>
    </div>
  );
}
