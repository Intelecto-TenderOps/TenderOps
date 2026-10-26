import { describe, expect, it } from "vitest";
import { matchProfessionalToRole, mergeRanges, suggestMapping } from "@/features/perfiles/engine";
import { professionalCertifications, professionalEducation, professionalExperiences, professionals, staffRoles } from "@/mocks/professionals";
import { createSeed } from "@/mocks/seed";

describe("banco de perfiles", () => {
  it("no duplica meses superpuestos", () => {
    const merged = mergeRanges(
      [
        { start: "2016-01-01", end: "2019-12-31" },
        { start: "2018-06-01", end: "2021-12-31" },
      ],
      "2026-10-26",
    );
    expect(merged.months).toBe(72);
  });

  it("sugiere mapeo de encabezados conocidos", () => {
    const mapping = suggestMapping(["ID Externo Profesional", "ID Experiencia", "Empresa", "Cargo"]);
    expect(mapping["ID Externo Profesional"]).toBe("externalId");
    expect(mapping["ID Experiencia"]).toBe("recordExternalId");
    expect(mapping.Empresa).toBe("client");
  });

  it("conserva ocho experiencias en el registro maestro de demostración", () => {
    const laura = professionals.find((item) => item.id === "pro-laura");
    const experiences = professionalExperiences.filter((item) => item.professionalId === "pro-laura");
    expect(laura?.notes).toContain("ficticio");
    expect(experiences).toHaveLength(8);
  });

  it("dos selecciones de hoja de vida no mutan el maestro", () => {
    const first = professionalExperiences.filter((item) => item.professionalId === "pro-laura").slice(0, 3);
    const second = professionalExperiences.filter((item) => item.professionalId === "pro-laura").slice(3, 8);
    expect(first).toHaveLength(3);
    expect(second).toHaveLength(5);
    expect(professionalExperiences.filter((item) => item.professionalId === "pro-laura")).toHaveLength(8);
  });

  it("marca certificación vencida y no la presenta como vigente", () => {
    const expired = professionalCertifications.find((item) => item.validity === "vencida");
    expect(expired?.name).toContain("ITIL");
    const record = {
      professional: professionals[0]!,
      education: professionalEducation.filter((item) => item.professionalId === "pro-laura"),
      experiences: professionalExperiences.filter((item) => item.professionalId === "pro-laura"),
      certifications: professionalCertifications.filter((item) => item.professionalId === "pro-laura"),
      licenses: [],
      skills: [],
      attachments: [],
      consent: null,
    };
    const match = matchProfessionalToRole(record, { ...staffRoles[0]!, certifications: ["ITIL"] }, "2026-10-26");
    expect(match.outcome).not.toBe("cumple");
    expect(match.reasons.join(" ")).toMatch(/ITIL|vencida|pendiente/i);
  });

  it("aísla el banco de Oriente en el seed", () => {
    const workspace = createSeed();
    expect(workspace.professionals.every((item) => item.companyId === "co-andina")).toBe(true);
    expect(workspace.professionals.some((item) => item.companyId === "co-oriente")).toBe(false);
  });

  it("no acredita experiencia sin soporte", () => {
    const camila = professionals.find((item) => item.id === "pro-camila")!;
    const record = {
      professional: camila,
      education: professionalEducation.filter((item) => item.professionalId === camila.id),
      experiences: professionalExperiences.filter((item) => item.professionalId === camila.id),
      certifications: [],
      licenses: [],
      skills: [],
      attachments: [],
      consent: null,
    };
    const match = matchProfessionalToRole(
      record,
      { ...staffRoles[0]!, name: "QA", specificMonths: 12, specificCriteria: "QA", certifications: [] },
      "2026-10-26",
    );
    expect(match.outcome).not.toBe("cumple");
    expect(record.experiences.some((item) => !item.supportRef)).toBe(true);
  });
});
