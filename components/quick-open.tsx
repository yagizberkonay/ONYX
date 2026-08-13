"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import type { RequestRecord } from "@/lib/onyx-types";

type QuickOpenProps = {
  requests: RequestRecord[];
  onSelect: (request: RequestRecord) => void;
  onClose: () => void;
};

export function QuickOpen({ requests, onSelect, onClose }: QuickOpenProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filtered = useMemo(() => requests.filter((request) => `${request.name} ${request.method} ${request.url}`.toLowerCase().includes(query.toLowerCase().trim())), [query, requests]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter" && filtered[selectedIndex]) onSelect(filtered[selectedIndex]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <section aria-label="Quick open request" className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.35)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-4"><span className="font-mono text-[10px] text-neutral-600">⌘P</span><input autoFocus aria-label="Quick open search" className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[12px] text-neutral-200 outline-none placeholder:text-neutral-600" onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={handleKeyDown} placeholder="Search requests by name, method or URL" value={query} /><span className="font-mono text-[10px] text-neutral-600">ESC</span></div>
        <div className="max-h-[360px] overflow-y-auto p-2">{filtered.length === 0 ? <div className="p-8 text-center text-[11px] text-neutral-600">No matching requests.</div> : filtered.map((request, index) => <button className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left ${index === selectedIndex ? "bg-surface-active text-neutral-100" : "text-neutral-400 hover:bg-surface-hover hover:text-neutral-200"}`} key={request.id} onClick={() => onSelect(request)} type="button"><span className="w-12 font-mono text-[10px] font-semibold text-neutral-300">{request.method}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px]">{request.name}</span><span className="mt-1 block truncate font-mono text-[10px] text-neutral-600">{request.url}</span></span><span className="font-mono text-[10px] text-neutral-700">↵</span></button>)}</div>
      </section>
    </div>
  );
}
