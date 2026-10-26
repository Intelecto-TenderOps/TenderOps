import type {
  MatchOutcome,
  MatchResult,
  Professional,
  ProfessionalExperience,
  ProfessionalFilters,
  ProfessionalIndicators,
  ProfessionalRecord,
  TenderStaffRole,
} from "@/contracts/professional";

export interface DateRange {
  start: string;
  end: string | null;
}

function parseMonth(value: string): number {
  const key = value.slice(0, 7);
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return Number.NaN;
  return year * 12 + (month - 1);
}

export function monthsBetween(start: string, end: string): number {
  const from = parseMonth(start);
  const to = parseMonth(end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return to - from + 1;
}

export function mergeRanges(ranges: DateRange[], today: string): { months: number; periods: { start: string; end: string }[] } {
  const normalized = ranges
    .map((range) => {
      const start = range.start.slice(0, 10);
      const end = (range.end ?? today).slice(0, 10);
      return { start, end, from: parseMonth(start), to: parseMonth(end) };
    })
    .filter((range) => Number.isFinite(range.from) && Number.isFinite(range.to) && range.to >= range.from)
    .sort((left, right) => left.from - right.from);

  const merged: { start: string; end: string; from: number; to: number }[] = [];
  for (const range of normalized) {
    const last = merged[merged.length - 1];
    if (!last || range.from > last.to + 1) {
      merged.push({ start: range.start, end: range.end, from: range.from, to: range.to });
      continue;
    }
    if (range.to > last.to) {
      last.to = range.to;
      last.end = range.end;
    }
  }
  return {
    months: merged.reduce((sum, item) => sum + (item.to - item.from + 1), 0),
    periods: merged.map((item) => ({ start: item.start, end: item.end })),
  };
}

export function bogotaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase("es-CO").includes(needle.trim().toLocaleLowerCase("es-CO"));
}

export function specificExperiences(experiences: ProfessionalExperience[], criteria: string): ProfessionalExperience[] {
  const phrase = criteria.trim();
  if (!phrase) return [];
  const tokens = phrase
    .split(/[\s;,/]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);
  return experiences.filter((item) => {
    const blob = [item.role, item.project, item.functions, item.sector, item.contractObject, ...item.technologies, ...item.activities].join(" ");
    return includesText(blob, phrase) || tokens.some((token) => includesText(blob, token));
  });
}

function educationRank(level: string): number {
  return ["bachiller", "tecnico", "tecnologo", "profesional", "especializacion", "maestria", "doctorado"].indexOf(level);
}

export function matchProfessionalToRole(record: ProfessionalRecord, role: TenderStaffRole, today: string): MatchResult {
  const reasons: string[] = [];
  const evidence: MatchResult["evidence"] = [];
  const missingSupports: string[] = [];
  const warnings: string[] = [];
  const outcomes: MatchOutcome[] = [];
  if (role.acceptedProfessions.length) {
    const ok = role.acceptedProfessions.some((item) => includesText(record.professional.profession, item));
    outcomes.push(ok ? "cumple" : "no_cumple");
    reasons.push(ok ? `Profesión ${record.professional.profession} aceptada` : `Profesión no aceptada para ${role.name}`);
  }
  if (role.educationLevel) {
    const best = record.education.reduce((rank, item) => Math.max(rank, educationRank(item.level)), -1);
    const needed = educationRank(role.educationLevel);
    const verified = record.education.some((item) => educationRank(item.level) >= needed && item.verification === "verificado");
    if (best < needed) {
      outcomes.push("no_cumple");
      reasons.push(`Nivel académico insuficiente frente a ${role.educationLevel}`);
    } else if (!verified) {
      outcomes.push("pendiente_validar");
      reasons.push("El nivel académico existe pero no está verificado");
      missingSupports.push("estudio");
    } else {
      outcomes.push("cumple");
    }
  }
  const general = mergeRanges(record.experiences.map((item) => ({ start: item.startedOn, end: item.endedOn })), today);
  if (role.generalMonths > 0) {
    const verifiedMonths = mergeRanges(
      record.experiences.filter((item) => item.verification === "verificado").map((item) => ({ start: item.startedOn, end: item.endedOn })),
      today,
    ).months;
    if (verifiedMonths >= role.generalMonths) outcomes.push("cumple");
    else if (general.months >= role.generalMonths) {
      outcomes.push("pendiente_validar");
      missingSupports.push("experiencia_general");
      reasons.push(`Hay ${general.months} meses generales, pero solo ${verifiedMonths} están verificados`);
    } else {
      outcomes.push("no_cumple");
      reasons.push(`Experiencia general ${general.months} meses < ${role.generalMonths} exigidos`);
    }
  }
  const specific = specificExperiences(record.experiences, role.specificCriteria);
  const specificMerged = mergeRanges(specific.map((item) => ({ start: item.startedOn, end: item.endedOn })), today);
  if (role.specificMonths > 0) {
    const verifiedSpecific = specific.filter((item) => item.verification === "verificado" && item.supportRef);
    const verifiedMonths = mergeRanges(verifiedSpecific.map((item) => ({ start: item.startedOn, end: item.endedOn })), today).months;
    if (verifiedMonths >= role.specificMonths) {
      outcomes.push("cumple");
      reasons.push(`Experiencia específica verificada: ${verifiedMonths} meses`);
    } else if (specificMerged.months >= role.specificMonths) {
      outcomes.push("pendiente_validar");
      missingSupports.push("experiencia_especifica");
      reasons.push(`La experiencia específica alcanza ${specificMerged.months} meses, pero faltan soportes verificados`);
    } else if (specificMerged.months > 0) {
      outcomes.push("cumple_parcial");
      reasons.push(`Experiencia específica ${specificMerged.months} meses de ${role.specificMonths} exigidos`);
    } else {
      outcomes.push("no_cumple");
      reasons.push("No hay experiencia específica acreditable para el criterio del pliego");
    }
  }
  for (const required of role.certifications) {
    const hit = record.certifications.find((item) => includesText(item.name, required) || includesText(item.category, required));
    if (!hit) {
      outcomes.push("no_cumple");
      reasons.push(`Sin certificación ${required}`);
    } else if (hit.validity === "vencida" || hit.verification !== "verificado") {
      outcomes.push("pendiente_validar");
      reasons.push(`${hit.name} no puede presentarse como vigente`);
      missingSupports.push(required);
    } else {
      outcomes.push("cumple");
      evidence.push({ kind: "certificacion", recordId: hit.id, label: hit.name, note: hit.issuer });
    }
  }
  if (!record.consent?.present) warnings.push("Falta autorización para presentar la hoja de vida");
  if (record.professional.availability === "no_disponible") warnings.push("El profesional está marcado como no disponible");
  const outcome: MatchOutcome = !outcomes.length
    ? "pendiente_validar"
    : outcomes.includes("no_cumple")
      ? "no_cumple"
      : outcomes.includes("pendiente_validar")
        ? "pendiente_validar"
        : outcomes.includes("cumple_parcial")
          ? "cumple_parcial"
          : "cumple";
  return {
    professionalId: record.professional.id,
    roleId: role.id,
    outcome,
    score: Math.round((outcomes.filter((item) => item === "cumple").length / Math.max(outcomes.length, 1)) * 100),
    reasons,
    evidence,
    generalMonths: general.months,
    specificMonths: specificMerged.months,
    missingSupports,
    warnings,
  };
}

export const HEADER_ALIASES: Record<string, string> = {
  "id externo": "externalId",
  "id externo profesional": "externalId",
  "id estudio": "recordExternalId",
  "id experiencia": "recordExternalId",
  "id certificación": "recordExternalId",
  "id certificacion": "recordExternalId",
  nombres: "givenName",
  "nombre completo": "fullName",
  apellidos: "familyName",
  "tipo de documento": "documentType",
  "número de documento": "documentNumber",
  "numero de documento": "documentNumber",
  profesión: "profession",
  profesion: "profession",
  especialidad: "specialty",
  "perfil principal": "primaryProfile",
  ciudad: "city",
  departamento: "department",
  correo: "email",
  teléfono: "phone",
  telefono: "phone",
  "tipo de vinculación": "linkage",
  disponibilidad: "availability",
  estado: "status",
  nivel: "level",
  título: "title",
  titulo: "title",
  institución: "institution",
  institucion: "institution",
  "fecha de grado": "graduatedOn",
  "referencia soporte": "supportRef",
  empresa: "client",
  proyecto: "project",
  cargo: "role",
  "fecha inicio": "startedOn",
  "fecha fin": "endedOn",
  funciones: "functions",
  tecnologías: "technologies",
  tecnologias: "technologies",
  nombre: "name",
  emisor: "issuer",
  código: "credentialCode",
  codigo: "credentialCode",
  "fecha expedición": "issuedOn",
  "fecha expedicion": "issuedOn",
  "fecha vencimiento": "expiresOn",
  categoría: "category",
  categoria: "category",
  competencia: "name",
  tipo: "kind",
  entidad: "issuer",
  número: "number",
  numero: "number",
};

export function suggestMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const alias = HEADER_ALIASES[header.trim().toLocaleLowerCase("es-CO").replace(/\s+/g, " ")];
    if (alias) mapping[header] = alias;
  }
  return mapping;
}

export function matchesProfessionalFilters(
  item: Professional,
  records: ProfessionalRecord[],
  filters: ProfessionalFilters,
): boolean {
  const record = records.find((row) => row.professional.id === item.id);
  const blob = [
    item.fullName,
    item.profession,
    item.primaryProfile,
    item.specialty,
    ...(record?.education.flatMap((row) => [row.title, row.institution]) ?? []),
    ...(record?.experiences.flatMap((row) => [row.client, row.project, row.role, ...row.technologies]) ?? []),
    ...(record?.certifications.flatMap((row) => [row.name, row.issuer]) ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase("es-CO");
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
  if (filters.technology && !blob.includes(filters.technology.toLocaleLowerCase("es-CO"))) return false;
  if (filters.employer && !blob.includes(filters.employer.toLocaleLowerCase("es-CO"))) return false;
  return true;
}

export function professionalIndicators(records: ProfessionalRecord[], assignments: { professionalId: string }[]): ProfessionalIndicators {
  const today = bogotaToday();
  const soon = records.flatMap((item) => item.certifications).filter((item) => item.expiresOn && item.expiresOn >= today && item.expiresOn <= `${today.slice(0, 4)}-12-31`);
  return {
    total: records.length,
    active: records.filter((item) => item.professional.status === "activo").length,
    available: records.filter((item) => item.professional.availability === "disponible").length,
    incomplete: records.filter((item) => item.professional.incomplete).length,
    expiringCertifications: soon.length,
    proposed: new Set(assignments.map((item) => item.professionalId)).size,
    pendingDocuments: records.flatMap((item) => item.experiences).filter((item) => !item.supportRef).length,
  };
}

export function maskDocument(value: string): string {
  const digits = value.replace(/\s+/g, "");
  if (digits.length <= 4) return "****";
  return `****${digits.slice(-4)}`;
}
