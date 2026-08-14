import type {
  CollectionFile,
  EnvironmentFile,
  HistoryEntry,
  NativeHttpResponse,
  RequestRecord,
  ResponseTiming,
} from "@/lib/onyx-types";

export const ONYX_FILE_EXTENSION = ".onyx";
export const ONYX_FILE_MAGIC = "onyx.document";
export const ONYX_FILE_VERSION = 1 as const;

export type OnyxBlockType =
  | "markdown"
  | "request"
  | "response"
  | "assertion"
  | "diff"
  | "timeline";

export interface OnyxDocumentBlock {
  id: string;
  type: OnyxBlockType;
  title?: string;
  content?: string;
  requestId?: string;
  snapshotId?: string;
  request?: RequestRecord;
  response?: OnyxResponseSnapshot;
  assertion?: OnyxAssertion;
  diff?: OnyxDiff;
  timing?: ResponseTiming;
}

export interface OnyxResponseSnapshot {
  status: number | null;
  statusText: string;
  url: string;
  headers: Array<{ name: string; value: string; enabled: boolean }>;
  body: string;
  contentType: string | null;
  truncated: boolean;
  responseTimeMs: number | null;
  timing?: ResponseTiming;
}

export interface OnyxAssertion {
  expression: string;
  passed: boolean;
  actual?: string;
  expected?: string;
}

export interface OnyxDiffChange {
  path: string;
  kind: "added" | "removed" | "changed" | "same";
  before?: string;
  after?: string;
}

export interface OnyxDiff {
  sourceLabel: string;
  targetLabel: string;
  changes: OnyxDiffChange[];
}

export interface OnyxSnapshot {
  id: string;
  createdAt: string;
  requestId: string;
  request: RequestRecord;
  environmentId: string;
  resolvedUrl: string;
  resolvedHeaders: Array<{ name: string; value: string; enabled: boolean }>;
  resolvedBody: string;
  response: OnyxResponseSnapshot | null;
  error?: string;
}

export interface OnyxReview {
  sourceLabel: string;
  targetLabel: string;
  changes: OnyxDiffChange[];
  notes?: string;
}

export interface OnyxDocument {
  format: typeof ONYX_FILE_MAGIC;
  version: typeof ONYX_FILE_VERSION;
  documentType: "notebook" | "review" | "snapshot";
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  blocks: OnyxDocumentBlock[];
  snapshots: OnyxSnapshot[];
  review?: OnyxReview;
  source?: {
    collection?: CollectionFile;
    environment?: EnvironmentFile;
    historyEntryIds?: string[];
  };
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeTiming(value: unknown): ResponseTiming | undefined {
  if (!value || typeof value !== "object") return undefined;
  const timing = value as Partial<ResponseTiming>;
  if (
    typeof timing.totalMs !== "number" ||
    typeof timing.requestMs !== "number" ||
    typeof timing.downloadMs !== "number"
  ) {
    return undefined;
  }
  return {
    totalMs: Math.max(0, timing.totalMs),
    requestMs: Math.max(0, timing.requestMs),
    downloadMs: Math.max(0, timing.downloadMs),
  };
}

function normalizeResponse(value: unknown): OnyxResponseSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;
  const response = value as Partial<OnyxResponseSnapshot>;
  const headers = Array.isArray(response.headers)
    ? response.headers
        .filter((header) => Boolean(header && typeof header === "object"))
        .map((header) => {
          const entry = header as { name?: unknown; value?: unknown; enabled?: unknown };
          return {
            name: stringValue(entry.name),
            value: stringValue(entry.value),
            enabled: entry.enabled !== false,
          };
        })
        .filter((header) => header.name.length > 0)
    : [];

  return {
    status: typeof response.status === "number" ? response.status : null,
    statusText: stringValue(response.statusText),
    url: stringValue(response.url),
    headers,
    body: stringValue(response.body),
    contentType: typeof response.contentType === "string" ? response.contentType : null,
    truncated: response.truncated === true,
    responseTimeMs: typeof response.responseTimeMs === "number" ? response.responseTimeMs : null,
    timing: normalizeTiming(response.timing),
  };
}

function normalizeBlock(value: unknown, index: number): OnyxDocumentBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Partial<OnyxDocumentBlock>;
  const type = block.type;
  if (
    type !== "markdown" &&
    type !== "request" &&
    type !== "response" &&
    type !== "assertion" &&
    type !== "diff" &&
    type !== "timeline"
  ) {
    return null;
  }
  return {
    id: stringValue(block.id, `block-${index + 1}`),
    type,
    title: optionalString(block.title),
    content: optionalString(block.content),
    requestId: optionalString(block.requestId),
    snapshotId: optionalString(block.snapshotId),
    request: block.request && typeof block.request === "object" ? (block.request as RequestRecord) : undefined,
    response: normalizeResponse(block.response),
    assertion:
      block.assertion && typeof block.assertion === "object"
        ? {
            expression: stringValue((block.assertion as OnyxAssertion).expression),
            passed: (block.assertion as OnyxAssertion).passed === true,
            actual: optionalString((block.assertion as OnyxAssertion).actual),
            expected: optionalString((block.assertion as OnyxAssertion).expected),
          }
        : undefined,
    diff:
      block.diff && typeof block.diff === "object"
        ? {
            sourceLabel: stringValue((block.diff as OnyxDiff).sourceLabel),
            targetLabel: stringValue((block.diff as OnyxDiff).targetLabel),
            changes: Array.isArray((block.diff as OnyxDiff).changes)
              ? (block.diff as OnyxDiff).changes.filter(
                  (change): change is OnyxDiffChange =>
                    Boolean(change && typeof change === "object" && typeof change.path === "string"),
                )
              : [],
          }
        : undefined,
    timing: normalizeTiming(block.timing),
  };
}

export function responseToOnyxSnapshot(response: NativeHttpResponse): OnyxResponseSnapshot {
  return {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    headers: response.headers,
    body: response.body,
    contentType: response.contentType,
    truncated: response.truncated,
    responseTimeMs: response.responseTimeMs,
    timing: response.timing,
  };
}

export function historyToOnyxSnapshot(entry: HistoryEntry): OnyxSnapshot {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    requestId: entry.requestId,
    request: {
      id: entry.requestId,
      name: entry.name,
      method: entry.method,
      url: entry.url,
      headers: entry.requestHeaders ?? entry.responseHeaders,
      body: entry.requestBody ?? "",
    },
    environmentId: entry.environmentId ?? "unknown",
    resolvedUrl: entry.resolvedUrl ?? entry.url,
    resolvedHeaders: entry.requestHeaders ?? [],
    resolvedBody: entry.requestBody ?? "",
    response:
      entry.status === null && entry.error
        ? null
        : {
            status: entry.status,
            statusText: entry.statusText,
            url: entry.resolvedUrl ?? entry.url,
            headers: entry.responseHeaders,
            body: entry.responseBody,
            contentType: entry.contentType ?? null,
            truncated: entry.truncated === true,
            responseTimeMs: entry.responseTimeMs,
            timing: entry.timing,
          },
    error: entry.error,
  };
}

export function createOnyxDocument(input: Partial<Pick<OnyxDocument, "title" | "description" | "documentType">> = {}): OnyxDocument {
  const now = new Date().toISOString();
  return {
    format: ONYX_FILE_MAGIC,
    version: ONYX_FILE_VERSION,
    documentType: input.documentType ?? "notebook",
    title: input.title?.trim() || "Untitled Onyx Notebook",
    description: input.description?.trim() || "A local, Git-native API notebook created in Onyx.",
    createdAt: now,
    updatedAt: now,
    blocks: [],
    snapshots: [],
  };
}

export function serializeOnyxDocument(document: OnyxDocument): string {
  return `${JSON.stringify({ ...document, updatedAt: new Date().toISOString() }, null, 2)}\n`;
}

export function isOnyxDocument(value: unknown): value is OnyxDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OnyxDocument>;
  return candidate.format === ONYX_FILE_MAGIC && candidate.version === ONYX_FILE_VERSION;
}

export function parseOnyxDocument(text: string): OnyxDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("This file is not a valid Onyx document.");
  }

  if (!isOnyxDocument(parsed)) {
    throw new Error("The selected file is not an Onyx document.");
  }

  const candidate = parsed as Partial<OnyxDocument>;
  const blocks = Array.isArray(candidate.blocks)
    ? candidate.blocks.map(normalizeBlock).filter((block): block is OnyxDocumentBlock => block !== null)
    : [];
  const snapshots = Array.isArray(candidate.snapshots)
    ? candidate.snapshots.filter((snapshot): snapshot is OnyxSnapshot => Boolean(snapshot && typeof snapshot === "object"))
    : [];

  return {
    format: ONYX_FILE_MAGIC,
    version: ONYX_FILE_VERSION,
    documentType:
      candidate.documentType === "review" || candidate.documentType === "snapshot"
        ? candidate.documentType
        : "notebook",
    title: stringValue(candidate.title, "Untitled Onyx Notebook").slice(0, 200),
    description: stringValue(candidate.description).slice(0, 2000),
    createdAt: stringValue(candidate.createdAt, new Date().toISOString()),
    updatedAt: stringValue(candidate.updatedAt, new Date().toISOString()),
    blocks,
    snapshots,
    review: candidate.review,
    source: candidate.source,
  };
}
