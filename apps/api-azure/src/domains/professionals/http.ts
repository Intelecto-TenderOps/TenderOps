import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import { DomainError } from "../../shared/errors.js";
import { json, query, queryInt, readJson } from "../../shared/http.js";
import type { Actor } from "../../shared/types.js";
import type { DuplicateAction, ResumeSelection } from "../../contracts/professional.js";
import type { ProfessionalService } from "./service.js";

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

function file(bytes: Buffer, fileName: string, contentType: string, correlation: string): HttpResponseInit {
  return {
    status: 200,
    body: bytes,
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${fileName}"`,
      "x-correlation-id": correlation,
      "cache-control": "no-store",
    },
  };
}

export async function dispatchProfessionals(
  request: HttpRequest,
  path: string,
  method: string,
  actor: Actor,
  companyId: string | null,
  professionals: ProfessionalService,
  correlation: string,
): Promise<HttpResponseInit | null> {
  const requireCompany = async () => {
    if (!companyId) throw new DomainError(400, "company_required");
    return companyId;
  };

  if (method === "GET" && path === "/api/v1/professionals/import-template") {
    const template = await professionals.template();
    if (request.headers.get("accept")?.includes("application/json")) {
      return json(200, { fileName: template.fileName, contentBase64: template.bytes.toString("base64") }, correlation);
    }
    return file(template.bytes, template.fileName, template.contentType, correlation);
  }

  if (method === "GET" && path === "/api/v1/professionals/indicators") {
    return json(200, await professionals.indicators(actor, await requireCompany()), correlation);
  }

  if (method === "GET" && path === "/api/v1/professionals") {
    return json(
      200,
      await professionals.list(actor, await requireCompany(), {
        search: query(request, "search") || undefined,
        profession: query(request, "profession") || undefined,
        profile: query(request, "profile") || undefined,
        specialty: query(request, "specialty") || undefined,
        education: query(request, "education") || undefined,
        institution: query(request, "institution") || undefined,
        certification: query(request, "certification") || undefined,
        issuer: query(request, "issuer") || undefined,
        technology: query(request, "technology") || undefined,
        employer: query(request, "employer") || undefined,
        project: query(request, "project") || undefined,
        city: query(request, "city") || undefined,
        availability: (query(request, "availability") || undefined) as never,
        minYears: query(request, "minYears") ? Number(query(request, "minYears")) : undefined,
        incomplete: query(request, "incomplete") === "true",
      }, queryInt(request, "page", 1), queryInt(request, "pageSize", 25)),
      correlation,
    );
  }

  if (method === "POST" && path === "/api/v1/professionals") {
    return json(201, await professionals.saveProfessional(actor, await requireCompany(), await readJson(request)), correlation);
  }

  const one = match("/api/v1/professionals/:id", path);
  if (method === "GET" && one && !["imports", "import-template", "indicators"].includes(param(one, "id"))) {
    return json(200, await professionals.get(actor, await requireCompany(), param(one, "id")), correlation);
  }
  if (method === "PATCH" && one && param(one, "id") !== "imports") {
    return json(200, await professionals.saveProfessional(actor, await requireCompany(), await readJson(request), param(one, "id")), correlation);
  }

  const children: Record<string, "professionalEducation" | "professionalExperiences" | "professionalCertifications" | "professionalAttachments" | "professionalLicenses" | "professionalSkills"> = {
    education: "professionalEducation",
    experiences: "professionalExperiences",
    certifications: "professionalCertifications",
    documents: "professionalAttachments",
    licenses: "professionalLicenses",
    skills: "professionalSkills",
  };
  for (const [suffix, key] of Object.entries(children)) {
    const child = match(`/api/v1/professionals/:id/${suffix}`, path);
    if (!child) continue;
    const record = await professionals.get(actor, await requireCompany(), param(child, "id"));
    if (method === "GET") {
      const bag = {
        education: record.education,
        experiences: record.experiences,
        certifications: record.certifications,
        documents: record.attachments,
        licenses: record.licenses,
        skills: record.skills,
      } as const;
      return json(200, bag[suffix as keyof typeof bag], correlation);
    }
    if (method === "PUT") {
      return json(
        200,
        await professionals.replaceCollection(actor, await requireCompany(), param(child, "id"), key, await readJson(request)),
        correlation,
      );
    }
  }

  const consent = match("/api/v1/professionals/:id/consent", path);
  if (consent && (method === "POST" || method === "PUT")) {
    return json(200, await professionals.saveConsent(actor, await requireCompany(), param(consent, "id"), await readJson(request)), correlation);
  }
  const supports = match("/api/v1/professionals/:id/supports", path);
  if (method === "POST" && supports) {
    return json(202, await professionals.associateSupports(actor, await requireCompany(), param(supports, "id"), (await readJson<{ files: { name: string; relatedRecordId?: string }[] }>(request)).files ?? []), correlation);
  }

  if (method === "POST" && path === "/api/v1/professionals/imports") {
    const body = await readJson<{ fileName: string; contentBase64: string; mapping?: Record<string, string> }>(request);
    const content = Buffer.from(body.contentBase64, "base64");
    return json(201, await professionals.startImport(actor, await requireCompany(), body.fileName, content, body.mapping), correlation);
  }

  const imp = match("/api/v1/professionals/imports/:id", path);
  if (method === "GET" && imp) {
    return json(200, await professionals.getImport(actor, await requireCompany(), param(imp, "id")), correlation);
  }
  const preview = match("/api/v1/professionals/imports/:id/preview", path);
  if (method === "GET" && preview) {
    const batch = await professionals.getImport(actor, await requireCompany(), param(preview, "id"));
    return json(200, batch.preview, correlation);
  }
  const mapping = match("/api/v1/professionals/imports/:id/mapping", path);
  if (method === "PATCH" && mapping) {
    const body = await readJson<{ mapping: Record<string, string> }>(request);
    return json(200, await professionals.mapImport(actor, await requireCompany(), param(mapping, "id"), body.mapping), correlation);
  }
  const commit = match("/api/v1/professionals/imports/:id/commit", path);
  if (method === "POST" && commit) {
    const body = await readJson<{ duplicateAction?: DuplicateAction }>(request).catch(() => ({ duplicateAction: "actualizar" as const }));
    return json(200, await professionals.commitImport(actor, await requireCompany(), param(commit, "id"), body.duplicateAction ?? "actualizar"), correlation);
  }
  const errors = match("/api/v1/professionals/imports/:id/errors", path);
  if (method === "GET" && errors) {
    const fileResult = await professionals.importErrors(actor, await requireCompany(), param(errors, "id"));
    if (request.headers.get("accept")?.includes("application/json")) {
      return json(200, { fileName: fileResult.fileName, contentBase64: fileResult.bytes.toString("base64") }, correlation);
    }
    return file(fileResult.bytes, fileResult.fileName, fileResult.contentType, correlation);
  }
  if (method === "GET" && path === "/api/v1/professionals/mapping-profiles") {
    return json(200, await professionals.mappingProfiles(actor, await requireCompany()), correlation);
  }
  if (method === "POST" && path === "/api/v1/professionals/mapping-profiles") {
    return json(201, await professionals.saveMappingProfile(actor, await requireCompany(), await readJson(request)), correlation);
  }

  const staff = match("/api/v1/tenders/:id/staff-roles", path);
  if (method === "GET" && staff) {
    return json(200, await professionals.staffRoles(actor, await requireCompany(), param(staff, "id")), correlation);
  }
  if (method === "POST" && staff) {
    return json(201, await professionals.saveStaffRole(actor, await requireCompany(), param(staff, "id"), await readJson(request)), correlation);
  }
  const matches = match("/api/v1/tenders/:id/staff-roles/:roleId/matches", path);
  if (method === "GET" && matches) {
    return json(200, await professionals.matches(actor, await requireCompany(), param(matches, "id"), param(matches, "roleId")), correlation);
  }
  const assignments = match("/api/v1/tenders/:id/staff-assignments", path);
  if (method === "GET" && assignments) {
    return json(200, await professionals.staffAssignments(actor, await requireCompany(), param(assignments, "id")), correlation);
  }
  if (method === "POST" && assignments) {
    const body = await readJson<{ roleId: string; professionalId: string }>(request);
    return json(201, await professionals.assign(actor, await requireCompany(), param(assignments, "id"), body.roleId, body.professionalId), correlation);
  }

  if (method === "POST" && match("/api/v1/tenders/:id/resume-jobs", path)) {
    const params = match("/api/v1/tenders/:id/resume-jobs", path)!;
    const body = await readJson<{
      professionalId: string;
      roleId: string;
      proposedRoleName: string;
      selection: ResumeSelection;
      format?: "corporativo" | "entidad";
    }>(request);
    const result = await professionals.generateResume(
      actor,
      await requireCompany(),
      param(params, "id"),
      body.professionalId,
      body.roleId,
      body.selection,
      body.proposedRoleName,
      body.format,
    );
    return json(202, { job: result.job, resume: result.resume, warnings: result.warnings, sharePoint: result.sharePoint, contentBase64: result.bytes.toString("base64") }, correlation);
  }

  const resumes = match("/api/v1/tenders/:id/resumes", path);
  if (method === "GET" && resumes) {
    return json(200, await professionals.resumes(actor, await requireCompany(), param(resumes, "id")), correlation);
  }
  const job = match("/api/v1/resume-jobs/:id", path);
  if (method === "GET" && job) {
    return json(200, await professionals.getJob(actor, await requireCompany(), param(job, "id")), correlation);
  }
  const resume = match("/api/v1/resumes/:id", path);
  if (method === "GET" && resume) {
    return json(200, await professionals.previewResume(actor, await requireCompany(), param(resume, "id")), correlation);
  }
  const previewResume = match("/api/v1/resumes/:id/preview", path);
  if (method === "GET" && previewResume) {
    return json(200, await professionals.previewResume(actor, await requireCompany(), param(previewResume, "id")), correlation);
  }
  const approve = match("/api/v1/resumes/:id/approve", path);
  if (method === "POST" && approve) {
    return json(200, await professionals.approveResume(actor, await requireCompany(), param(approve, "id")), correlation);
  }
  const regenerate = match("/api/v1/resumes/:id/regenerate", path);
  if (method === "POST" && regenerate) {
    const result = await professionals.regenerateResume(actor, await requireCompany(), param(regenerate, "id"));
    return json(202, { job: result.job, resume: result.resume, warnings: result.warnings, sharePoint: result.sharePoint, contentBase64: result.bytes.toString("base64") }, correlation);
  }
  const versions = match("/api/v1/resumes/:id/versions", path);
  if (method === "GET" && versions) {
    return json(200, await professionals.resumeVersions(actor, await requireCompany(), param(versions, "id")), correlation);
  }

  return null;
}
