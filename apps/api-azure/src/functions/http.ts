import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { authenticate, issueDemoToken } from "../shared/auth.js";
import { loadConfig } from "../shared/config.js";
import { DomainError } from "../shared/errors.js";
import { corsHeaders, correlationId, json, query, queryInt, readJson, safeError } from "../shared/http.js";
import { permissionsFor } from "../shared/permissions.js";
import type { Actor, MembershipData } from "../shared/types.js";
import { DEMO_USERS, demoActor, demoToken, getContainer, seedDemo } from "../app/container.js";
import { openApiDocument } from "../openapi.js";
import { lastSyncSafe, runNamedJob } from "../jobs/runner.js";
import { dispatchProfessionals } from "../domains/professionals/http.js";

type Handler = (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;

function pathOf(request: HttpRequest): string {
  const url = new URL(request.url);
  return url.pathname.replace(/\/+$/, "") || "/";
}

function match(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const expected = patternParts[i]!;
    const actual = pathParts[i]!;
    if (expected.startsWith(":")) params[expected.slice(1)] = decodeURIComponent(actual);
    else if (expected !== actual) return null;
  }
  return params;
}

function param(params: Record<string, string>, name: string): string {
  const value = params[name];
  if (!value) throw new DomainError(400, "invalid_route");
  return value;
}

async function actorOf(request: HttpRequest): Promise<Actor> {
  const session = await authenticate(request.headers.get("authorization"), request.headers.get("cookie"));
  return session.actor;
}

function commandId(request: HttpRequest): string {
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[0-9a-fA-F-]{36}$/.test(key)) throw new DomainError(400, "idempotency_key_required");
  return key;
}

export async function routeRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const correlation = correlationId(request);
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);
  if (request.method === "OPTIONS") return { status: 204, headers: cors };
  try {
    await seedDemo();
    const result = await dispatch(request, context, correlation);
    return { ...result, headers: { ...(result.headers ?? {}), ...cors } };
  } catch (error) {
    if (error instanceof DomainError && error.status >= 500) {
      context.error(`Request failed ${error.code} ${correlation}`);
    } else if (!(error instanceof DomainError)) {
      context.error(`Unexpected error ${correlation}`);
    }
    const result = safeError(error, correlation);
    return { ...result, headers: { ...(result.headers ?? {}), ...cors } };
  }
}

async function dispatch(request: HttpRequest, _context: InvocationContext, correlation: string): Promise<HttpResponseInit> {
  const path = pathOf(request);
  const method = request.method.toUpperCase();
  const container = getContainer();
  const config = loadConfig();

  if (method === "GET" && (path === "/api/health/live" || path === "/health/live")) {
    return json(200, { status: "alive", runtime: "azure-functions", environment: config.environment }, correlation);
  }
  if (method === "GET" && path === "/api/csrf") {
    return json(200, { token: crypto.randomUUID(), demo: config.demoEnabled, entraConfigured: Boolean(config.tenantId && config.spaClientId) }, correlation);
  }
  if (method === "GET" && path === "/api/v1/openapi.json") {
    return json(200, openApiDocument(), correlation);
  }
  if (method === "POST" && match("/api/demo/login/:alias", path)) {
    if (!config.demoEnabled) throw new DomainError(404, "resource_not_found");
    const alias = param(match("/api/demo/login/:alias", path)!, "alias");
    const actor = demoActor(alias);
    const token = issueDemoToken(actor, config.demoTokenSecret);
    return json(200, { token, demo: true }, correlation, {
      "set-cookie": `tenderops_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`,
    });
  }
  if (method === "GET" && path === "/auth/login") {
    if (config.demoEnabled) return { status: 302, headers: { location: "/" } };
    throw new DomainError(400, "use_msal_spa");
  }
  if (method === "POST" && path === "/api/logout") {
    return json(200, { ok: true }, correlation, {
      "set-cookie": "tenderops_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    });
  }
  if (method === "GET" && path === "/api/session") {
    const actor = await actorOf(request);
    const memberships = await container.store.memberships(actor);
    const companies = [];
    for (const membership of memberships) {
      const company = await container.store.get(membership.companyId, "company", membership.companyId);
      const data = (company?.data ?? {}) as { legalName?: string };
      const member = membership.data as unknown as MembershipData;
      companies.push({
        id: membership.companyId,
        name: data.legalName ?? membership.companyId,
        permissions: permissionsFor(member.roles, member.active),
      });
    }
    return json(200, {
      name: actor.name,
      companies,
      csrfToken: crypto.randomUUID(),
      mode: config.demoEnabled ? "Demo local · Azure Functions" : "Entra / Azure Functions / Dataverse",
    }, correlation);
  }

  const actor = await actorOf(request);
  const professionalResponse = await dispatchProfessionals(
    request,
    path,
    method,
    actor,
    request.headers.get("x-company-id") ?? query(request, "companyId"),
    container.professionals,
    correlation,
  );
  if (professionalResponse) return professionalResponse;

  if (method === "POST" && path === "/api/v1/companies") {
    const body = await readJson<{ legalName: string; countryCode: string; taxId: string }>(request);
    const created = await container.companies.createCompany(actor, body, commandId(request), correlation);
    return json(201, created, correlation, { etag: `"${created.version}"` });
  }

  const select = match("/api/v1/companies/:companyId/select", path);
  if (method === "POST" && select) {
    await container.companies.authorize(actor, param(select, "companyId"), "profile.read");
    return json(200, { companyId: param(select, "companyId") }, correlation);
  }

  const eligible = match("/api/v1/companies/:companyId/financial/eligible", path);
  if (method === "GET" && eligible) {
    return json(200, await container.companies.eligibleFinancial(actor, param(eligible, "companyId")), correlation);
  }

  const audit = match("/api/v1/companies/:companyId/audit", path);
  if (method === "GET" && audit) {
    await container.companies.authorize(actor, param(audit, "companyId"), "audit.read");
    const offset = queryInt(request, "offset", 0);
    const limit = queryInt(request, "limit", 25);
    return json(200, await container.store.audit(param(audit, "companyId"), offset, limit), correlation);
  }

  const workspace = match("/api/v1/companies/:companyId/workspace", path);
  if (method === "GET" && workspace) {
    return json(200, await container.workspace.snapshot(actor, param(workspace, "companyId")), correlation);
  }

  const evidence = match("/api/v1/companies/:companyId/evidence/:id/download", path);
  if (method === "GET" && evidence) {
    await container.companies.get(actor, param(evidence, "companyId"), "evidence", param(evidence, "id"));
    throw new DomainError(503, "secure_file_pipeline_pending");
  }

  const approve = match("/api/v1/companies/:companyId/:kind/:id/approve", path);
  if (method === "POST" && approve) {
    const updated = await container.companies.transition(
      actor,
      param(approve, "companyId"),
      param(approve, "kind"),
      param(approve, "id"),
      request.headers.get("if-match"),
      commandId(request),
      correlation,
    );
    return json(200, updated, correlation, { etag: `"${updated.version}"` });
  }

  const one = match("/api/v1/companies/:companyId/:kind/:id", path);
  if (one && !["workspace", "audit", "select"].includes(param(one, "kind"))) {
    if (method === "GET") {
      const resource = await container.companies.get(actor, param(one, "companyId"), param(one, "kind"), param(one, "id"));
      return json(200, resource, correlation, { etag: `"${resource.version}"` });
    }
    if (method === "PUT") {
      const updated = await container.companies.save(
        actor,
        param(one, "companyId"),
        param(one, "kind"),
        param(one, "id"),
        await readJson(request),
        request.headers.get("if-match"),
        commandId(request),
        correlation,
      );
      return json(200, updated, correlation, { etag: `"${updated.version}"` });
    }
  }

  const collection = match("/api/v1/companies/:companyId/:kind", path);
  if (collection && !["workspace", "audit", "select"].includes(param(collection, "kind"))) {
    if (method === "GET") {
      return json(200, await container.companies.list(actor, param(collection, "companyId"), param(collection, "kind"), queryInt(request, "offset", 0), queryInt(request, "limit", 25)), correlation);
    }
    if (method === "POST") {
      const created = await container.companies.save(
        actor,
        param(collection, "companyId"),
        param(collection, "kind"),
        null,
        await readJson(request),
        null,
        commandId(request),
        correlation,
      );
      return json(201, created, correlation, { etag: `"${created.version}"` });
    }
  }

  const companyId = request.headers.get("x-company-id") ?? query(request, "companyId");
  const requireCompany = async (permission = "workbench.read") => {
    if (!companyId) throw new DomainError(400, "company_required");
    await container.workspace.requireCompany(actor, companyId, permission);
    return companyId;
  };

  if (method === "GET" && path === "/api/v1/secop/processes") {
    const id = await requireCompany();
    const result = await container.workspace.searchTenders(actor, id, {
      exactId: query(request, "id") || undefined,
      search: query(request, "search") || undefined,
      entity: query(request, "entity") || undefined,
      taxId: query(request, "nit") || undefined,
      modalities: query(request, "modality") ? [query(request, "modality")] : undefined,
      departments: query(request, "department") ? [query(request, "department")] : undefined,
      municipality: query(request, "municipality") || undefined,
      statuses: query(request, "status") ? [query(request, "status") as never] : undefined,
      phase: query(request, "phase") || undefined,
      minValue: query(request, "minValue") ? Number(query(request, "minValue")) : undefined,
      maxValue: query(request, "maxValue") ? Number(query(request, "maxValue")) : undefined,
      from: query(request, "from") || undefined,
      until: query(request, "until") || undefined,
      unspsc: query(request, "unspsc") || undefined,
      source: (query(request, "source") as "SECOP II" | "SECOP I" | "all") || "SECOP II",
    }, queryInt(request, "page", 1), queryInt(request, "pageSize", 25));
    return json(200, result, correlation);
  }

  const process = match("/api/v1/secop/processes/:id", path);
  if (method === "GET" && process) {
    const id = await requireCompany();
    const tender = await container.workspace.getTender(actor, id, param(process, "id"));
    if (!tender) throw new DomainError(404, "resource_not_found");
    return json(200, tender, correlation);
  }

  if (method === "POST" && match("/api/v1/secop/processes/:id/favorite", path)) {
    const params = match("/api/v1/secop/processes/:id/favorite", path)!;
    return json(200, { ok: await container.workspace.toggleFlag(actor, await requireCompany("workbench.edit"), param(params, "id"), "favorite") }, correlation);
  }
  if (method === "POST" && match("/api/v1/secop/processes/:id/watch", path)) {
    const params = match("/api/v1/secop/processes/:id/watch", path)!;
    return json(200, { ok: await container.workspace.toggleFlag(actor, await requireCompany("workbench.edit"), param(params, "id"), "watching") }, correlation);
  }
  if (method === "POST" && path === "/api/v1/secop/searches") {
    const body = await readJson<{ name: string; filters: Record<string, unknown> }>(request);
    return json(201, await container.workspace.saveSearch(actor, await requireCompany("workbench.edit"), body.name, body.filters), correlation);
  }

  if (method === "GET" && path === "/api/v1/tenders") {
    const id = await requireCompany();
    return json(200, await container.workspace.searchTenders(actor, id, {
      search: query(request, "search") || undefined,
    }, queryInt(request, "page", 1), queryInt(request, "pageSize", 50)), correlation);
  }
  if (method === "GET" && path === "/api/v1/assessments") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany());
    return json(200, snapshot.assessments, correlation);
  }
  if (method === "POST" && path === "/api/v1/assessments/weights") {
    const body = await readJson<{ weights: Parameters<typeof container.workspace.saveWeights>[2] }>(request);
    return json(200, { ok: await container.workspace.saveWeights(actor, await requireCompany("workbench.edit"), body.weights) }, correlation);
  }
  if (method === "GET" && path === "/api/v1/requirements") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany());
    const tenderId = query(request, "tenderId");
    return json(200, snapshot.requirements.filter((item) => !tenderId || item.tenderId === tenderId), correlation);
  }
  if (method === "PATCH" && match("/api/v1/requirements/:id", path)) {
    const params = match("/api/v1/requirements/:id", path)!;
    return json(200, { ok: await container.workspace.updateRequirement(actor, await requireCompany("workbench.edit"), param(params, "id"), await readJson(request)) }, correlation);
  }
  if (method === "GET" && path === "/api/v1/decisions") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany());
    return json(200, snapshot.decisions, correlation);
  }
  if (method === "POST" && path === "/api/v1/decisions") {
    return json(201, await container.workspace.recordDecision(actor, await requireCompany("workbench.decide"), await readJson(request)), correlation);
  }
  if (method === "GET" && path === "/api/v1/opportunities") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany());
    return json(200, snapshot.opportunities, correlation);
  }
  if (method === "POST" && path === "/api/v1/opportunities") {
    return json(201, await container.workspace.createOpportunity(actor, await requireCompany("workbench.commercial"), await readJson(request)), correlation);
  }
  if (method === "GET" && path === "/api/v1/tasks") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany());
    return json(200, snapshot.tasks, correlation);
  }
  if (method === "POST" && path === "/api/v1/tasks") {
    return json(201, await container.workspace.saveTask(actor, await requireCompany("workbench.edit"), await readJson(request)), correlation);
  }
  if (method === "GET" && path === "/api/v1/documents") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany());
    const tenderId = query(request, "tenderId");
    return json(200, snapshot.documents.filter((item) => !tenderId || item.tenderId === tenderId), correlation);
  }
  if (method === "GET" && path === "/api/v1/copilot/agents") {
    return json(200, {
      agents: ["orquestador", "viabilidad", "estrategia", "observaciones", "documentos", "candidatos"],
      configured: container.workspace.integrations().find((item) => item.id === "copilot")?.status === "saludable",
    }, correlation);
  }
  if (method === "POST" && path === "/api/v1/copilot/ask") {
    const body = await readJson<{ body: string; agent?: CopilotAgent }>(request);
    return json(200, await container.workspace.askCopilot(actor, await requireCompany(), body.body, body.agent), correlation);
  }
  if (method === "GET" && path === "/api/v1/analytics/overview") {
    return json(200, await container.workspace.analytics(actor, await requireCompany()), correlation);
  }
  if (method === "GET" && path === "/api/v1/notifications") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany());
    return json(200, snapshot.alerts, correlation);
  }
  if (method === "POST" && match("/api/v1/notifications/:id/read", path)) {
    const params = match("/api/v1/notifications/:id/read", path)!;
    return json(200, { ok: await container.workspace.markAlert(actor, await requireCompany(), param(params, "id"), { read: true }) }, correlation);
  }
  if (method === "GET" && path === "/api/v1/administration/integrations") {
    await requireCompany("workbench.operations");
    return json(200, container.workspace.integrations(), correlation);
  }
  if (method === "GET" && path === "/api/v1/administration/sync") {
    await requireCompany("workbench.operations");
    return json(200, {
      recent: await lastSyncSafe(container.store, "recent"),
      changes: await lastSyncSafe(container.store, "changes"),
      monitored: await lastSyncSafe(container.store, "monitored"),
    }, correlation);
  }
  if (method === "POST" && path === "/api/v1/administration/jobs/:name") {
    // handled below
  }
  const job = match("/api/v1/administration/jobs/:name", path);
  if (method === "POST" && job) {
    await requireCompany("workbench.operations");
    return json(202, await runNamedJob(container.store, param(job, "name")), correlation);
  }
  if (method === "GET" && path === "/api/v1/sources") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany());
    return json(200, snapshot.sources, correlation);
  }
  if (method === "GET" && path === "/api/v1/users") {
    const snapshot = await container.workspace.snapshot(actor, await requireCompany("members.read"));
    return json(200, snapshot.memberships, correlation);
  }

  void DEMO_USERS;
  void demoToken;
  throw new DomainError(404, "resource_not_found");
}

type CopilotAgent = "orquestador" | "viabilidad" | "estrategia" | "observaciones" | "documentos" | "candidatos";

export const httpHandler: Handler = routeRequest;

app.http("api", {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "{*path}",
  handler: routeRequest,
});
