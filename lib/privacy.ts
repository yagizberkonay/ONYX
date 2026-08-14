const SECRET_KEY_PATTERN = /(authorization|proxy-authorization|x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|client[-_]?secret|password|secret|private[-_]?key|cookie)/i;
const TOKEN_PATTERN = /\b(?:sk|ghp|github_pat|xoxb|xoxp|AIza|ya29)[A-Za-z0-9_\-.]{12,}\b/g;

export function isSensitiveKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

export function redactValue(value: string, replacement = "[REDACTED]"): string {
  return value
    .replace(TOKEN_PATTERN, replacement)
    .replace(/(Bearer\s+)[^\s,}]+/gi, `$1${replacement}`)
    .replace(/(Basic\s+)[^\s,}]+/gi, `$1${replacement}`);
}

export function redactHeaders<T extends { name: string; value: string }>(headers: T[]): T[] {
  return headers.map((header) => ({
    ...header,
    value: isSensitiveKey(header.name) ? "[REDACTED]" : redactValue(header.value),
  }));
}

export function redactText(text: string): string {
  if (!text) return text;
  try {
    const parsed: unknown = JSON.parse(text);
    return JSON.stringify(redactJson(parsed), null, 2);
  } catch {
    return redactValue(text);
  }
}

function redactJson(value: unknown, parentKey = ""): unknown {
  if (Array.isArray(value)) return value.map((item) => redactJson(item, parentKey));
  if (!value || typeof value !== "object") return typeof value === "string" ? redactValue(value) : value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      isSensitiveKey(key) || isSensitiveKey(parentKey) ? "[REDACTED]" : redactJson(child, key),
    ]),
  );
}

export function redactForAgent(value: string, enabled: boolean): string {
  return enabled ? redactText(value) : value;
}
