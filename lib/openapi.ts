import { HTTP_METHODS, makeId, type HttpMethod, type HeaderEntry, type RequestRecord } from "@/lib/onyx-types";

const OPENAPI_METHODS = new Set<string>(HTTP_METHODS.map((method) => method.toLowerCase()));

type OpenApiDocument = {
  info?: { title?: unknown };
  servers?: Array<{ url?: unknown }>;
  host?: unknown;
  basePath?: unknown;
  schemes?: unknown;
  paths?: Record<string, unknown>;
};

type Operation = {
  operationId?: unknown;
  summary?: unknown;
  description?: unknown;
  parameters?: unknown;
  requestBody?: unknown;
  responses?: unknown;
};

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parameterEntries(operation: Operation, pathItem: Record<string, unknown>): HeaderEntry[] {
  const parameters = [
    ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
    ...(Array.isArray(operation.parameters) ? operation.parameters : []),
  ];

  return parameters
    .filter((parameter): parameter is Record<string, unknown> => Boolean(parameter) && typeof parameter === "object")
    .filter((parameter) => parameter.in === "header")
    .map((parameter) => ({
      name: stringValue(parameter.name, "Header"),
      value: stringValue(parameter.example ?? parameter.default, ""),
      enabled: true,
    }))
    .filter((header) => header.name.length > 0);
}

function requestBody(operation: Operation): string {
  const body = operation.requestBody;
  if (!body || typeof body !== "object") return "";
  const content = (body as { content?: unknown }).content;
  if (!content || typeof content !== "object") return "";
  const jsonContent = (content as Record<string, unknown>)["application/json"];
  if (!jsonContent || typeof jsonContent !== "object") return "";
  const example = (jsonContent as { example?: unknown }).example;
  if (example !== undefined) return JSON.stringify(example, null, 2);
  const schema = (jsonContent as { schema?: unknown }).schema;
  if (schema && typeof schema === "object") {
    const properties = (schema as { properties?: unknown }).properties;
    if (properties && typeof properties === "object") return JSON.stringify({}, null, 2);
  }
  return "";
}

function baseUrl(document: OpenApiDocument): string {
  const serverUrl = document.servers?.[0]?.url;
  if (typeof serverUrl === "string" && serverUrl.trim()) return serverUrl.trim().replace(/\/$/, "");
  const scheme = Array.isArray(document.schemes) && typeof document.schemes[0] === "string" ? document.schemes[0] : "https";
  const host = stringValue(document.host, "api.example.com").replace(/\/$/, "");
  return `${scheme}://${host}${stringValue(document.basePath, "")}`.replace(/\/$/, "");
}

export function parseOpenApiRequests(content: string): { name: string; requests: RequestRecord[] } {
  let document: OpenApiDocument;
  try {
    document = JSON.parse(content) as OpenApiDocument;
  } catch {
    throw new Error("OpenAPI import currently accepts JSON documents (openapi.json or swagger.json).");
  }

  if (!document.paths || typeof document.paths !== "object") {
    throw new Error("The file does not contain an OpenAPI/Swagger paths object.");
  }

  const base = baseUrl(document);
  const requests: RequestRecord[] = [];
  for (const [path, rawPathItem] of Object.entries(document.paths)) {
    if (!rawPathItem || typeof rawPathItem !== "object") continue;
    const pathItem = rawPathItem as Record<string, unknown>;
    for (const [methodName, rawOperation] of Object.entries(pathItem)) {
      if (!OPENAPI_METHODS.has(methodName.toLowerCase())) continue;
      const operation = (rawOperation && typeof rawOperation === "object" ? rawOperation : {}) as Operation;
      const method = methodName.toUpperCase() as HttpMethod;
      const label = stringValue(operation.summary || operation.operationId, `${method} ${path}`);
      requests.push({
        id: makeId("openapi"),
        name: label,
        method,
        url: `${base}${path.startsWith("/") ? path : `/${path}`}`,
        headers: parameterEntries(operation, pathItem),
        body: requestBody(operation),
      });
    }
  }

  if (requests.length === 0) throw new Error("No HTTP operations were found in the OpenAPI document.");
  return {
    name: stringValue(document.info?.title, "Imported OpenAPI collection"),
    requests,
  };
}

export function parsePostmanRequests(content: string): { name: string; requests: RequestRecord[] } {
  let document: { info?: { name?: unknown }; item?: unknown };
  try {
    document = JSON.parse(content) as typeof document;
  } catch {
    throw new Error("Postman import accepts a JSON collection export.");
  }

  const requests: RequestRecord[] = [];
  const visit = (items: unknown): void => {
    if (!Array.isArray(items)) return;
    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== "object") continue;
      const item = rawItem as Record<string, unknown>;
      if (Array.isArray(item.item)) visit(item.item);
      const rawRequest = item.request;
      if (!rawRequest || typeof rawRequest !== "object") continue;
      const request = rawRequest as Record<string, unknown>;
      const method = stringValue(request.method, "GET").toUpperCase();
      if (!OPENAPI_METHODS.has(method.toLowerCase())) continue;
      const urlValue = request.url;
      const url = typeof urlValue === "string"
        ? urlValue
        : urlValue && typeof urlValue === "object"
          ? stringValue((urlValue as { raw?: unknown }).raw, "")
          : "";
      if (!url) continue;
      const headers = Array.isArray(request.header)
        ? request.header
          .filter((header): header is Record<string, unknown> => Boolean(header) && typeof header === "object")
          .map((header) => ({ name: stringValue(header.key), value: stringValue(header.value), enabled: header.disabled !== true }))
          .filter((header) => header.name)
        : [];
      const body = request.body && typeof request.body === "object" ? stringValue((request.body as { raw?: unknown }).raw, "") : "";
      requests.push({ id: makeId("postman"), name: stringValue(item.name, `${method} request`), method: method as HttpMethod, url, headers, body });
    }
  };
  visit(document.item);
  if (requests.length === 0) throw new Error("No Postman requests were found in the collection.");
  return { name: stringValue(document.info?.name, "Imported Postman collection"), requests };
}

export function parseApiCollection(content: string): { name: string; requests: RequestRecord[] } {
  const document = JSON.parse(content) as Record<string, unknown>;
  if (document.openapi || document.swagger || document.paths) return parseOpenApiRequests(content);
  if (document.info && document.item) return parsePostmanRequests(content);
  throw new Error("Unsupported import format. Choose an OpenAPI/Swagger or Postman JSON file.");
}
