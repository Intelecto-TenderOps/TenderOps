import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_COMPANY_A, DEMO_COMPANY_B } from "../src/app/container.js";
import { mergeRanges } from "../src/domains/professionals/overlap.js";
import { login, request, setupTestEnv } from "./helpers.js";

beforeEach(() => {
  setupTestEnv();
});

function companyHeaders(token: string, companyId = DEMO_COMPANY_A) {
  return { authorization: `Bearer ${token}`, "x-company-id": companyId };
}

async function workbookFor(count: number, extraExperiences = 0): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const people = workbook.addWorksheet("Profesionales");
  people.addRow(["ID Externo", "Nombres", "Apellidos", "Tipo de documento", "Número de documento", "Profesión", "Especialidad", "Perfil principal", "Ciudad", "Departamento", "Correo", "Teléfono", "Tipo de vinculación", "Disponibilidad", "Estado"]);
  const education = workbook.addWorksheet("Formación");
  education.addRow(["ID Externo Profesional", "ID Estudio", "Nivel", "Título", "Institución", "Fecha de grado", "Estado", "Referencia soporte"]);
  const experiences = workbook.addWorksheet("Experiencias");
  experiences.addRow(["ID Externo Profesional", "ID Experiencia", "Empresa", "Proyecto", "Cargo", "Fecha inicio", "Fecha fin", "Funciones", "Tecnologías", "Referencia soporte"]);
  const certifications = workbook.addWorksheet("Certificaciones");
  certifications.addRow(["ID Externo Profesional", "ID Certificación", "Nombre", "Emisor", "Código", "Fecha expedición", "Fecha vencimiento", "Categoría", "Referencia soporte"]);
  for (let i = 1; i <= count; i += 1) {
    const externalId = `EXT-${String(i).padStart(3, "0")}`;
    people.addRow([externalId, `Nombre${i}`, `Apellido${i}`, "CC", `900${String(i).padStart(4, "0")}`, "Ingeniería de Sistemas", "Arquitectura", "Arquitecto de Software", "Bogotá", "Bogotá D.C.", `demo${i}@example.test`, "3000000000", "empleado", "disponible", "activo"]);
    education.addRow([externalId, `EDU-${i}`, "profesional", "Ingeniería de Sistemas", "Universidad Demo", "2012-03-01", "graduado", "diploma.pdf"]);
    experiences.addRow([externalId, `EXP-${i}-A`, "Cliente Demo", "Plataforma", "Arquitecto", "2016-01-01", "2019-12-31", "Arquitectura de software en Azure", "Azure;.NET", "soporte-a.pdf"]);
    experiences.addRow([externalId, `EXP-${i}-B`, "Cliente Demo", "Plataforma", "Líder técnico", "2018-06-01", "2021-12-31", "Liderazgo técnico", "Azure;Scrum", "soporte-b.pdf"]);
    for (let extra = 1; extra <= extraExperiences; extra += 1) {
      experiences.addRow([externalId, `EXP-${i}-X${extra}`, "Otro Cliente", `Proyecto ${extra}`, "Especialista", `201${extra}-01-01`, `201${extra}-12-31`, "Soporte especializado", "Java", extra === 1 ? "" : `soporte-x${extra}.pdf`]);
    }
    certifications.addRow([externalId, `CER-${i}`, "Azure Solutions Architect", "Microsoft", `AZ-${i}`, "2022-01-01", i === 2 ? "2022-12-31" : "2027-01-01", "nube", "cert.pdf"]);
  }
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return buffer.toString("base64");
}

async function importFile(token: string, contentBase64: string, companyId = DEMO_COMPANY_A) {
  const created = await request("POST", "/api/v1/professionals/imports", {
    token,
    headers: { "x-company-id": companyId },
    body: { fileName: "banco.xlsx", contentBase64 },
  });
  expect(created.status).toBe(201);
  const committed = await request("POST", `/api/v1/professionals/imports/${created.body.id}/commit`, {
    token,
    headers: { "x-company-id": companyId },
    body: { duplicateAction: "actualizar" },
  });
  expect(committed.status).toBe(200);
  return committed.body;
}

describe("banco de perfiles", () => {
  it("calcula meses sin duplicar superposición", () => {
    const merged = mergeRanges(
      [
        { start: "2016-01-01", end: "2019-12-31" },
        { start: "2018-06-01", end: "2021-12-31" },
      ],
      "2026-10-26",
    );
    expect(merged.months).toBe(72);
  });

  it("A importa 100 profesionales con relaciones", async () => {
    const token = await login("admin");
    const result = await importFile(token, await workbookFor(100));
    expect(result.stats.created).toBe(100);
    expect(result.stats.education).toBe(100);
    expect(result.stats.experiences).toBe(200);
    const list = await request("GET", "/api/v1/professionals?pageSize=25", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    expect(list.body.total).toBe(100);
    expect(list.body.items[0].documentNumberMasked).toMatch(/^\*\*\*\*/);
  });

  it("B reimportar no duplica", async () => {
    const token = await login("admin");
    const file = await workbookFor(5);
    await importFile(token, file);
    const second = await importFile(token, file);
    expect(second.stats.updated).toBe(5);
    const list = await request("GET", "/api/v1/professionals?pageSize=50", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    expect(list.body.total).toBe(5);
  });

  it("C genera dos hojas de vida con selecciones distintas", async () => {
    const token = await login("admin");
    await importFile(token, await workbookFor(1, 6));
    const list = await request("GET", "/api/v1/professionals?pageSize=10", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const professionalId = list.body.items[0].id as string;
    const detail = await request("GET", `/api/v1/professionals/${professionalId}`, { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const experiences = detail.body.experiences as { id: string }[];
    expect(experiences.length).toBeGreaterThanOrEqual(8);
    const role = await request("POST", "/api/v1/tenders/tnd-001/staff-roles", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: { name: "Arquitecto de Software", specificMonths: 24, specificCriteria: "Arquitectura Azure", educationLevel: "profesional" },
    });
    const first = await request("POST", "/api/v1/tenders/tnd-001/resume-jobs", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: {
        professionalId,
        roleId: role.body.id,
        proposedRoleName: "Arquitecto de Software",
        selection: {
          includeName: true,
          includeIdentification: false,
          includeProfession: true,
          includeSpecialty: true,
          includeCity: true,
          includeContact: false,
          includeSummary: false,
          educationIds: detail.body.education.map((item: { id: string }) => item.id),
          experienceIds: experiences.slice(0, 3).map((item) => item.id),
          certificationIds: [],
          licenseIds: [],
          attachmentIds: [],
          experienceOrder: "reciente",
          summary: "",
        },
      },
    });
    const second = await request("POST", "/api/v1/tenders/tnd-002/resume-jobs", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: {
        professionalId,
        roleId: role.body.id,
        proposedRoleName: "Líder Técnico",
        selection: {
          includeName: true,
          includeIdentification: false,
          includeProfession: true,
          includeSpecialty: true,
          includeCity: true,
          includeContact: false,
          includeSummary: false,
          educationIds: detail.body.education.map((item: { id: string }) => item.id),
          experienceIds: experiences.slice(3, 8).map((item) => item.id),
          certificationIds: [],
          licenseIds: [],
          attachmentIds: [],
          experienceOrder: "reciente",
          summary: "",
        },
      },
    });
    expect(first.body.resume.snapshot.experiences).toHaveLength(3);
    expect(second.body.resume.snapshot.experiences).toHaveLength(5);
    expect(first.body.resume.snapshot.experiences.map((item: { id: string }) => item.id)).not.toEqual(
      second.body.resume.snapshot.experiences.map((item: { id: string }) => item.id),
    );
  });

  it("D marca certificación vencida", async () => {
    const token = await login("admin");
    await importFile(token, await workbookFor(2));
    const list = await request("GET", "/api/v1/professionals?search=Nombre2", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const professionalId = list.body.items[0].id as string;
    const detail = await request("GET", `/api/v1/professionals/${professionalId}`, { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const expired = (detail.body.certifications as { validity: string; name: string }[]).find((item) => item.validity === "vencida");
    expect(expired?.name).toContain("Azure");
    const role = await request("POST", "/api/v1/tenders/tnd-001/staff-roles", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: { name: "Arquitecto", certifications: ["Azure"] },
    });
    const job = await request("POST", "/api/v1/tenders/tnd-001/resume-jobs", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: {
        professionalId,
        roleId: role.body.id,
        proposedRoleName: "Arquitecto",
        selection: {
          includeName: true,
          includeIdentification: false,
          includeProfession: true,
          includeSpecialty: false,
          includeCity: false,
          includeContact: false,
          includeSummary: false,
          educationIds: [],
          experienceIds: [],
          certificationIds: detail.body.certifications.map((item: { id: string }) => item.id),
          licenseIds: [],
          attachmentIds: [],
          experienceOrder: "reciente",
          summary: "",
        },
      },
    });
    expect(job.body.warnings.some((item: string) => item.toLocaleLowerCase("es-CO").includes("vencida"))).toBe(true);
  });

  it("E no acredita 5 años específicos con periodos superpuestos incompletos", async () => {
    const token = await login("admin");
    await importFile(token, await workbookFor(1));
    const list = await request("GET", "/api/v1/professionals?pageSize=5", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const professionalId = list.body.items[0].id as string;
    const role = await request("POST", "/api/v1/tenders/tnd-001/staff-roles", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: {
        name: "Arquitecto de Software",
        specificMonths: 60,
        specificCriteria: "Arquitectura Azure",
        educationLevel: "profesional",
      },
    });
    const matches = await request("GET", `/api/v1/tenders/tnd-001/staff-roles/${role.body.id}/matches`, {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
    });
    const row = (matches.body as { professionalId: string; outcome: string; specificMonths: number }[]).find((item) => item.professionalId === professionalId);
    expect(row?.specificMonths).toBe(72);
    expect(["pendiente_validar", "cumple"]).toContain(row?.outcome);
  });

  it("F sustituye variables de plantilla de entidad", async () => {
    const { applyTemplateVariables } = await import("../src/domains/professionals/docx.js");
    const rendered = applyTemplateVariables("{{profesional.nombreCompleto}} · {{perfil.cargoPropuesto}}", {
      "profesional.nombreCompleto": "Nombre1 Apellido1",
      "perfil.cargoPropuesto": "Arquitecto de Software",
    });
    expect(rendered).toBe("Nombre1 Apellido1 · Arquitecto de Software");
  });

  it("G asigna cuatro profesionales y genera cuatro hojas", async () => {
    const token = await login("admin");
    await importFile(token, await workbookFor(4));
    const list = await request("GET", "/api/v1/professionals?pageSize=10", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const role = await request("POST", "/api/v1/tenders/tnd-001/staff-roles", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: { name: "Desarrollador", quantity: 4 },
    });
    for (const item of list.body.items) {
      const assigned = await request("POST", "/api/v1/tenders/tnd-001/staff-assignments", {
        token,
        headers: { "x-company-id": DEMO_COMPANY_A },
        body: { roleId: role.body.id, professionalId: item.id },
      });
      expect(assigned.status).toBe(201);
      const job = await request("POST", "/api/v1/tenders/tnd-001/resume-jobs", {
        token,
        headers: { "x-company-id": DEMO_COMPANY_A },
        body: {
          professionalId: item.id,
          roleId: role.body.id,
          proposedRoleName: "Desarrollador",
          selection: {
            includeName: true,
            includeIdentification: false,
            includeProfession: true,
            includeSpecialty: false,
            includeCity: true,
            includeContact: false,
            includeSummary: false,
            educationIds: [],
            experienceIds: [],
            certificationIds: [],
            licenseIds: [],
            attachmentIds: [],
            experienceOrder: "reciente",
            summary: "",
          },
        },
      });
      expect(job.status).toBe(202);
      expect(job.body.sharePoint).toBe("pending");
    }
    const resumes = await request("GET", "/api/v1/tenders/tnd-001/resumes", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    expect(resumes.body).toHaveLength(4);
  });

  it("H conserva snapshot aprobado si el maestro cambia", async () => {
    const token = await login("admin");
    await importFile(token, await workbookFor(1));
    const list = await request("GET", "/api/v1/professionals?pageSize=5", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const professionalId = list.body.items[0].id as string;
    const role = await request("POST", "/api/v1/tenders/tnd-001/staff-roles", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: { name: "Arquitecto" },
    });
    const job = await request("POST", "/api/v1/tenders/tnd-001/resume-jobs", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: {
        professionalId,
        roleId: role.body.id,
        proposedRoleName: "Arquitecto",
        selection: {
          includeName: true,
          includeIdentification: false,
          includeProfession: true,
          includeSpecialty: false,
          includeCity: false,
          includeContact: false,
          includeSummary: false,
          educationIds: [],
          experienceIds: [],
          certificationIds: [],
          licenseIds: [],
          attachmentIds: [],
          experienceOrder: "reciente",
          summary: "",
        },
      },
    });
    const approved = await request("POST", `/api/v1/resumes/${job.body.resume.id}/approve`, {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
    });
    expect(approved.status).toBe(200);
    const originalName = job.body.resume.snapshot.fullName;
    await request("PATCH", `/api/v1/professionals/${professionalId}`, {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: { givenName: "Nuevo", familyName: "Nombre" },
    });
    const preview = await request("GET", `/api/v1/resumes/${job.body.resume.id}/preview`, {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
    });
    expect(preview.body.fullName).toBe(originalName);
  });

  it("I aísla el banco entre empresas", async () => {
    const admin = await login("admin");
    const other = await login("other");
    await importFile(admin, await workbookFor(1), DEMO_COMPANY_A);
    const listA = await request("GET", "/api/v1/professionals", { token: admin, headers: { "x-company-id": DEMO_COMPANY_A } });
    const denied = await request("GET", `/api/v1/professionals/${listA.body.items[0].id}`, {
      token: other,
      headers: { "x-company-id": DEMO_COMPANY_B },
    });
    expect(denied.status).toBe(404);
    const listB = await request("GET", "/api/v1/professionals", { token: other, headers: { "x-company-id": DEMO_COMPANY_B } });
    expect(listB.body.total).toBe(0);
  });

  it("J no acredita experiencia sin soporte", async () => {
    const token = await login("admin");
    await importFile(token, await workbookFor(1, 1));
    const list = await request("GET", "/api/v1/professionals?pageSize=5", { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const professionalId = list.body.items[0].id as string;
    const detail = await request("GET", `/api/v1/professionals/${professionalId}`, { token, headers: { "x-company-id": DEMO_COMPANY_A } });
    const unsupported = (detail.body.experiences as { supportRef: string | null }[]).some((item) => !item.supportRef);
    expect(unsupported).toBe(true);
    const role = await request("POST", "/api/v1/tenders/tnd-001/staff-roles", {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
      body: { name: "Especialista", specificMonths: 12, specificCriteria: "Soporte especializado" },
    });
    const matches = await request("GET", `/api/v1/tenders/tnd-001/staff-roles/${role.body.id}/matches`, {
      token,
      headers: { "x-company-id": DEMO_COMPANY_A },
    });
    const row = (matches.body as { professionalId: string; outcome: string; missingSupports: string[] }[]).find((item) => item.professionalId === professionalId);
    expect(row?.outcome).not.toBe("cumple");
  });

  it("entrega plantilla xlsx real", async () => {
    const token = await login("admin");
    const template = await request("GET", "/api/v1/professionals/import-template", {
      token,
      headers: { accept: "application/json", ...companyHeaders(token) },
    });
    expect(template.status).toBe(200);
    expect(template.body.fileName).toContain(".xlsx");
    expect(template.body.contentBase64.length).toBeGreaterThan(100);
  });
});
