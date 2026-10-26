import type {
  DuplicateAction,
  GeneratedResume,
  Professional,
  ProfessionalConsent,
  ProfessionalFilters,
  ProfessionalImportBatch,
  ProfessionalRecord,
  ResumeSelection,
  TenderProfessionalAssignment,
  TenderStaffRole,
} from "@/contracts/professional";
import { createId } from "@/lib/ids";
import { apiFetch, usesRemoteApi } from "@/lib/api";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";
import {
  bogotaToday,
  maskDocument,
  matchProfessionalToRole,
  matchesProfessionalFilters,
  mergeRanges,
  professionalIndicators,
  suggestMapping,
} from "@/features/perfiles/engine";

function recordsOf(companyId: string): ProfessionalRecord[] {
  const workspace = readWorkspace();
  return workspace.professionals
    .filter((item) => item.companyId === companyId)
    .map((professional) => ({
      professional,
      education: workspace.professionalEducation.filter((item) => item.professionalId === professional.id),
      experiences: workspace.professionalExperiences.filter((item) => item.professionalId === professional.id),
      certifications: workspace.professionalCertifications.filter((item) => item.professionalId === professional.id),
      licenses: workspace.professionalLicenses.filter((item) => item.professionalId === professional.id),
      skills: workspace.professionalSkills.filter((item) => item.professionalId === professional.id),
      attachments: workspace.professionalAttachments.filter((item) => item.professionalId === professional.id),
      consent: workspace.professionalConsents.find((item) => item.professionalId === professional.id) ?? null,
    }));
}

export const professionalsService = {
  async indicators(companyId: string) {
    if (usesRemoteApi()) return apiFetch("/professionals/indicators");
    const workspace = readWorkspace();
    return simulateLatency(professionalIndicators(recordsOf(companyId), workspace.staffAssignments.filter((item) => item.companyId === companyId)));
  },
  async list(companyId: string, filters: ProfessionalFilters = {}, page = 1, pageSize = 25) {
    if (usesRemoteApi()) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params.set(key, String(value));
      });
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return apiFetch<{ items: Professional[]; total: number }>(`/professionals?${params}`);
    }
    const all = recordsOf(companyId).map((item) => item.professional).filter((item) => matchesProfessionalFilters(item, recordsOf(companyId), filters));
    const start = (page - 1) * pageSize;
    return simulateLatency({ items: all.slice(start, start + pageSize), total: all.length, page, pageSize });
  },
  async get(companyId: string, id: string) {
    if (usesRemoteApi()) return apiFetch<ProfessionalRecord>(`/professionals/${id}`);
    const record = recordsOf(companyId).find((item) => item.professional.id === id);
    if (!record) throw new Error("Profesional no encontrado");
    return simulateLatency(record);
  },
  async save(companyId: string, input: Partial<Professional> & { documentNumber?: string }, id?: string) {
    if (usesRemoteApi()) {
      return apiFetch<Professional>(id ? `/professionals/${id}` : "/professionals", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(input),
      });
    }
    const professionalId = id ?? createId("pro");
    const givenName = input.givenName ?? "";
    const familyName = input.familyName ?? "";
    const professional: Professional = {
      id: professionalId,
      companyId,
      externalId: input.externalId || professionalId,
      givenName,
      middleName: input.middleName ?? "",
      familyName,
      fullName: [givenName, input.middleName, familyName].filter(Boolean).join(" "),
      documentType: input.documentType ?? "CC",
      documentNumberMasked: input.documentNumber ? maskDocument(input.documentNumber) : input.documentNumberMasked ?? "",
      documentCountry: input.documentCountry ?? "CO",
      profession: input.profession ?? "",
      specialty: input.specialty ?? "",
      primaryProfile: input.primaryProfile ?? input.profession ?? "",
      capableRoles: input.capableRoles ?? [],
      city: input.city ?? "",
      department: input.department ?? "",
      country: input.country ?? "CO",
      linkage: input.linkage ?? "empleado",
      availability: input.availability ?? "disponible",
      status: input.status ?? "activo",
      verification: "pendiente",
      incomplete: true,
      notes: input.notes ?? "",
      consentId: null,
      yearsGeneral: 0,
      sharePointFolder: `BancoPerfiles/${professionalId}/`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Usuario demo",
    };
    writeWorkspace((workspace) => ({
      ...workspace,
      professionals: id
        ? workspace.professionals.map((item) => (item.id === id ? { ...item, ...professional, id } : item))
        : [professional, ...workspace.professionals],
    }));
    return simulateLatency(professional);
  },
  async saveConsent(professionalId: string, input: Partial<ProfessionalConsent>) {
    if (usesRemoteApi()) return apiFetch(`/professionals/${professionalId}/consent`, { method: "POST", body: JSON.stringify(input) });
    const consent: ProfessionalConsent = {
      id: createId("cns"),
      professionalId,
      companyId: readWorkspace().professionals.find((item) => item.id === professionalId)?.companyId ?? "",
      store: input.store ?? false,
      consult: input.consult ?? false,
      present: input.present ?? false,
      shareWithEntity: input.shareWithEntity ?? false,
      legalBasis: input.legalBasis ?? "Ley 1581 de 2012",
      grantedOn: input.grantedOn ?? bogotaToday(),
      evidenceRef: input.evidenceRef ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Usuario demo",
    };
    writeWorkspace((workspace) => ({
      ...workspace,
      professionalConsents: [consent, ...workspace.professionalConsents.filter((item) => item.professionalId !== professionalId)],
    }));
    return simulateLatency(consent);
  },
  async staffRoles(tenderId: string) {
    if (usesRemoteApi()) return apiFetch<TenderStaffRole[]>(`/tenders/${tenderId}/staff-roles`);
    return simulateLatency(readWorkspace().staffRoles.filter((item) => item.tenderId === tenderId));
  },
  async saveStaffRole(tenderId: string, input: Partial<TenderStaffRole>) {
    if (usesRemoteApi()) return apiFetch(`/tenders/${tenderId}/staff-roles`, { method: "POST", body: JSON.stringify(input) });
    const role: TenderStaffRole = {
      id: createId("rol"),
      companyId: "co-andina",
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
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Usuario demo",
    };
    writeWorkspace((workspace) => ({ ...workspace, staffRoles: [...workspace.staffRoles, role] }));
    return simulateLatency(role);
  },
  async matches(companyId: string, tenderId: string, roleId: string) {
    if (usesRemoteApi()) return apiFetch(`/tenders/${tenderId}/staff-roles/${roleId}/matches`);
    const role = readWorkspace().staffRoles.find((item) => item.id === roleId);
    if (!role) return [];
    return simulateLatency(recordsOf(companyId).map((record) => matchProfessionalToRole(record, role, role.referenceDate || bogotaToday())));
  },
  async assign(tenderId: string, roleId: string, professionalId: string) {
    if (usesRemoteApi()) {
      return apiFetch(`/tenders/${tenderId}/staff-assignments`, {
        method: "POST",
        body: JSON.stringify({ roleId, professionalId }),
      });
    }
    const workspace = readWorkspace();
    const role = workspace.staffRoles.find((item) => item.id === roleId);
    const record = recordsOf(workspace.professionals.find((item) => item.id === professionalId)?.companyId ?? "").find((item) => item.professional.id === professionalId);
    if (!role || !record) throw new Error("No se pudo asignar");
    const assignment: TenderProfessionalAssignment = {
      id: createId("asg"),
      companyId: record.professional.companyId,
      tenderId,
      roleId,
      professionalId,
      match: matchProfessionalToRole(record, role, role.referenceDate || bogotaToday()),
      status: "propuesto",
      resumeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Usuario demo",
    };
    writeWorkspace((current) => ({ ...current, staffAssignments: [...current.staffAssignments, assignment] }));
    return simulateLatency(assignment);
  },
  async generateResume(tenderId: string, professionalId: string, roleId: string, selection: ResumeSelection, proposedRoleName: string, format: "corporativo" | "entidad" = "corporativo") {
    if (usesRemoteApi()) {
      return apiFetch(`/tenders/${tenderId}/resume-jobs`, {
        method: "POST",
        body: JSON.stringify({ professionalId, roleId, selection, proposedRoleName, format }),
      });
    }
    const workspace = readWorkspace();
    const record = recordsOf(workspace.professionals.find((item) => item.id === professionalId)?.companyId ?? "").find((item) => item.professional.id === professionalId);
    if (!record) throw new Error("Profesional no encontrado");
    const selectedIds = new Set([...selection.educationIds, ...selection.experienceIds, ...selection.certificationIds, ...selection.licenseIds]);
    const owned = new Set([
      ...record.education.map((item) => item.id),
      ...record.experiences.map((item) => item.id),
      ...record.certifications.map((item) => item.id),
      ...record.licenses.map((item) => item.id),
    ]);
    if ([...selectedIds].some((id) => !owned.has(id))) throw new Error("La selección no pertenece al profesional");
    const snapshotEducation = record.education.filter((item) => selection.educationIds.includes(item.id));
    const snapshotExperiences = record.experiences.filter((item) => selection.experienceIds.includes(item.id));
    const snapshotCerts = record.certifications.filter((item) => selection.certificationIds.includes(item.id));
    const warnings: string[] = [];
    if (!record.consent?.present) warnings.push("No hay autorización de presentación");
    for (const item of snapshotCerts) {
      if (item.validity === "vencida") warnings.push(`Certificación vencida: ${item.name}`);
    }
    const resume: GeneratedResume = {
      id: createId("hv"),
      companyId: record.professional.companyId,
      tenderId,
      professionalId,
      roleId,
      configurationId: createId("cfg"),
      status: "generado",
      format,
      sharePointPath: null,
      hash: null,
      warnings: [...warnings, "SharePoint no está configurado; el documento demo se descarga en el navegador."],
      snapshot: {
        fullName: record.professional.fullName,
        proposedRoleName,
        education: snapshotEducation,
        experiences: snapshotExperiences,
        certifications: snapshotCerts,
        licenses: record.licenses.filter((item) => selection.licenseIds.includes(item.id)),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Usuario demo",
    };
    writeWorkspace((current) => ({ ...current, generatedResumes: [resume, ...current.generatedResumes] }));
    return simulateLatency({ resume, warnings: resume.warnings, sharePoint: "pending", preview: renderResumeHtml(resume) });
  },
  async approve(id: string) {
    if (usesRemoteApi()) return apiFetch(`/resumes/${id}/approve`, { method: "POST" });
    writeWorkspace((workspace) => ({
      ...workspace,
      generatedResumes: workspace.generatedResumes.map((item) => (item.id === id ? { ...item, status: "aprobado" as const } : item)),
    }));
    return simulateLatency(readWorkspace().generatedResumes.find((item) => item.id === id));
  },
  async template() {
    if (usesRemoteApi()) return apiFetch<{ fileName: string; contentBase64: string }>("/professionals/import-template");
    const { buildImportTemplate } = await import("@/features/perfiles/template");
    const bytes = await buildImportTemplate();
    return { fileName: "tenderops-banco-perfiles.xlsx", contentBase64: bytes };
  },
  async startImport(fileName: string, contentBase64: string, mapping?: Record<string, string>) {
    if (usesRemoteApi()) {
      return apiFetch<ProfessionalImportBatch>("/professionals/imports", {
        method: "POST",
        body: JSON.stringify({ fileName, contentBase64, mapping }),
      });
    }
    const { analyzeWorkbook } = await import("@/features/perfiles/template");
    const parsed = await analyzeWorkbook(contentBase64, mapping);
    const batch: ProfessionalImportBatch = {
      id: createId("imp"),
      companyId: "co-andina",
      fileName,
      status: "validado",
      mapping: parsed.mapping,
      mappingProfileId: null,
      stats: parsed.stats,
      preview: parsed.preview,
      issues: parsed.issues,
      policy: "partial",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Usuario demo",
    };
    writeWorkspace((workspace) => ({
      ...workspace,
      professionalImports: [batch, ...workspace.professionalImports],
    }));
    sessionStorage.setItem(`import:${batch.id}`, JSON.stringify(parsed.drafts));
    return simulateLatency(batch);
  },
  async mapImport(id: string, mapping: Record<string, string>) {
    if (usesRemoteApi()) return apiFetch(`/professionals/imports/${id}/mapping`, { method: "PATCH", body: JSON.stringify({ mapping }) });
    const batch = readWorkspace().professionalImports.find((item) => item.id === id);
    if (!batch) throw new Error("Importación no encontrada");
    return simulateLatency({ ...batch, mapping, status: "mapeado" as const });
  },
  async commitImport(id: string, duplicateAction: DuplicateAction = "actualizar") {
    if (usesRemoteApi()) return apiFetch(`/professionals/imports/${id}/commit`, { method: "POST", body: JSON.stringify({ duplicateAction }) });
    const raw = sessionStorage.getItem(`import:${id}`);
    const drafts = raw
      ? (JSON.parse(raw) as {
          professional: Professional;
          education: import("@/contracts/professional").ProfessionalEducation[];
          experiences: import("@/contracts/professional").ProfessionalExperience[];
          certifications: import("@/contracts/professional").ProfessionalCertification[];
        }[])
      : [];
    writeWorkspace((workspace) => {
      const existingIds = new Set(workspace.professionals.map((item) => item.externalId));
      const incoming = drafts.filter((item) => duplicateAction !== "omitir" || !existingIds.has(item.professional.externalId));
      const incomingPeople = incoming.map((item) => item.professional);
      const skip = new Set(incomingPeople.map((item) => item.externalId));
      return {
        ...workspace,
        professionals: [
          ...workspace.professionals.filter((item) => duplicateAction === "conservar" || !skip.has(item.externalId)),
          ...incomingPeople,
        ],
        professionalEducation: [
          ...workspace.professionalEducation.filter((item) => !incoming.some((row) => row.professional.id === item.professionalId)),
          ...incoming.flatMap((item) => item.education),
        ],
        professionalExperiences: [
          ...workspace.professionalExperiences.filter((item) => !incoming.some((row) => row.professional.id === item.professionalId)),
          ...incoming.flatMap((item) => item.experiences),
        ],
        professionalCertifications: [
          ...workspace.professionalCertifications.filter((item) => !incoming.some((row) => row.professional.id === item.professionalId)),
          ...incoming.flatMap((item) => item.certifications),
        ],
        professionalImports: workspace.professionalImports.map((item) =>
          item.id === id ? { ...item, status: "confirmado" as const, stats: { ...item.stats, created: incoming.length } } : item,
        ),
      };
    });
    return simulateLatency(readWorkspace().professionalImports.find((item) => item.id === id));
  },
  suggestMapping,
  yearsOf(experiences: { startedOn: string; endedOn: string | null }[]) {
    return Math.round(mergeRanges(experiences.map((item) => ({ start: item.startedOn, end: item.endedOn })), bogotaToday()).months / 12);
  },
};

export function renderResumeHtml(resume: GeneratedResume): string {
  const experiences = resume.snapshot.experiences
    .map((item) => `<li><strong>${item.role}</strong> · ${item.project} (${item.startedOn} – ${item.endedOn ?? "actual"})<br/>${item.functions}</li>`)
    .join("");
  const education = resume.snapshot.education.map((item) => `<li>${item.title} · ${item.institution}</li>`).join("");
  const certs = resume.snapshot.certifications
    .map((item) => `<li>${item.name} · ${item.issuer} · ${item.validity === "vencida" ? "VENCIDA" : item.validity}</li>`)
    .join("");
  return `<article><h1>${resume.snapshot.fullName}</h1><h2>${resume.snapshot.proposedRoleName}</h2><h3>Estudios</h3><ul>${education}</ul><h3>Experiencia</h3><ul>${experiences}</ul><h3>Certificaciones</h3><ul>${certs}</ul></article>`;
}

export function downloadHtmlAsDoc(fileName: string, html: string) {
  const blob = new Blob(
    [`<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body>${html}</body></html>`],
    { type: "application/msword" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
