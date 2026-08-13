"use client";

import { useMemo, useState } from "react";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type JsonNodeProps = {
  label: string;
  value: JsonValue;
  depth: number;
  query: string;
};

function valueType(value: JsonValue): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function matches(label: string, value: JsonValue, query: string): boolean {
  if (!query) return true;
  return label.toLowerCase().includes(query) || JSON.stringify(value).toLowerCase().includes(query);
}

function JsonNode({ label, value, depth, query }: JsonNodeProps) {
  const expandable = typeof value === "object" && value !== null;
  const [expanded, setExpanded] = useState(depth < 1);
  const entries = expandable ? (Array.isArray(value) ? value.map((child, index) => [String(index), child] as const) : Object.entries(value)) : [];
  const visibleEntries = entries.filter(([childLabel, childValue]) => matches(childLabel, childValue, query));
  const type = valueType(value);

  if (!matches(label, value, query) && visibleEntries.length === 0) return null;

  return (
    <div className="font-mono text-[11px] leading-6">
      <div className="flex items-start gap-1" style={{ paddingLeft: `${depth * 14}px` }}>
        {expandable ? (
          <button aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`} className="mt-1 flex h-4 w-4 items-center justify-center text-neutral-600 hover:text-neutral-200" onClick={() => setExpanded((current) => !current)} type="button">
            <span className="text-[10px]">{expanded ? "−" : "+"}</span>
          </button>
        ) : <span className="w-4" />}
        <span className="text-neutral-500">{label}</span><span className="text-neutral-700">:</span>
        {!expandable ? <span className={type === "string" ? "text-neutral-300" : type === "null" ? "text-neutral-600" : "text-neutral-400"}>{typeof value === "string" ? JSON.stringify(value) : String(value)}</span> : <span className="text-neutral-600">{Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}</span>}
      </div>
      {expanded && expandable ? <div>{visibleEntries.map(([childLabel, childValue]) => <JsonNode depth={depth + 1} key={`${label}-${childLabel}`} label={Array.isArray(value) ? `[${childLabel}]` : childLabel} query={query} value={childValue} />)}</div> : null}
    </div>
  );
}

export function JsonTreeViewer({ body }: { body: string }) {
  const parsed = useMemo<JsonValue | null>(() => {
    try {
      return JSON.parse(body) as JsonValue;
    } catch {
      return null;
    }
  }, [body]);
  const [query, setQuery] = useState("");

  if (parsed === null && body.trim() !== "null") return <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[11px] leading-5 text-neutral-400">{body || "<empty response>"}</pre>;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-600">JSON tree</span>
        <input aria-label="Search JSON response" className="h-7 min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-2 font-mono text-[11px] text-neutral-300 outline-none placeholder:text-neutral-700 focus:border-border-strong" onChange={(event) => setQuery(event.target.value.trim().toLowerCase())} placeholder="Search keys and values" value={query} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3"><JsonNode depth={0} label={Array.isArray(parsed) ? "response[]" : "response"} query={query} value={parsed as JsonValue} /></div>
    </div>
  );
}
