import * as XLSX from "xlsx";
import type {
  ImportIssue,
  ImportPreviewRow,
  Professional,
  ProfessionalCertification,
  ProfessionalEducation,
  ProfessionalExperience,
} from "@/contracts/professional";
import { createId } from "@/lib/ids";
import { maskDocument, suggestMapping } from "./engine";

const EXAMPLE = "EJEMPLO FICTICIO — no corresponde a una persona real.";

function sheet(name: string, rows: string[][]) {
  return { name, data: rows };
}

export async function buildImportTemplate(): Promise<string> {
  const workbook = XLSX.utils.book_new();
  const sheets = [
    sheet("Profesionales", [
      ["ID Externo", "Nombres", "Apellidos", "Tipo de documento", "Número de documento", "Profesión", "Especialidad", "Perfil principal", "Ciudad", "Departamento", "Correo", "Teléfono", "Tipo de vinculación", "Disponibilidad", "Estado"],
      ["EXT-DEMO-001", "María Camila", "Suárez Ficticia", "CC", "9001001", "Ingeniería de Sistemas", "Arquitectura", "Arquitecta de Software", "Bogotá", "Bogotá D.C.", "maria.demo@example.test", "3000000001", "empleado", "disponible", "activo"],
    ]),
    sheet("Formación", [
      ["ID Externo Profesional", "ID Estudio", "Nivel", "Título", "Institución", "Fecha de grado", "Estado", "Referencia soporte"],
      ["EXT-DEMO-001", "EDU-001", "profesional", "Ingeniería de Sistemas", "Universidad Demo", "2014-03-15", "graduado", "diploma-demo.pdf"],
    ]),
    sheet("Experiencias", [
      ["ID Externo Profesional", "ID Experiencia", "Empresa", "Proyecto", "Cargo", "Fecha inicio", "Fecha fin", "Funciones", "Tecnologías", "Referencia soporte"],
      ["EXT-DEMO-001", "EXP-001", "Entidad Demo S.A.S.", "Plataforma ciudadana demo", "Arquitecta de Software", "2018-01-01", "2022-12-31", "Diseño de arquitectura", "Azure;.NET", "cert-laboral-demo.pdf"],
    ]),
    sheet("Certificaciones", [
      ["ID Externo Profesional", "ID Certificación", "Nombre", "Emisor", "Código", "Fecha expedición", "Fecha vencimiento", "Categoría", "Referencia soporte"],
      ["EXT-DEMO-001", "CER-001", "Azure Solutions Architect", "Microsoft", "AZ-305-DEMO", "2023-04-01", "2026-04-01", "nube", "az305-demo.pdf"],
    ]),
    sheet("Competencias", [
      ["ID Externo Profesional", "Competencia", "Categoría", "Nivel"],
      ["EXT-DEMO-001", ".NET", "desarrollo", "avanzado"],
    ]),
    sheet("Acreditaciones", [
      ["ID Externo Profesional", "Tipo", "Entidad", "Número", "Profesión", "Fecha", "Estado", "Referencia soporte"],
      ["EXT-DEMO-001", "matricula", "COPNI Demo", "MAT-0001", "Ingeniería de Sistemas", "2014-06-01", "pendiente", ""],
    ]),
    sheet("Instrucciones", [
      [`Plantilla TenderOps para el banco de perfiles. ${EXAMPLE}`],
      ["Campos obligatorios en Profesionales: ID Externo, Nombres, Apellidos."],
      ["El número de documento es sensible: se usa para detectar duplicados y no se muestra como llave pública."],
      ["Relacione las demás hojas con el mismo ID Externo."],
      ["Fechas en formato AAAA-MM-DD. Una celda vacía es un dato ausente, no un cero."],
      ["Los soportes se referencian por nombre; el Excel no adjunta PDF."],
      ["No ejecute macros. TenderOps ignora fórmulas."],
      ["Una reimportación actualiza por ID Externo y no borra registros ausentes."],
      ["Experiencias y certificaciones verificadas no se reemplazan en silencio."],
    ]),
  ];
  for (const item of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(item.data), item.name);
  }
  return XLSX.write(workbook, { type: "base64", bookType: "xlsx" }) as string;
}

type Draft = {
  professional: Professional;
  education: ProfessionalEducation[];
  experiences: ProfessionalExperience[];
  certifications: ProfessionalCertification[];
};

function rowsOf(workbook: XLSX.WorkBook, name: string): string[][] {
  const sheetRef = workbook.Sheets[name] ?? (name === "Profesionales" ? workbook.Sheets[workbook.SheetNames[0] ?? ""] : undefined);
  if (!sheetRef) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheetRef, { header: 1, raw: false, defval: "" });
}

export async function analyzeWorkbook(contentBase64: string, mappingOverride?: Record<string, string>) {
  const workbook = XLSX.read(contentBase64, { type: "base64" });
  const table = rowsOf(workbook, "Profesionales");
  const headers = (table[0] ?? []).map((item) => String(item ?? ""));
  const mapping = { ...suggestMapping(headers), ...mappingOverride };
  const drafts: Draft[] = [];
  const preview: ImportPreviewRow[] = [];
  const issues: ImportIssue[] = [];
  table.slice(1).forEach((row, index) => {
    const data: Record<string, string> = {};
    headers.forEach((header, column) => {
      const field = mapping[header];
      if (field) data[field] = String(row[column] ?? "").trim();
    });
    if (!data.givenName && !data.familyName) return;
    if (!data.givenName || !data.familyName) {
      issues.push({
        id: createId("iss"),
        batchId: "local",
        sheet: "Profesionales",
        row: index + 2,
        field: "nombre",
        value: data.fullName ?? "",
        error: "Nombres y apellidos son obligatorios",
        action: "Completar la fila",
        severity: "error",
      });
      return;
    }
    const professional: Professional = {
      id: createId("pro"),
      companyId: "co-andina",
      externalId: data.externalId || `row-${index + 2}`,
      givenName: data.givenName,
      middleName: "",
      familyName: data.familyName,
      fullName: `${data.givenName} ${data.familyName}`,
      documentType: data.documentType || "CC",
      documentNumberMasked: data.documentNumber ? maskDocument(data.documentNumber) : "",
      documentCountry: "CO",
      profession: data.profession ?? "",
      specialty: data.specialty ?? "",
      primaryProfile: data.primaryProfile ?? data.profession ?? "",
      capableRoles: [],
      city: data.city ?? "",
      department: data.department ?? "",
      country: "CO",
      linkage: (data.linkage as Professional["linkage"]) || "empleado",
      availability: (data.availability as Professional["availability"]) || "disponible",
      status: (data.status as Professional["status"]) || "activo",
      verification: "pendiente",
      incomplete: true,
      notes: "",
      consentId: null,
      yearsGeneral: 0,
      sharePointFolder: `BancoPerfiles/${data.externalId}/`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Importación demo",
    };
    drafts.push({ professional, education: [], experiences: [], certifications: [] });
    preview.push({
      externalId: professional.externalId,
      fullName: professional.fullName,
      action: "crear",
      existingId: null,
      education: 0,
      experiences: 0,
      certifications: 0,
      issues: 0,
    });
  });
  collectRelated(workbook, "Formación", drafts, "education");
  collectRelated(workbook, "Experiencias", drafts, "experiences");
  collectRelated(workbook, "Certificaciones", drafts, "certifications");
  preview.forEach((row) => {
    const draft = drafts.find((item) => item.professional.externalId === row.externalId);
    if (!draft) return;
    row.education = draft.education.length;
    row.experiences = draft.experiences.length;
    row.certifications = draft.certifications.length;
  });
  return {
    mapping,
    drafts,
    preview,
    issues,
    stats: {
      rows: drafts.length,
      created: drafts.length,
      updated: 0,
      skipped: 0,
      errors: issues.length,
      education: drafts.reduce((sum, item) => sum + item.education.length, 0),
      experiences: drafts.reduce((sum, item) => sum + item.experiences.length, 0),
      certifications: drafts.reduce((sum, item) => sum + item.certifications.length, 0),
      duplicates: 0,
    },
  };
}

function collectRelated(workbook: XLSX.WorkBook, name: string, drafts: Draft[], key: "education" | "experiences" | "certifications") {
  const table = rowsOf(workbook, name);
  const headers = (table[0] ?? []).map((item) => String(item ?? ""));
  const mapping = suggestMapping(headers);
  const now = new Date().toISOString();
  table.slice(1).forEach((row) => {
    const data: Record<string, string> = {};
    headers.forEach((header, column) => {
      const field = mapping[header];
      if (field) data[field] = String(row[column] ?? "").trim();
    });
    const parent = drafts.find((item) => item.professional.externalId === data.externalId);
    if (!parent) return;
    if (key === "education" && data.title) {
      parent.education.push({
        id: createId("edu"),
        professionalId: parent.professional.id,
        companyId: parent.professional.companyId,
        externalId: data.recordExternalId || data.title,
        level: (data.level as ProfessionalEducation["level"]) || "profesional",
        title: data.title,
        institution: data.institution ?? "",
        country: "CO",
        startedOn: null,
        graduatedOn: data.graduatedOn || null,
        status: "graduado",
        supportRef: data.supportRef || null,
        verification: data.supportRef ? "pendiente" : "incompleto",
        createdAt: now,
        updatedAt: now,
        createdBy: "Importación demo",
      });
    }
    if (key === "experiences" && data.client && data.role && data.startedOn) {
      parent.experiences.push({
        id: createId("exp"),
        professionalId: parent.professional.id,
        companyId: parent.professional.companyId,
        externalId: data.recordExternalId || `${data.client}-${data.role}`,
        client: data.client,
        employer: data.client,
        project: data.project || data.client,
        role: data.role,
        startedOn: data.startedOn,
        endedOn: data.endedOn || null,
        current: !data.endedOn,
        functions: data.functions ?? "",
        activities: [],
        technologies: (data.technologies ?? "").split(";").filter(Boolean),
        sector: "",
        projectType: "",
        contractObject: "",
        supportRef: data.supportRef || null,
        verification: data.supportRef ? "pendiente" : "incompleto",
        monthsVerified: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: "Importación demo",
      });
    }
    if (key === "certifications" && data.name) {
      parent.certifications.push({
        id: createId("cer"),
        professionalId: parent.professional.id,
        companyId: parent.professional.companyId,
        externalId: data.recordExternalId || data.name,
        name: data.name,
        issuer: data.issuer ?? "",
        credentialCode: data.credentialCode ?? "",
        issuedOn: data.issuedOn || null,
        expiresOn: data.expiresOn || null,
        verificationUrl: null,
        category: data.category ?? "",
        supportRef: data.supportRef || null,
        validity: data.expiresOn && data.expiresOn < new Date().toISOString().slice(0, 10) ? "vencida" : "vigente",
        verification: data.supportRef ? "pendiente" : "incompleto",
        createdAt: now,
        updatedAt: now,
        createdBy: "Importación demo",
      });
    }
  });
}

export function downloadBase64(fileName: string, contentBase64: string, type: string) {
  const bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
