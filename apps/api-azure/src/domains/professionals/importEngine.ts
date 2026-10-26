import type {
  DuplicateAction,
  ImportIssue,
  ImportPreviewRow,
  ProfessionalCertification,
  ProfessionalEducation,
  ProfessionalExperience,
  ProfessionalLicense,
  ProfessionalRecord,
  ProfessionalSkill,
} from "../../contracts/professional.js";
import { createPrefixedId } from "../../shared/ids.js";
import { fullName, identityHash, maskEmail, maskPhone } from "./pii.js";
import { mergeRanges, monthsBetween } from "./overlap.js";
import { rowObject, sheetByName, suggestMapping, type SheetTable } from "./sheets.js";

export interface ParsedImport {
  mapping: Record<string, string>;
  records: DraftRecord[];
  issues: ImportIssue[];
  preview: ImportPreviewRow[];
  stats: {
    rows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    education: number;
    experiences: number;
    certifications: number;
    duplicates: number;
  };
}

export interface DraftRecord {
  externalId: string;
  identityKey: string;
  professional: Record<string, string>;
  education: Record<string, string>[];
  experiences: Record<string, string>[];
  certifications: Record<string, string>[];
  skills: Record<string, string>[];
  licenses: Record<string, string>[];
  existingId: string | null;
  action: ImportPreviewRow["action"];
}

function issue(
  batchId: string,
  sheet: string,
  row: number,
  field: string,
  value: string,
  error: string,
  action: string,
  severity: ImportIssue["severity"] = "error",
): ImportIssue {
  return { id: createPrefixedId("iss"), batchId, sheet, row, field, value, error, action, severity };
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function cell(data: Record<string, string>, key: string, fallback = ""): string {
  return data[key] ?? fallback;
}

export function analyzeImport(
  companyId: string,
  batchId: string,
  sheets: SheetTable[],
  existing: ProfessionalRecord[],
  mappingOverride?: Record<string, string>,
  duplicateAction: DuplicateAction = "revisar",
): ParsedImport {
  const professionalsSheet = sheetByName(sheets, "Profesionales") ?? sheets[0];
  if (!professionalsSheet) {
    return emptyResult(suggestMapping([]));
  }
  const mapping = { ...suggestMapping(professionalsSheet.headers), ...mappingOverride };
  const byExternal = new Map(existing.map((item) => [item.professional.externalId, item]));
  const byHash = new Map(
    existing
      .filter((item) => item.professional.externalId)
      .map((item) => [item.professional.id, item]),
  );

  const grouped = new Map<string, DraftRecord>();
  const issues: ImportIssue[] = [];
  let rowNumber = 1;
  for (const row of professionalsSheet.rows) {
    rowNumber += 1;
    if (row.every((cell) => !cell.trim())) continue;
    const data = rowObject(professionalsSheet.headers, row, mapping);
    const externalId = data.externalId || data.fullName || `row-${rowNumber}`;
    if (!data.givenName && data.fullName) {
      const parts = data.fullName.split(" ");
      data.familyName = data.familyName || parts.slice(-1).join(" ");
      data.givenName = parts.slice(0, -1).join(" ") || data.fullName;
    }
    if (!data.givenName || !data.familyName) {
      issues.push(issue(batchId, professionalsSheet.name, rowNumber, "nombre", data.fullName ?? "", "Nombres y apellidos son obligatorios", "Completar la fila"));
      continue;
    }
    const identityKey = data.documentNumber
      ? identityHash(companyId, data.documentType || "CC", data.documentNumber)
      : `ext:${externalId}`;
    const match = byExternal.get(externalId) ?? [...byHash.values()].find((item) => item.professional.externalId === externalId);
    const action: ImportPreviewRow["action"] =
      match && duplicateAction === "omitir"
        ? "omitir"
        : match && duplicateAction === "actualizar"
          ? "actualizar"
          : match
            ? "revisar"
            : "crear";
    grouped.set(externalId, {
      externalId,
      identityKey,
      professional: data,
      education: [],
      experiences: [],
      certifications: [],
      skills: [],
      licenses: [],
      existingId: match?.professional.id ?? null,
      action,
    });
  }

  collect(sheets, "Formación", grouped, "education", issues, batchId, ["title", "level"]);
  collect(sheets, "Experiencias", grouped, "experiences", issues, batchId, ["client", "role", "startedOn"]);
  collect(sheets, "Certificaciones", grouped, "certifications", issues, batchId, ["name"]);
  collect(sheets, "Competencias", grouped, "skills", issues, batchId, ["name"]);
  collect(sheets, "Acreditaciones", grouped, "licenses", issues, batchId, ["kind", "issuer"]);

  const records = [...grouped.values()];
  const preview: ImportPreviewRow[] = records.map((item) => ({
    externalId: item.externalId,
    fullName: fullName(item.professional.givenName ?? "", item.professional.middleName ?? "", item.professional.familyName ?? ""),
    action: item.action,
    existingId: item.existingId,
    education: item.education.length,
    experiences: item.experiences.length,
    certifications: item.certifications.length,
    issues: issues.filter((entry) => entry.value.includes(item.externalId) || entry.row === 0).length,
  }));

  return {
    mapping,
    records,
    issues,
    preview,
    stats: {
      rows: records.length,
      created: records.filter((item) => item.action === "crear").length,
      updated: records.filter((item) => item.action === "actualizar").length,
      skipped: records.filter((item) => item.action === "omitir").length,
      errors: issues.filter((item) => item.severity === "error").length,
      education: records.reduce((sum, item) => sum + item.education.length, 0),
      experiences: records.reduce((sum, item) => sum + item.experiences.length, 0),
      certifications: records.reduce((sum, item) => sum + item.certifications.length, 0),
      duplicates: records.filter((item) => item.existingId).length,
    },
  };
}

function collect(
  sheets: SheetTable[],
  name: string,
  grouped: Map<string, DraftRecord>,
  key: "education" | "experiences" | "certifications" | "skills" | "licenses",
  issues: ImportIssue[],
  batchId: string,
  required: string[],
) {
  const sheet = sheetByName(sheets, name);
  if (!sheet) return;
  const mapping = suggestMapping(sheet.headers);
  let rowNumber = 1;
  for (const row of sheet.rows) {
    rowNumber += 1;
    if (row.every((cell) => !cell.trim())) continue;
    const data = rowObject(sheet.headers, row, mapping);
    const parent = grouped.get(cell(data, "externalId"));
    if (!parent) {
      issues.push(issue(batchId, name, rowNumber, "externalId", data.externalId ?? "", "No hay profesional con ese ID externo", "Alinear identificadores"));
      continue;
    }
    const missing = required.filter((field) => !data[field]);
    if (missing.length) {
      issues.push(issue(batchId, name, rowNumber, missing[0]!, JSON.stringify(data), `Falta ${missing.join(", ")}`, "Completar campos obligatorios"));
      continue;
    }
    parent[key].push(data);
  }
}

function emptyResult(mapping: Record<string, string>): ParsedImport {
  return {
    mapping,
    records: [],
    issues: [],
    preview: [],
    stats: { rows: 0, created: 0, updated: 0, skipped: 0, errors: 0, education: 0, experiences: 0, certifications: 0, duplicates: 0 },
  };
}

export function materializeDraft(
  companyId: string,
  actorName: string,
  draft: DraftRecord,
  existing: ProfessionalRecord | null,
  now = new Date().toISOString(),
): ProfessionalRecord {
  const professionalId = existing?.professional.id ?? createPrefixedId("pro");
  const name = fullName(cell(draft.professional, "givenName"), cell(draft.professional, "middleName"), cell(draft.professional, "familyName"));
  const education: ProfessionalEducation[] = draft.education.map((item) => ({
    id: createPrefixedId("edu"),
    professionalId,
    companyId,
    externalId: cell(item, "recordExternalId", cell(item, "title")),
    level: (cell(item, "level", "profesional") as ProfessionalEducation["level"]) || "profesional",
    title: cell(item, "title"),
    institution: cell(item, "institution"),
    country: cell(item, "country", "CO"),
    startedOn: cell(item, "startedOn") || null,
    graduatedOn: cell(item, "graduatedOn") || null,
    status: (cell(item, "status", "graduado") as ProfessionalEducation["status"]) || "graduado",
    supportRef: cell(item, "supportRef") || null,
    verification: cell(item, "supportRef") ? "pendiente" : "incompleto",
    createdAt: now,
    updatedAt: now,
    createdBy: actorName,
  }));
  const experiences: ProfessionalExperience[] = draft.experiences.map((item) => {
    const startedOn = cell(item, "startedOn");
    const endedOn = cell(item, "endedOn") || null;
    return {
      id: createPrefixedId("exp"),
      professionalId,
      companyId,
      externalId: cell(item, "recordExternalId", `${cell(item, "client")}-${cell(item, "role")}`),
      client: cell(item, "client"),
      employer: cell(item, "employer", cell(item, "client")),
      project: cell(item, "project", cell(item, "client")),
      role: cell(item, "role"),
      startedOn,
      endedOn,
      current: !endedOn,
      functions: cell(item, "functions"),
      activities: cell(item, "activities").split(";").map((value) => value.trim()).filter(Boolean),
      technologies: cell(item, "technologies").split(";").map((value) => value.trim()).filter(Boolean),
      sector: cell(item, "sector"),
      projectType: cell(item, "projectType"),
      contractObject: cell(item, "contractObject"),
      supportRef: cell(item, "supportRef") || null,
      verification: cell(item, "supportRef") ? "pendiente" : "incompleto",
      monthsVerified: monthsBetween(startedOn, endedOn || today()),
      createdAt: now,
      updatedAt: now,
      createdBy: actorName,
    };
  });
  const certifications: ProfessionalCertification[] = draft.certifications.map((item) => {
    const expiresOn = cell(item, "expiresOn") || null;
    const validity: ProfessionalCertification["validity"] = !expiresOn
      ? "sin_fecha"
      : expiresOn < today()
        ? "vencida"
        : "vigente";
    return {
      id: createPrefixedId("cer"),
      professionalId,
      companyId,
      externalId: cell(item, "recordExternalId", cell(item, "name")),
      name: cell(item, "name"),
      issuer: cell(item, "issuer"),
      credentialCode: cell(item, "credentialCode"),
      issuedOn: cell(item, "issuedOn") || null,
      expiresOn,
      verificationUrl: cell(item, "verificationUrl") || null,
      category: cell(item, "category"),
      supportRef: cell(item, "supportRef") || null,
      validity,
      verification: cell(item, "supportRef") ? "pendiente" : "incompleto",
      createdAt: now,
      updatedAt: now,
      createdBy: actorName,
    };
  });
  const licenses: ProfessionalLicense[] = draft.licenses.map((item) => ({
    id: createPrefixedId("lic"),
    professionalId,
    companyId,
    externalId: cell(item, "recordExternalId", cell(item, "number", cell(item, "kind"))),
    kind: (cell(item, "kind", "matricula") as ProfessionalLicense["kind"]) || "matricula",
    issuer: cell(item, "issuer"),
    number: cell(item, "number"),
    profession: cell(item, "profession", cell(draft.professional, "profession")),
    issuedOn: cell(item, "issuedOn") || null,
    status: cell(item, "supportRef") ? "pendiente" : "sin_confirmar",
    supportRef: cell(item, "supportRef") || null,
    verification: "pendiente",
    createdAt: now,
    updatedAt: now,
    createdBy: actorName,
  }));
  const skills: ProfessionalSkill[] = draft.skills.map((item) => ({
    id: createPrefixedId("skl"),
    professionalId,
    companyId,
    name: cell(item, "name"),
    category: cell(item, "category"),
    level: (cell(item, "level", "intermedio") as ProfessionalSkill["level"]) || "intermedio",
  }));

  return {
    professional: {
      id: professionalId,
      companyId,
      externalId: draft.externalId,
      givenName: cell(draft.professional, "givenName"),
      middleName: cell(draft.professional, "middleName"),
      familyName: cell(draft.professional, "familyName"),
      fullName: name,
      documentType: draft.professional.documentType || "CC",
      documentNumberMasked: maskLater(draft.professional.documentNumber),
      documentCountry: draft.professional.documentCountry || "CO",
      profession: draft.professional.profession ?? "",
      specialty: draft.professional.specialty ?? "",
      primaryProfile: draft.professional.primaryProfile ?? draft.professional.profession ?? "",
      capableRoles: (draft.professional.capableRoles ?? "").split(";").map((item) => item.trim()).filter(Boolean),
      city: draft.professional.city ?? "",
      department: draft.professional.department ?? "",
      country: "CO",
      linkage: (draft.professional.linkage as ProfessionalRecord["professional"]["linkage"]) || "empleado",
      availability: (draft.professional.availability as ProfessionalRecord["professional"]["availability"]) || "disponible",
      status: (draft.professional.status as ProfessionalRecord["professional"]["status"]) || "activo",
      verification: "pendiente",
      incomplete: !education.length || experiences.some((item) => !item.supportRef),
      notes: "",
      consentId: existing?.consent?.id ?? null,
      yearsGeneral: Math.round(mergeRanges(experiences.map((item) => ({ start: item.startedOn, end: item.endedOn })), today()).months / 12),
      sharePointFolder: `BancoPerfiles/${professionalId}/`,
      emailMasked: draft.professional.email ? maskEmail(draft.professional.email) : existing?.professional.emailMasked,
      phoneMasked: draft.professional.phone ? maskPhone(draft.professional.phone) : existing?.professional.phoneMasked,
      createdAt: existing?.professional.createdAt ?? now,
      updatedAt: now,
      createdBy: existing?.professional.createdBy ?? actorName,
    },
    education: mergeVerified(existing?.education ?? [], education),
    experiences: mergeVerified(existing?.experiences ?? [], experiences),
    certifications: mergeVerified(existing?.certifications ?? [], certifications),
    licenses: mergeVerified(existing?.licenses ?? [], licenses),
    skills,
    attachments: existing?.attachments ?? [],
    consent: existing?.consent ?? null,
  };
}

function maskLater(value?: string): string {
  if (!value) return "";
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

function mergeVerified<T extends { externalId: string; verification: string }>(current: T[], incoming: T[]): T[] {
  const kept = current.filter((item) => item.verification === "verificado");
  const keptIds = new Set(kept.map((item) => item.externalId));
  return [...kept, ...incoming.filter((item) => !keptIds.has(item.externalId))];
}
