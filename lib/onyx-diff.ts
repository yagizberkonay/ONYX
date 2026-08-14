import type { CollectionFile, RequestRecord } from "@/lib/onyx-types";
import type { OnyxDiffChange, OnyxReview } from "@/lib/onyx-document";

function stableValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function requestFields(request: RequestRecord): Record<string, unknown> {
  return {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body,
    preRequestScript: request.preRequestScript ?? "",
    postResponseScript: request.postResponseScript ?? "",
    folder: request.folder ?? "",
  };
}

export function diffRequests(before: RequestRecord | undefined, after: RequestRecord | undefined): OnyxDiffChange[] {
  if (!before && after) {
    return [{ path: `request.${after.name}`, kind: "added", after: stableValue(requestFields(after)) }];
  }
  if (before && !after) {
    return [{ path: `request.${before.name}`, kind: "removed", before: stableValue(requestFields(before)) }];
  }
  if (!before || !after) return [];

  const changes: OnyxDiffChange[] = [];
  const beforeFields = requestFields(before);
  const afterFields = requestFields(after);
  Object.keys(afterFields).forEach((field) => {
    const beforeValue = stableValue(beforeFields[field]);
    const afterValue = stableValue(afterFields[field]);
    if (beforeValue !== afterValue) {
      changes.push({
        path: `${after.name}.${field}`,
        kind: "changed",
        before: beforeValue,
        after: afterValue,
      });
    }
  });
  return changes;
}

export function diffCollections(before: CollectionFile, after: CollectionFile): OnyxDiffChange[] {
  const beforeById = new Map(before.requests.map((request) => [request.id, request]));
  const afterById = new Map(after.requests.map((request) => [request.id, request]));
  const changes: OnyxDiffChange[] = [];

  before.requests.forEach((request) => {
    if (!afterById.has(request.id)) {
      changes.push(...diffRequests(request, undefined));
    }
  });

  after.requests.forEach((request) => {
    changes.push(...diffRequests(beforeById.get(request.id), request));
  });

  if (before.name !== after.name) {
    changes.push({ path: "collection.name", kind: "changed", before: before.name, after: after.name });
  }

  return changes;
}

export function createCollectionReview(
  before: CollectionFile,
  after: CollectionFile,
  sourceLabel: string,
  targetLabel: string,
): OnyxReview {
  return {
    sourceLabel,
    targetLabel,
    changes: diffCollections(before, after),
  };
}
