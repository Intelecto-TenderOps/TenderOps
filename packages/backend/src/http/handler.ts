import { loadEnv } from "../config/env.js";
import { summarizeMatrix } from "../domain/compliance.js";
import { defaultWeights, scoreAssessment } from "../domain/scoring.js";
import { CopilotStudioGateway } from "../integrations/copilot.js";
import { Dynamics365Client } from "../integrations/dynamics.js";
import { SharePointGraphClient } from "../integrations/sharepoint.js";
import { enqueue } from "../integrations/servicebus.js";
import { dependencyReport, requireConfigured } from "../integrations/status.js";
import { SecopChangeDetectionService } from "../secop/changes.js";
import { SecopDocumentDiscoveryService } from "../secop/documents.js";
import { catalogStatus, listCatalog } from "../secop/catalog.js";
import { scheduleRefreshIfStale, tick } from "../secop/poller.js";
import { SecopSearchService, toFrontendTender } from "../secop/search.js";
import { syncRecent } from "../secop/sync.js";
import { authenticate } from "./auth.js";
import { openApiDocument } from "../openapi.js";

export interface HttpRequest {
  method: string;
  path: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

const search = new SecopSearchService();
const changes = new SecopChangeDetectionService();
const documents = new SecopDocumentDiscoveryService();
const dynamics = new Dynamics365Client();
const sharepoint = new SharePointGraphClient();
const copilot = new CopilotStudioGateway();

export async function handleApiRequest(request: HttpRequest): Promise<HttpResponse> {
  const cors = corsHeaders(request.headers.origin ?? request.headers.Origin);
  if (request.method === "OPTIONS") return { status: 204, body: null, headers: cors };
  try {
    const path = normalizePath(request.path);
    const auth = authenticate(lowerHeaders(request.headers), path);
    if ("error" in auth) return json(auth.error.status, { error: auth.error }, cors);
    const response = await route(path, request, auth.companyId);
    return { ...response, headers: { ...cors, ...(response.headers ?? {}) } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const status = error instanceof Error && error.name === "ForbiddenError" ? 403 : 500;
    return json(status, { error: { code: "internal_error", message } }, cors);
  }
}

async function route(path: string, request: HttpRequest, companyId: string): Promise<HttpResponse> {
  const { method, query, body } = request;
  if (method === "GET" && path === "/api/v1/health") {
    return json(200, { ok: true, service: "tenderops-api", time: new Date().toISOString() });
  }
  if (method === "GET" && path === "/api/v1/openapi.json") return json(200, openApiDocument());
  if (method === "GET" && path === "/api/v1/admin/integrations") return json(200, { items: dependencyReport() });

  if (path.startsWith("/api/v1/secop")) return secopRoutes(path, method, query, body, request.headers);
  if (path.startsWith("/api/v1/companies")) return companyRoutes(path, method, body, companyId);
  if (path.startsWith("/api/v1/assessments")) return assessmentRoutes(path, method, body);
  if (path.startsWith("/api/v1/compliance")) return complianceRoutes(path, method, body);
  if (path.startsWith("/api/v1/documents")) return documentRoutes(path, method, body);
  if (path.startsWith("/api/v1/decisions")) return decisionRoutes(path, method, body);
  if (path.startsWith("/api/v1/opportunities") || path.startsWith("/api/v1/crm")) return crmRoutes(path, method, body);
  if (path.startsWith("/api/v1/tasks")) return taskRoutes(path, method, body);
  if (path.startsWith("/api/v1/agents") || path.startsWith("/api/v1/agent-executions")) return copilotRoutes(path, method, body);
  if (path.startsWith("/api/v1/analytics")) return analyticsRoutes();
  if (path.startsWith("/api/v1/admin")) return adminRoutes(path);
  return json(404, { error: { code: "not_found", message: `Ruta no encontrada: ${path}` } });
}

async function secopRoutes(
  path: string,
  method: string,
  query: Record<string, string>,
  body: unknown,
  headers: Record<string, string>,
) {
  if (method === "GET" && path === "/api/v1/secop/sources") {
    const env = loadEnv();
    return json(200, {
      items: [
        { id: "SECOP_II", dataset: env.SECOP_II_DATASET_ID, searchMode: env.SECOP_SEARCH_MODE },
        { id: "SECOP_I", dataset: env.SECOP_I_DATASET_ID, searchMode: env.SECOP_SEARCH_MODE },
      ],
    });
  }
  if (method === "GET" && (path === "/api/v1/secop/processes" || path === "/api/v1/secop/search")) {
    const result = await search.search({
      q: query.q,
      source: (query.source as "SECOP_I" | "SECOP_II" | "all") ?? "all",
      entity: query.entity,
      nit: query.nit,
      department: query.department,
      municipality: query.municipality,
      modality: query.modality,
      status: query.status,
      phase: query.phase,
      minValue: query.minValue ? Number(query.minValue) : undefined,
      maxValue: query.maxValue ? Number(query.maxValue) : undefined,
      publishedFrom: query.publishedFrom,
      publishedTo: query.publishedTo,
      closingFrom: query.closingFrom,
      closingTo: query.closingTo,
      unspsc: query.unspsc,
      sort: query.sort as "published" | "value" | "updated" | undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      cursor: query.cursor,
    });
    scheduleRefreshIfStale();
    return json(200, {
      ...result,
      items: query.view === "raw" ? result.items : result.items.map(toFrontendTender),
    });
  }
  const processMatch = path.match(/^\/api\/v1\/secop\/processes\/([^/]+)(?:\/(changes|documents|history))?$/);
  if (method === "GET" && processMatch) {
    const id = decodeURIComponent(processMatch[1]);
    const extra = processMatch[2];
    const item = await search.getById(id);
    if (!item) return json(404, { error: { code: "not_found", message: "Proceso no encontrado" } });
    if (extra === "changes") return json(200, await changes.list(item.externalProcessId));
    if (extra === "documents") return json(200, await documents.list(item.externalProcessId, item.portfolioId ?? undefined));
    if (extra === "history") return json(200, { items: [], warnings: ["El historial propio aparece cuando el índice PostgreSQL está sincronizado."] });
    return json(200, { item, tender: toFrontendTender(item) });
  }
  if (method === "GET" && path === "/api/v1/secop/status") {
    const env = loadEnv();
    return json(200, {
      mode: env.SECOP_SEARCH_MODE,
      tokenConfigured: Boolean(env.SOCRATA_APP_TOKEN),
      syncEnabled: env.SECOP_SYNC_ENABLED === "true",
      pollIntervalMs: env.SECOP_POLL_INTERVAL_MS,
      lookbackHours: env.SECOP_LOOKBACK_HOURS,
      catalog: catalogStatus(),
      dependencies: dependencyReport().filter((item) => item.name.startsWith("secop") || item.name === "postgresql"),
    });
  }
  if (method === "GET" && path === "/api/v1/secop/catalog") {
    const status = catalogStatus();
    return json(200, {
      items: listCatalog().slice(0, 50),
      tokenConfigured: Boolean(loadEnv().SOCRATA_APP_TOKEN),
      ...status,
    });
  }
  if (method === "GET" && path === "/api/v1/secop/sync-history") {
    return json(200, { items: catalogStatus().runs });
  }
  if ((method === "GET" || method === "POST") && path === "/api/v1/secop/sync") {
    if (!cronAuthorized(headers)) {
      return json(401, { error: { code: "unauthorized", message: "Cron no autorizado." } });
    }
    if (method === "POST") {
      const queued = await enqueue("secop", body ?? {}, crypto.randomUUID());
      if (queued.ok) return json(202, queued);
    }
    const requested = ((body as { source?: string } | undefined)?.source ?? query.source) as string | undefined;
    if (requested === "SECOP_I" || requested === "SECOP_II") {
      const result = await syncRecent(requested);
      return json(202, { jobId: result.runId, status: result.status, mode: "inline", result });
    }
    const result = await tick(method === "GET" ? "cron" : "manual");
    return json(202, { status: result.skipped ? "skipped" : "finished", mode: "inline", result });
  }
  return json(404, { error: { code: "not_found", message: path } });
}

function companyRoutes(path: string, method: string, body: unknown, companyId: string) {
  if (method === "GET" && path === "/api/v1/companies") {
    return json(200, pending("dataverse", "Listado de empresas licitantes."));
  }
  if (method === "POST" && path === "/api/v1/companies") {
    return json(configuredStatus("dataverse"), pending("dataverse", "Alta de empresa", body));
  }
  const match = path.match(/^\/api\/v1\/companies\/([^/]+)(?:\/(capabilities|experience|financials|rules))?$/);
  if (match) {
    if (match[1] !== companyId && companyId && companyId !== "public" && companyId !== "unconfigured") {
      return json(403, { error: { code: "forbidden", message: "No se puede consultar otra empresa." } });
    }
    return json(configuredStatus("dataverse"), pending("dataverse", path, body));
  }
  return json(404, { error: { code: "not_found", message: path } });
}

function assessmentRoutes(path: string, method: string, body: unknown) {
  if (method === "POST" && path === "/api/v1/assessments") {
    const scores = (body as { scores?: Record<string, number> })?.scores ?? {};
    return json(201, { item: scoreAssessment(scores, defaultWeights), persisted: false, persistence: pending("dataverse", "La evaluación determinista se calculó en proceso.") });
  }
  if (path.includes("/recalculate") && method === "POST") {
    return json(200, { item: scoreAssessment({}), persistence: pending("dataverse", "Recálculo en memoria.") });
  }
  return json(configuredStatus("dataverse"), pending("dataverse", path));
}

function complianceRoutes(path: string, method: string, body: unknown) {
  if (path.endsWith("/summary") && method === "GET") {
    return json(200, { summary: summarizeMatrix([]), persistence: pending("dataverse", "Matriz vacía hasta persistir requisitos.") });
  }
  if (method === "POST" && path.endsWith("/recalculate")) {
    return json(200, { summary: summarizeMatrix((body as { items?: never[] })?.items ?? []) });
  }
  if (method === "PATCH" || method === "POST") return json(configuredStatus("dataverse"), pending("dataverse", path, body));
  return json(configuredStatus("dataverse"), pending("dataverse", path));
}

function documentRoutes(path: string, method: string, _body: unknown) {
  if (method === "POST" && path.endsWith("/upload-sessions")) {
    return json(configuredStatus("sharepoint"), pending("sharepoint", "La carga de archivos grandes usa sesión Graph, no el body de Vercel."));
  }
  return json(configuredStatus("sharepoint"), pending("sharepoint", path));
}

function decisionRoutes(_path: string, method: string, body: unknown) {
  if (method === "POST") return json(configuredStatus("dataverse"), pending("dataverse", "Registro de decisión versionada.", body));
  return json(configuredStatus("dataverse"), pending("dataverse", "Consulta de decisiones."));
}

async function crmRoutes(path: string, method: string, body: unknown) {
  if (path === "/api/v1/crm/accounts" && method === "GET") return jsonFrom(await dynamics.findAccountByNit(""));
  if (path === "/api/v1/opportunities/from-tender" && method === "POST") {
    const payload = body as { name?: string; secopId?: string; value?: number };
    return jsonFrom(await dynamics.createOpportunity({ name: payload?.name ?? "Oportunidad SECOP", secopId: payload?.secopId, estimatedvalue: payload?.value }));
  }
  return json(configuredStatus("dynamics"), pending("dynamics", path, body));
}

async function taskRoutes(path: string, method: string, body: unknown) {
  if (method === "POST" && path === "/api/v1/tasks") {
    return jsonFrom(await dynamics.createTask({ subject: (body as { title?: string })?.title ?? "Tarea TenderOps" }));
  }
  return json(configuredStatus("dynamics"), pending("dynamics", path));
}

function copilotRoutes(path: string, method: string, body: unknown) {
  if (method === "GET" && path === "/api/v1/agents") return json(200, { items: copilot.listAgents() });
  if (method === "POST" && path === "/api/v1/agent-executions") {
    return json(configuredStatus("copilot"), pending("copilot", "Ejecución de agente", body));
  }
  return json(configuredStatus("copilot"), pending("copilot", path));
}

function analyticsRoutes() {
  return json(200, {
    overview: { detected: 0, evaluated: 0, discarded: 0, bid: 0, noBid: 0, note: "Las métricas reales requieren índice y Dataverse." },
  });
}

function adminRoutes(path: string) {
  if (path.endsWith("/settings")) return json(200, { timezone: "America/Bogota", currency: "COP" });
  return json(configuredStatus("dataverse"), pending("dataverse", path));
}

function pending(integration: string, message: string, payload?: unknown) {
  const gate = requireConfigured(integration);
  return {
    configured: gate.ok,
    integration,
    message,
    payload: payload ?? null,
    error: gate.ok ? undefined : gate.error,
  };
}

function configuredStatus(name: string) {
  return requireConfigured(name).ok ? 200 : 503;
}

function json(status: number, body: unknown, headers?: Record<string, string>): HttpResponse {
  return { status, body, headers: { "content-type": "application/json; charset=utf-8", ...headers } };
}

function jsonFrom(result: { ok: true; payload?: unknown } | { ok: false; error: unknown }) {
  if (!result.ok) return json(503, { error: result.error });
  return json(200, result.payload ?? result);
}

function normalizePath(path: string) {
  const clean = path.split("?")[0] || "/";
  return clean.replace(/\/$/, "") || "/";
}

function lowerHeaders(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

function cronAuthorized(headers: Record<string, string>) {
  const secret = loadEnv().CRON_SECRET;
  if (!secret) return true;
  const lowered = lowerHeaders(headers);
  const bearer = (lowered.authorization ?? "").replace(/^Bearer\s+/i, "");
  const header = lowered["x-cron-secret"] ?? "";
  return bearer === secret || header === secret;
}

function corsHeaders(origin?: string) {
  const allowed = loadEnv().CORS_ALLOWED_ORIGINS?.split(",").map((item) => item.trim()) ?? ["*"];
  const value = !origin || allowed.includes("*") || allowed.includes(origin) ? origin ?? "*" : allowed[0];
  return {
    "access-control-allow-origin": value,
    "access-control-allow-headers": "authorization,content-type,x-company-id,x-correlation-id,idempotency-key,x-cron-secret",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  };
}
