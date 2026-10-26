import type {
  ColumnMappingProfile,
  DuplicateAction,
  GeneratedResume,
  MatchResult,
  Professional,
  ProfessionalConsent,
  ProfessionalFilters,
  ProfessionalIndicators,
  ProfessionalRecord,
  ResumeConfiguration,
  ResumeGenerationJob,
  ResumeSelection,
  TenderStaffRole,
} from "../../contracts/professional.js";
import { DomainError } from "../../shared/errors.js";
import { createPrefixedId } from "../../shared/ids.js";
import type { Actor } from "../../shared/types.js";
import type { BusinessStore, WorkspaceTables } from "../../store/types.js";
import { CompanyService } from "../companies/service.js";
import { integrationReady } from "../../shared/config.js";
import { buildResumeDocx, hashBuffer } from "./docx.js";
import { analyzeImport, materializeDraft } from "./importEngine.js";
import { matchProfessionalToRole, specificExperiences } from "./matching.js";
import { mergeRanges } from "./overlap.js";
import { identityHash, maskEmail, maskPhone } from "./pii.js";
import { buildErrorWorkbook, buildImportTemplate, readWorkbook } from "./template.js";
import type { SheetTable } from "./sheets.js";

const SHAREPOINT_PENDING = "SharePoint no está configurado; la ruta lógica se registró y el archivo queda pendiente de carga.";

export class ProfessionalService {
  constructor(
    private readonly store: BusinessStore,
    private readonly companies: CompanyService,
  ) {}

  private async tables(companyId: string): Promise<WorkspaceTables> {
    return this.store.workspace(companyId);
  }

  private async save(companyId: string, patch: Partial<WorkspaceTables>) {
    await this.store.saveWorkspace(companyId, patch);
  }

  private async require(actor: Actor, companyId: string, permission = "workbench.read") {
    if (!companyId) throw new DomainError(400, "company_required");
    await this.companies.authorize(actor, companyId, permission);
    return companyId;
  }

  recordOf(tables: WorkspaceTables, id: string): ProfessionalRecord | null {
    const professional = tables.professionals.find((item) => item.id === id);
    if (!professional) return null;
    return {
      professional: this.publicProfessional(professional),
      education: tables.professionalEducation.filter((item) => item.professionalId === id),
      experiences: tables.professionalExperiences.filter((item) => item.professionalId === id),
      certifications: tables.professionalCertifications.filter((item) => item.professionalId === id),
      licenses: tables.professionalLicenses.filter((item) => item.professionalId === id),
      skills: tables.professionalSkills.filter((item) => item.professionalId === id),
      attachments: tables.professionalAttachments.filter((item) => item.professionalId === id),
      consent: tables.professionalConsents.find((item) => item.professionalId === id) ?? null,
    };
  }

  private publicProfessional(item: Professional): Professional {
    const copy = { ...item };
    delete (copy as { identityFingerprint?: string }).identityFingerprint;
    return copy;
  }

  private allRecords(tables: WorkspaceTables): ProfessionalRecord[] {
    return tables.professionals.map((item) => this.recordOf(tables, item.id)!);
  }

  async indicators(actor: Actor, companyId: string): Promise<ProfessionalIndicators> {
    await this.require(actor, companyId);
    const tables = await this.tables(companyId);
    const today = bogotaToday();
    const soon = tables.professionalCertifications.filter((item) => item.expiresOn && item.expiresOn >= today && item.expiresOn <= plusDays(today, 60));
    return {
      total: tables.professionals.length,
      active: tables.professionals.filter((item) => item.status === "activo").length,
      available: tables.professionals.filter((item) => item.availability === "disponible").length,
      incomplete: tables.professionals.filter((item) => item.incomplete).length,
      expiringCertifications: soon.length,
      proposed: new Set(tables.staffAssignments.map((item) => item.professionalId)).size,
      pendingDocuments: tables.professionalAttachments.filter((item) => item.status !== "asociado").length
        + tables.professionalExperiences.filter((item) => !item.supportRef).length,
    };
  }

  async list(actor: Actor, companyId: string, filters: ProfessionalFilters = {}, page = 1, pageSize = 25) {
    await this.require(actor, companyId);
    const tables = await this.tables(companyId);
    let items = this.allRecords(tables).map((item) => item.professional);
    items = items.filter((item) => matchesFilters(item, tables, filters));
    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  async get(actor: Actor, companyId: string, id: string) {
    await this.require(actor, companyId);
    const record = this.recordOf(await this.tables(companyId), id);
    if (!record) throw new DomainError(404, "resource_not_found");
    return record;
  }

  async saveProfessional(actor: Actor, companyId: string, input: Partial<Professional> & { documentNumber?: string }, id?: string) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    const now = new Date().toISOString();
    const current = id ? tables.professionals.find((item) => item.id === id) : undefined;
    if (id && !current) throw new DomainError(404, "resource_not_found");
    const professionalId = current?.id ?? createPrefixedId("pro");
    const fingerprint = input.documentNumber
      ? identityHash(companyId, input.documentType || current?.documentType || "CC", input.documentNumber)
      : (current as Professional & { identityFingerprint?: string } | undefined)?.identityFingerprint;
    const professional: Professional = {
      id: professionalId,
      companyId,
      externalId: input.externalId || current?.externalId || professionalId,
      givenName: input.givenName ?? current?.givenName ?? "",
      middleName: input.middleName ?? current?.middleName ?? "",
      familyName: input.familyName ?? current?.familyName ?? "",
      fullName: [input.givenName ?? current?.givenName, input.middleName ?? current?.middleName, input.familyName ?? current?.familyName].filter(Boolean).join(" "),
      documentType: input.documentType ?? current?.documentType ?? "CC",
      documentNumberMasked: input.documentNumber ? maskDoc(input.documentNumber) : current?.documentNumberMasked ?? "",
      documentCountry: input.documentCountry ?? current?.documentCountry ?? "CO",
      profession: input.profession ?? current?.profession ?? "",
      specialty: input.specialty ?? current?.specialty ?? "",
      primaryProfile: input.primaryProfile ?? current?.primaryProfile ?? "",
      capableRoles: input.capableRoles ?? current?.capableRoles ?? [],
      city: input.city ?? current?.city ?? "",
      department: input.department ?? current?.department ?? "",
      country: input.country ?? current?.country ?? "CO",
      linkage: input.linkage ?? current?.linkage ?? "empleado",
      availability: input.availability ?? current?.availability ?? "disponible",
      status: input.status ?? current?.status ?? "activo",
      verification: current?.verification ?? "pendiente",
      incomplete: current?.incomplete ?? true,
      notes: input.notes ?? current?.notes ?? "",
      consentId: current?.consentId ?? null,
      yearsGeneral: current?.yearsGeneral ?? 0,
      sharePointFolder: `BancoPerfiles/${professionalId}/`,
      emailMasked: input.emailMasked ?? ((input as { email?: string }).email ? maskEmail((input as { email?: string }).email ?? "") : current?.emailMasked),
      phoneMasked: input.phoneMasked ?? ((input as { phone?: string }).phone ? maskPhone((input as { phone?: string }).phone ?? "") : current?.phoneMasked),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      createdBy: current?.createdBy ?? actor.name,
    };
    (professional as Professional & { identityFingerprint?: string }).identityFingerprint = fingerprint;
    const professionals = current
      ? tables.professionals.map((item) => (item.id === professionalId ? professional : item))
      : [...tables.professionals, professional];
    await this.save(companyId, { professionals });
    return this.publicProfessional(professional);
  }

  async replaceCollection<K extends keyof WorkspaceTables>(
    actor: Actor,
    companyId: string,
    professionalId: string,
    key: K,
    items: WorkspaceTables[K],
  ) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    if (!tables.professionals.some((item) => item.id === professionalId)) throw new DomainError(404, "resource_not_found");
    const current = tables[key] as { professionalId?: string }[];
    const next = [...current.filter((item) => item.professionalId !== professionalId), ...(items as { professionalId?: string }[])];
    await this.save(companyId, { [key]: next } as Partial<WorkspaceTables>);
    await this.recalculate(companyId, professionalId);
    return this.recordOf(await this.tables(companyId), professionalId);
  }

  private async recalculate(companyId: string, professionalId: string) {
    const tables = await this.tables(companyId);
    const record = this.recordOf(tables, professionalId);
    if (!record) return;
    const merged = mergeRanges(record.experiences.map((item) => ({ start: item.startedOn, end: item.endedOn })), bogotaToday());
    const incomplete = !record.education.length || record.experiences.some((item) => item.verification !== "verificado");
    const professionals = tables.professionals.map((item) =>
      item.id === professionalId
        ? { ...item, yearsGeneral: Math.round(merged.months / 12), incomplete, updatedAt: new Date().toISOString() }
        : item,
    );
    await this.save(companyId, { professionals });
  }

  async template(): Promise<{ bytes: Buffer; fileName: string; contentType: string }> {
    return {
      bytes: await buildImportTemplate(),
      fileName: "tenderops-banco-perfiles.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  async startImport(actor: Actor, companyId: string, fileName: string, content: Buffer, mapping?: Record<string, string>) {
    await this.require(actor, companyId, "workbench.edit");
    const sheets = await readWorkbook(content);
    const tables = await this.tables(companyId);
    const now = new Date().toISOString();
    const batchId = createPrefixedId("imp");
    const parsed = analyzeImport(companyId, batchId, sheets as SheetTable[], this.allRecords(tables), mapping);
    const batch = {
      id: batchId,
      companyId,
      fileName,
      status: "validado" as const,
      mapping: parsed.mapping,
      mappingProfileId: null,
      stats: parsed.stats,
      preview: parsed.preview,
      issues: parsed.issues,
      policy: "partial" as const,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.name,
    };
    await this.save(companyId, { professionalImports: [batch, ...tables.professionalImports] });
    this.pendingDrafts.set(batchId, { parsed, sheets: sheets as SheetTable[] });
    return batch;
  }

  private pendingDrafts = new Map<string, { parsed: ReturnType<typeof analyzeImport>; sheets: SheetTable[] }>();

  async getImport(actor: Actor, companyId: string, id: string) {
    await this.require(actor, companyId);
    const batch = (await this.tables(companyId)).professionalImports.find((item) => item.id === id);
    if (!batch) throw new DomainError(404, "resource_not_found");
    return batch;
  }

  async mapImport(actor: Actor, companyId: string, id: string, mapping: Record<string, string>) {
    const batch = await this.getImport(actor, companyId, id);
    const session = this.pendingDrafts.get(id);
    if (!session) throw new DomainError(409, "import_session_expired");
    const tables = await this.tables(companyId);
    const next = analyzeImport(companyId, id, session.sheets, this.allRecords(tables), mapping);
    this.pendingDrafts.set(id, { parsed: next, sheets: session.sheets });
    const updated = { ...batch, mapping, status: "mapeado" as const, stats: next.stats, preview: next.preview, issues: next.issues, updatedAt: new Date().toISOString() };
    await this.save(companyId, {
      professionalImports: tables.professionalImports.map((item) => (item.id === id ? updated : item)),
    });
    return updated;
  }

  async commitImport(actor: Actor, companyId: string, id: string, duplicateAction: DuplicateAction = "actualizar") {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    const batch = tables.professionalImports.find((item) => item.id === id);
    const session = this.pendingDrafts.get(id);
    if (!batch || !session) throw new DomainError(404, "resource_not_found");
    const parsed = session.parsed;
    if (batch.policy === "fail_fast" && parsed.stats.errors) throw new DomainError(422, "import_has_errors");
    const existing = this.allRecords(tables);
    const created: ProfessionalRecord[] = [];
    for (const draft of parsed.records) {
      if (draft.action === "omitir") continue;
      const current = existing.find((item) => item.professional.id === draft.existingId || item.professional.externalId === draft.externalId) ?? null;
      if (current && duplicateAction === "conservar") continue;
      created.push(materializeDraft(companyId, actor.name, { ...draft, action: current ? "actualizar" : "crear" }, current));
    }
    await this.persistRecords(companyId, tables, created);
    const confirmed = {
      ...batch,
      status: parsed.stats.errors ? "parcial" as const : "confirmado" as const,
      stats: {
        ...parsed.stats,
        created: created.filter((item) => !existing.some((row) => row.professional.id === item.professional.id)).length,
        updated: created.filter((item) => existing.some((row) => row.professional.id === item.professional.id)).length,
      },
      updatedAt: new Date().toISOString(),
    };
    await this.save(companyId, {
      professionalImports: (await this.tables(companyId)).professionalImports.map((item) => (item.id === id ? confirmed : item)),
    });
    return confirmed;
  }

  private async persistRecords(companyId: string, tables: WorkspaceTables, records: ProfessionalRecord[]) {
    const ids = new Set(records.map((item) => item.professional.id));
    const next: Partial<WorkspaceTables> = {
      professionals: [
        ...tables.professionals.filter((item) => !ids.has(item.id)),
        ...records.map((item) => item.professional),
      ],
      professionalEducation: [
        ...tables.professionalEducation.filter((item) => !ids.has(item.professionalId)),
        ...records.flatMap((item) => item.education),
      ],
      professionalExperiences: [
        ...tables.professionalExperiences.filter((item) => !ids.has(item.professionalId)),
        ...records.flatMap((item) => item.experiences),
      ],
      professionalCertifications: [
        ...tables.professionalCertifications.filter((item) => !ids.has(item.professionalId)),
        ...records.flatMap((item) => item.certifications),
      ],
      professionalLicenses: [
        ...tables.professionalLicenses.filter((item) => !ids.has(item.professionalId)),
        ...records.flatMap((item) => item.licenses),
      ],
      professionalSkills: [
        ...tables.professionalSkills.filter((item) => !ids.has(item.professionalId)),
        ...records.flatMap((item) => item.skills),
      ],
    };
    await this.save(companyId, next);
    for (const record of records) {
      await this.recalculate(companyId, record.professional.id);
    }
  }

  async saveConsent(actor: Actor, companyId: string, professionalId: string, input: Partial<ProfessionalConsent>) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    if (!tables.professionals.some((item) => item.id === professionalId)) throw new DomainError(404, "resource_not_found");
    const now = new Date().toISOString();
    const current = tables.professionalConsents.find((item) => item.professionalId === professionalId);
    const consent: ProfessionalConsent = {
      id: current?.id ?? createPrefixedId("cns"),
      professionalId,
      companyId,
      store: input.store ?? current?.store ?? false,
      consult: input.consult ?? current?.consult ?? false,
      present: input.present ?? current?.present ?? false,
      shareWithEntity: input.shareWithEntity ?? current?.shareWithEntity ?? false,
      legalBasis: input.legalBasis ?? current?.legalBasis ?? "Ley 1581 de 2012",
      grantedOn: input.grantedOn ?? current?.grantedOn ?? now,
      evidenceRef: input.evidenceRef ?? current?.evidenceRef ?? null,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      createdBy: actor.name,
    };
    const professionalConsents = current
      ? tables.professionalConsents.map((item) => (item.id === consent.id ? consent : item))
      : [...tables.professionalConsents, consent];
    const professionals = tables.professionals.map((item) =>
      item.id === professionalId ? { ...item, consentId: consent.id, updatedAt: now } : item,
    );
    await this.save(companyId, { professionalConsents, professionals });
    return consent;
  }

  async saveMappingProfile(actor: Actor, companyId: string, input: { name: string; sheet?: string; mapping: Record<string, string> }) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    const profile: ColumnMappingProfile = {
      id: createPrefixedId("map"),
      companyId,
      name: input.name,
      sheet: input.sheet ?? "Profesionales",
      mapping: input.mapping,
    };
    await this.save(companyId, { mappingProfiles: [profile, ...tables.mappingProfiles] });
    return profile;
  }

  async mappingProfiles(actor: Actor, companyId: string) {
    await this.require(actor, companyId);
    return (await this.tables(companyId)).mappingProfiles;
  }

  async associateSupports(actor: Actor, companyId: string, professionalId: string, files: { name: string; relatedRecordId?: string }[]) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    const record = this.recordOf(tables, professionalId);
    if (!record) throw new DomainError(404, "resource_not_found");
    const now = new Date().toISOString();
    const attachments = files.map((file) => ({
      id: createPrefixedId("att"),
      professionalId,
      companyId,
      kind: "otro" as const,
      name: file.name,
      sharePointId: null,
      sharePointPath: `BancoPerfiles/${professionalId}/Documentos/${file.name}`,
      relatedRecordId: file.relatedRecordId ?? null,
      hash: null,
      status: integrationReady("graph") ? "asociado" as const : "pendiente" as const,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.name,
    }));
    await this.save(companyId, { professionalAttachments: [...tables.professionalAttachments, ...attachments] });
    return {
      attachments,
      unassociated: files.filter((file) => !file.relatedRecordId).map((file) => file.name),
      sharePoint: integrationReady("graph") ? "ready" : "pending",
    };
  }

  async importErrors(actor: Actor, companyId: string, id: string) {
    const batch = await this.getImport(actor, companyId, id);
    return {
      bytes: await buildErrorWorkbook(batch.issues),
      fileName: `errores-${id}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  async saveStaffRole(actor: Actor, companyId: string, tenderId: string, input: Partial<TenderStaffRole>, id?: string) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    const now = new Date().toISOString();
    const role: TenderStaffRole = {
      id: id ?? createPrefixedId("rol"),
      companyId,
      tenderId,
      name: input.name ?? "Perfil requerido",
      quantity: input.quantity ?? 1,
      educationLevel: input.educationLevel ?? "",
      acceptedProfessions: input.acceptedProfessions ?? [],
      postgraduate: input.postgraduate ?? "",
      licenseRequired: input.licenseRequired ?? false,
      generalMonths: input.generalMonths ?? 0,
      specificMonths: input.specificMonths ?? 0,
      specificCriteria: input.specificCriteria ?? "",
      certifications: input.certifications ?? [],
      skills: input.skills ?? [],
      requiredDocuments: input.requiredDocuments ?? [],
      resumeFormat: input.resumeFormat ?? "corporativo",
      referenceDate: input.referenceDate ?? bogotaToday(),
      restrictions: input.restrictions ?? "",
      sourceRequirementId: input.sourceRequirementId ?? null,
      sourceDocument: input.sourceDocument ?? null,
      version: (input.version ?? 1),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.name,
    };
    const staffRoles = id
      ? tables.staffRoles.map((item) => (item.id === id ? role : item))
      : [...tables.staffRoles, role];
    await this.save(companyId, { staffRoles });
    return role;
  }

  async staffRoles(actor: Actor, companyId: string, tenderId: string) {
    await this.require(actor, companyId);
    return (await this.tables(companyId)).staffRoles.filter((item) => item.tenderId === tenderId);
  }

  async staffAssignments(actor: Actor, companyId: string, tenderId: string) {
    await this.require(actor, companyId);
    return (await this.tables(companyId)).staffAssignments.filter((item) => item.tenderId === tenderId);
  }

  async resumes(actor: Actor, companyId: string, tenderId?: string) {
    await this.require(actor, companyId);
    const rows = (await this.tables(companyId)).generatedResumes;
    return tenderId ? rows.filter((item) => item.tenderId === tenderId) : rows;
  }

  async getJob(actor: Actor, companyId: string, id: string) {
    await this.require(actor, companyId);
    const job = (await this.tables(companyId)).resumeJobs.find((item) => item.id === id);
    if (!job) throw new DomainError(404, "resource_not_found");
    return job;
  }

  async matches(actor: Actor, companyId: string, tenderId: string, roleId: string): Promise<MatchResult[]> {
    await this.require(actor, companyId);
    const tables = await this.tables(companyId);
    const role = tables.staffRoles.find((item) => item.id === roleId && item.tenderId === tenderId);
    if (!role) throw new DomainError(404, "resource_not_found");
    return this.allRecords(tables).map((record) => {
      const result = matchProfessionalToRole(record, role, role.referenceDate || bogotaToday());
      const assigned = tables.staffAssignments.filter((item) => item.professionalId === record.professional.id && item.status !== "retirado");
      if (assigned.some((item) => item.tenderId !== tenderId)) {
        result.warnings.push("Ya está propuesto en otro proceso");
      }
      return result;
    }).sort((left, right) => right.score - left.score);
  }

  async assign(actor: Actor, companyId: string, tenderId: string, roleId: string, professionalId: string) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    const role = tables.staffRoles.find((item) => item.id === roleId);
    const record = this.recordOf(tables, professionalId);
    if (!role || !record) throw new DomainError(404, "resource_not_found");
    if (record.professional.companyId !== companyId) throw new DomainError(403, "company_access_denied");
    const match = matchProfessionalToRole(record, role, role.referenceDate || bogotaToday());
    const assignment = {
      id: createPrefixedId("asg"),
      companyId,
      tenderId,
      roleId,
      professionalId,
      match,
      status: "propuesto" as const,
      resumeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor.name,
    };
    await this.save(companyId, { staffAssignments: [...tables.staffAssignments, assignment] });
    return assignment;
  }

  async generateResume(
    actor: Actor,
    companyId: string,
    tenderId: string,
    professionalId: string,
    roleId: string,
    selection: ResumeSelection,
    proposedRoleName: string,
    format: "corporativo" | "entidad" = "corporativo",
  ) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    const record = this.recordOf(tables, professionalId);
    const role = tables.staffRoles.find((item) => item.id === roleId);
    if (!record) throw new DomainError(404, "resource_not_found");
    if (record.professional.companyId !== companyId) throw new DomainError(403, "company_access_denied");
    assertOwned(record, selection);
    const education = record.education.filter((item) => selection.educationIds.includes(item.id));
    const experiences = orderExperiences(
      record.experiences.filter((item) => selection.experienceIds.includes(item.id)),
      selection.experienceOrder,
      role?.specificCriteria ?? "",
    );
    const certifications = record.certifications.filter((item) => selection.certificationIds.includes(item.id));
    const licenses = record.licenses.filter((item) => selection.licenseIds.includes(item.id));
    const warnings: string[] = [];
    if (!record.consent?.present) warnings.push("No hay autorización de presentación");
    for (const item of certifications) {
      if (item.validity === "vencida") warnings.push(`Certificación vencida: ${item.name}`);
    }
    if (role) {
      const selectedRecord = { ...record, education, experiences, certifications, licenses };
      const match = matchProfessionalToRole(selectedRecord, role, role.referenceDate || bogotaToday());
      if (match.outcome !== "cumple") warnings.push(`Con la selección actual el cumplimiento es ${match.outcome}`);
    }
    const now = new Date().toISOString();
    const configuration: ResumeConfiguration = {
      id: createPrefixedId("cfg"),
      companyId,
      tenderId,
      professionalId,
      roleId,
      proposedRoleName,
      templateId: format === "entidad" ? "entidad" : "corporativo",
      templateVersion: "1",
      format,
      outputs: ["docx"],
      selection,
      approved: false,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.name,
    };
    const bytes = buildResumeDocx({
      fullName: record.professional.fullName,
      proposedRole: proposedRoleName,
      profession: selection.includeProfession ? record.professional.profession : "",
      city: selection.includeCity ? record.professional.city : "",
      summary: selection.includeSummary ? selection.summary : "",
      education,
      experiences,
      certifications,
      licenses,
      processLabel: tenderId,
    });
    const resume: GeneratedResume = {
      id: createPrefixedId("hv"),
      companyId,
      tenderId,
      professionalId,
      roleId,
      configurationId: configuration.id,
      status: "generado",
      format,
      sharePointPath: integrationReady("graph")
        ? `Expedientes/${tenderId}/Personal/${professionalId}/DocumentosGenerados/${configuration.id}.docx`
        : null,
      hash: hashBuffer(bytes),
      warnings,
      snapshot: {
        fullName: record.professional.fullName,
        proposedRoleName,
        education,
        experiences,
        certifications,
        licenses,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: actor.name,
    };
    const job: ResumeGenerationJob = {
      id: createPrefixedId("job"),
      companyId,
      tenderId,
      status: integrationReady("graph") ? "done" : "pending_sharepoint",
      resumeIds: [resume.id],
      sharePointReady: integrationReady("graph"),
      error: integrationReady("graph") ? undefined : SHAREPOINT_PENDING,
    };
    await this.save(companyId, {
      resumeConfigs: [configuration, ...tables.resumeConfigs],
      generatedResumes: [resume, ...tables.generatedResumes],
      resumeJobs: [job, ...tables.resumeJobs],
    });
    return { resume, job, bytes, warnings, sharePoint: integrationReady("graph") ? "ready" : "pending" };
  }

  async approveResume(actor: Actor, companyId: string, id: string) {
    await this.require(actor, companyId, "workbench.approve");
    const tables = await this.tables(companyId);
    const resume = tables.generatedResumes.find((item) => item.id === id);
    if (!resume) throw new DomainError(404, "resource_not_found");
    const next = { ...resume, status: "aprobado" as const, updatedAt: new Date().toISOString() };
    await this.save(companyId, {
      generatedResumes: tables.generatedResumes.map((item) => (item.id === id ? next : item)),
    });
    return next;
  }

  async previewResume(actor: Actor, companyId: string, id: string) {
    await this.require(actor, companyId);
    const resume = (await this.tables(companyId)).generatedResumes.find((item) => item.id === id);
    if (!resume) throw new DomainError(404, "resource_not_found");
    return resume.snapshot;
  }

  async resumeVersions(actor: Actor, companyId: string, id: string) {
    await this.require(actor, companyId);
    const tables = await this.tables(companyId);
    const resume = tables.generatedResumes.find((item) => item.id === id);
    if (!resume) throw new DomainError(404, "resource_not_found");
    return tables.generatedResumes.filter(
      (item) => item.tenderId === resume.tenderId && item.professionalId === resume.professionalId && item.roleId === resume.roleId,
    );
  }

  async regenerateResume(actor: Actor, companyId: string, id: string) {
    await this.require(actor, companyId, "workbench.edit");
    const tables = await this.tables(companyId);
    const resume = tables.generatedResumes.find((item) => item.id === id);
    const configuration = tables.resumeConfigs.find((item) => item.id === resume?.configurationId);
    if (!resume || !configuration) throw new DomainError(404, "resource_not_found");
    const generated = await this.generateResume(
      actor,
      companyId,
      resume.tenderId,
      resume.professionalId,
      resume.roleId,
      configuration.selection,
      configuration.proposedRoleName,
      configuration.format,
    );
    if (resume.status === "aprobado") {
      generated.resume.warnings.push("La versión aprobada se conservó; esta regeneración es una versión nueva.");
    } else {
      await this.save(companyId, {
        generatedResumes: (await this.tables(companyId)).generatedResumes.map((item) =>
          item.id === resume.id ? { ...item, status: "obsoleto" as const } : item,
        ),
      });
    }
    return generated;
  }
}

function bogotaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function plusDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00-05:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(date);
}

function maskDoc(value: string): string {
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

function assertOwned(record: ProfessionalRecord, selection: ResumeSelection) {
  const ids = [
    ...record.education.map((item) => item.id),
    ...record.experiences.map((item) => item.id),
    ...record.certifications.map((item) => item.id),
    ...record.licenses.map((item) => item.id),
    ...record.attachments.map((item) => item.id),
  ];
  const selected = [...selection.educationIds, ...selection.experienceIds, ...selection.certificationIds, ...selection.licenseIds, ...selection.attachmentIds];
  if (selected.some((id) => !ids.includes(id))) throw new DomainError(400, "invalid_resume_selection");
}

function orderExperiences(
  items: ProfessionalRecord["experiences"],
  order: ResumeSelection["experienceOrder"],
  criteria: string,
) {
  const copy = [...items];
  if (order === "antigua") return copy.sort((a, b) => a.startedOn.localeCompare(b.startedOn));
  if (order === "relevancia") {
    const relevant = new Set(specificExperiences(copy, criteria).map((item) => item.id));
    return copy.sort((a, b) => Number(relevant.has(b.id)) - Number(relevant.has(a.id)));
  }
  if (order === "manual") return copy;
  return copy.sort((a, b) => (b.endedOn ?? "9999").localeCompare(a.endedOn ?? "9999"));
}

function matchesFilters(item: Professional, tables: WorkspaceTables, filters: ProfessionalFilters): boolean {
  const blob = [
    item.fullName,
    item.profession,
    item.primaryProfile,
    item.specialty,
    ...tables.professionalEducation.filter((row) => row.professionalId === item.id).flatMap((row) => [row.title, row.institution]),
    ...tables.professionalExperiences.filter((row) => row.professionalId === item.id).flatMap((row) => [row.client, row.project, row.role, ...row.technologies]),
    ...tables.professionalCertifications.filter((row) => row.professionalId === item.id).flatMap((row) => [row.name, row.issuer]),
  ].join(" ").toLocaleLowerCase("es-CO");
  if (filters.search && !blob.includes(filters.search.toLocaleLowerCase("es-CO"))) return false;
  if (filters.profession && !item.profession.toLocaleLowerCase("es-CO").includes(filters.profession.toLocaleLowerCase("es-CO"))) return false;
  if (filters.profile && !item.primaryProfile.toLocaleLowerCase("es-CO").includes(filters.profile.toLocaleLowerCase("es-CO"))) return false;
  if (filters.specialty && !item.specialty.toLocaleLowerCase("es-CO").includes(filters.specialty.toLocaleLowerCase("es-CO"))) return false;
  if (filters.city && item.city !== filters.city) return false;
  if (filters.availability && item.availability !== filters.availability) return false;
  if (filters.verification && item.verification !== filters.verification) return false;
  if (filters.incomplete && !item.incomplete) return false;
  if (filters.minYears && item.yearsGeneral < filters.minYears) return false;
  if (filters.certification && !blob.includes(filters.certification.toLocaleLowerCase("es-CO"))) return false;
  if (filters.issuer && !blob.includes(filters.issuer.toLocaleLowerCase("es-CO"))) return false;
  if (filters.technology && !blob.includes(filters.technology.toLocaleLowerCase("es-CO"))) return false;
  if (filters.employer && !blob.includes(filters.employer.toLocaleLowerCase("es-CO"))) return false;
  if (filters.project && !blob.includes(filters.project.toLocaleLowerCase("es-CO"))) return false;
  if (filters.education && !blob.includes(filters.education.toLocaleLowerCase("es-CO"))) return false;
  if (filters.institution && !blob.includes(filters.institution.toLocaleLowerCase("es-CO"))) return false;
  return true;
}
