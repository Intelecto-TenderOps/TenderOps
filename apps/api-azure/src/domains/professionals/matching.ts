import type {
  MatchOutcome,
  MatchResult,
  ProfessionalCertification,
  ProfessionalEducation,
  ProfessionalExperience,
  ProfessionalLicense,
  ProfessionalRecord,
  TenderStaffRole,
} from "../../contracts/professional.js";
import { mergeRanges } from "./overlap.js";

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase("es-CO").includes(needle.trim().toLocaleLowerCase("es-CO"));
}

function educationRank(level: string): number {
  const order = ["bachiller", "tecnico", "tecnologo", "profesional", "especializacion", "maestria", "doctorado"];
  return order.indexOf(level);
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

export function experienceMonths(experiences: ProfessionalExperience[], today: string, afterDate?: string | null) {
  const ranges = experiences
    .filter((item) => !afterDate || item.startedOn >= afterDate || (item.endedOn ?? today) >= afterDate)
    .map((item) => ({
      start: afterDate && item.startedOn < afterDate ? afterDate : item.startedOn,
      end: item.endedOn,
    }));
  return mergeRanges(ranges, today);
}

function certificationMatches(item: ProfessionalCertification, required: string, today: string) {
  const nameHit = includesText(item.name, required) || includesText(item.category, required);
  if (!nameHit) return null;
  if (item.verification !== "verificado") return { ok: false, reason: `${item.name} pendiente de validar` };
  if (item.expiresOn && item.expiresOn < today) return { ok: false, reason: `${item.name} vencida` };
  if (item.validity === "vencida") return { ok: false, reason: `${item.name} marcada vencida` };
  return { ok: true, reason: `${item.name} vigente` };
}

export function matchProfessionalToRole(
  record: ProfessionalRecord,
  role: TenderStaffRole,
  today: string,
): MatchResult {
  const reasons: string[] = [];
  const evidence: MatchResult["evidence"] = [];
  const missingSupports: string[] = [];
  const warnings: string[] = [];
  const outcomes: MatchOutcome[] = [];

  if (role.acceptedProfessions.length) {
    const ok = role.acceptedProfessions.some((item) => includesText(record.professional.profession, item));
    outcomes.push(ok ? "cumple" : "no_cumple");
    reasons.push(ok ? `Profesión ${record.professional.profession} aceptada` : `Profesión ${record.professional.profession} no está en ${role.acceptedProfessions.join(", ")}`);
  }

  if (role.educationLevel) {
    const best = record.education.reduce((rank, item) => Math.max(rank, educationRank(item.level)), -1);
    const needed = educationRank(role.educationLevel);
    const verified = record.education.some((item) => educationRank(item.level) >= needed && item.verification === "verificado");
    const present = best >= needed;
    if (!present) {
      outcomes.push("no_cumple");
      reasons.push(`Nivel académico insuficiente frente a ${role.educationLevel}`);
    } else if (!verified) {
      outcomes.push("pendiente_validar");
      reasons.push("El nivel académico existe pero no está verificado");
      missingSupports.push("estudio");
    } else {
      outcomes.push("cumple");
      const study = record.education.find((item) => educationRank(item.level) >= needed);
      if (study) evidence.push({ kind: "estudio", recordId: study.id, label: study.title, note: study.institution });
    }
  }

  const general = experienceMonths(record.experiences, today);
  if (role.generalMonths > 0) {
    const verified = record.experiences.filter((item) => item.verification === "verificado");
    const verifiedMonths = experienceMonths(verified, today).months;
    if (verifiedMonths >= role.generalMonths) {
      outcomes.push("cumple");
      reasons.push(`Experiencia general verificada: ${verifiedMonths} meses`);
    } else if (general.months >= role.generalMonths) {
      outcomes.push("pendiente_validar");
      reasons.push(`Hay ${general.months} meses generales, pero solo ${verifiedMonths} están verificados`);
      missingSupports.push("experiencia_general");
    } else {
      outcomes.push("no_cumple");
      reasons.push(`Experiencia general ${general.months} meses < ${role.generalMonths} exigidos`);
    }
  }

  const specific = specificExperiences(record.experiences, role.specificCriteria);
  const specificMerged = experienceMonths(specific, today);
  if (role.specificMonths > 0) {
    const verifiedSpecific = specific.filter((item) => item.verification === "verificado" && item.supportRef);
    const verifiedMonths = experienceMonths(verifiedSpecific, today).months;
    if (verifiedMonths >= role.specificMonths) {
      outcomes.push("cumple");
      reasons.push(`Experiencia específica verificada: ${verifiedMonths} meses`);
      for (const item of verifiedSpecific) {
        evidence.push({ kind: "experiencia", recordId: item.id, label: `${item.role} · ${item.project}`, months: item.monthsVerified, note: item.client });
      }
    } else if (specificMerged.months >= role.specificMonths) {
      outcomes.push("pendiente_validar");
      reasons.push(`La experiencia específica alcanza ${specificMerged.months} meses, pero faltan soportes verificados`);
      missingSupports.push("experiencia_especifica");
    } else if (specificMerged.months > 0) {
      outcomes.push("cumple_parcial");
      reasons.push(`Experiencia específica ${specificMerged.months} meses de ${role.specificMonths} exigidos`);
    } else {
      outcomes.push("no_cumple");
      reasons.push("No hay experiencia específica acreditable para el criterio del pliego");
    }
  }

  for (const required of role.certifications) {
    const hits = record.certifications.map((item) => ({ item, result: certificationMatches(item, required, today) })).filter((row) => row.result);
    if (!hits.length) {
      outcomes.push("no_cumple");
      reasons.push(`Sin certificación ${required}`);
      continue;
    }
    const ok = hits.find((row) => row.result?.ok);
    if (ok?.item) {
      outcomes.push("cumple");
      evidence.push({ kind: "certificacion", recordId: ok.item.id, label: ok.item.name, note: ok.item.issuer });
    } else {
      outcomes.push("pendiente_validar");
      reasons.push(hits[0]?.result?.reason ?? `Certificación ${required} no verificada`);
      missingSupports.push(required);
    }
  }

  if (role.licenseRequired) {
    const license = record.licenses.find((item: ProfessionalLicense) => item.verification === "verificado" && item.status === "vigente");
    if (license) {
      outcomes.push("cumple");
      evidence.push({ kind: "matricula", recordId: license.id, label: license.number, note: license.issuer });
    } else if (record.licenses.length) {
      outcomes.push("pendiente_validar");
      reasons.push("Hay matrícula/tarjeta pero no está confirmada como vigente");
      missingSupports.push("matricula");
    } else {
      outcomes.push("no_cumple");
      reasons.push("No hay matrícula o tarjeta profesional");
    }
  }

  if (!record.consent?.present) {
    warnings.push("Falta autorización para presentar la hoja de vida");
  }
  if (record.professional.availability === "no_disponible") {
    warnings.push("El profesional está marcado como no disponible");
  }

  const outcome = reduceOutcome(outcomes);
  const score = Math.round((outcomes.filter((item) => item === "cumple").length / Math.max(outcomes.length, 1)) * 100);
  return {
    professionalId: record.professional.id,
    roleId: role.id,
    outcome,
    score,
    reasons,
    evidence,
    generalMonths: general.months,
    specificMonths: specificMerged.months,
    missingSupports,
    warnings,
  };
}

function reduceOutcome(values: MatchOutcome[]): MatchOutcome {
  if (!values.length) return "pendiente_validar";
  if (values.includes("no_cumple")) return "no_cumple";
  if (values.includes("pendiente_validar")) return "pendiente_validar";
  if (values.includes("cumple_parcial")) return "cumple_parcial";
  return "cumple";
}

export function staleResume(masterUpdatedAt: string, generatedAt: string): boolean {
  return masterUpdatedAt > generatedAt;
}

export function educationMeets(items: ProfessionalEducation[], level: string): ProfessionalEducation | undefined {
  const needed = educationRank(level);
  return items.find((item) => educationRank(item.level) >= needed);
}
