import type { CopilotAgent } from "@/contracts";
import { apiFetch, usesRemoteApi } from "@/lib/api";
import { createId } from "@/lib/ids";
import { matchProfessionalToRole } from "@/features/perfiles/engine";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const copilotService = {
  async thread() {
    return simulateLatency(readWorkspace().copilotThread);
  },
  async ask(body: string, agent: CopilotAgent = "orquestador") {
    if (usesRemoteApi()) {
      await apiFetch("/copilot/ask", { method: "POST", body: JSON.stringify({ body, agent }) });
      return true;
    }
    const workspace = readWorkspace();
    if (agent === "candidatos") {
      const role = workspace.staffRoles[0];
      const rows = role
        ? workspace.professionals.map((professional) => {
            const record = {
              professional,
              education: workspace.professionalEducation.filter((item) => item.professionalId === professional.id),
              experiences: workspace.professionalExperiences.filter((item) => item.professionalId === professional.id),
              certifications: workspace.professionalCertifications.filter((item) => item.professionalId === professional.id),
              licenses: workspace.professionalLicenses.filter((item) => item.professionalId === professional.id),
              skills: workspace.professionalSkills.filter((item) => item.professionalId === professional.id),
              attachments: workspace.professionalAttachments.filter((item) => item.professionalId === professional.id),
              consent: workspace.professionalConsents.find((item) => item.professionalId === professional.id) ?? null,
            };
            const match = matchProfessionalToRole(record, role, role.referenceDate);
            return [professional.fullName, role.name, match.outcome, match.reasons[0] ?? "Sin criterio"];
          })
        : [];
      writeWorkspace((current) => ({
        ...current,
        copilotThread: [
          ...current.copilotThread,
          { id: createId("cp"), role: "user", agent: "candidatos", body, createdAt: new Date().toISOString() },
          {
            id: createId("cp"),
            role: "assistant",
            agent: "candidatos",
            body: "Copilot Studio no está configurado. La comparación se calculó de forma determinista sobre el banco de perfiles y no inventa experiencia ni certificaciones.",
            createdAt: new Date().toISOString(),
            findings: ["copilot_not_configured", "La asignación definitiva corresponde a un usuario autorizado"],
            table: rows.length ? { headers: ["Profesional", "Perfil", "Resultado", "Motivo"], rows } : undefined,
            recommendation: "Abra Personal propuesto para seleccionar y generar hojas de vida.",
            status: "error",
            proposedAction: {
              type: "select-professional",
              label: "Seleccionar profesional",
              payload: { roleId: role?.id ?? "", tenderId: role?.tenderId ?? "tnd-001" },
            },
          },
        ],
      }));
      return simulateLatency(true, 280);
    }
    writeWorkspace((current) => ({
      ...current,
      copilotThread: [
        ...current.copilotThread,
        { id: createId("cp"), role: "user", agent, body, createdAt: new Date().toISOString() },
        {
          id: createId("cp"),
          role: "assistant",
          agent: "estrategia",
          body: "Copilot Studio no está configurado. Use el expediente local para revisar compatibilidad, evidencias y responsables.",
          createdAt: new Date().toISOString(),
          findings: ["copilot_not_configured"],
          recommendation: "Abrir el flujo de asignación si falta un responsable.",
          status: "error",
          proposedAction: {
            type: "assign-owners",
            label: "Asignar responsables",
            payload: { tenderId: "tnd-001" },
          },
        },
      ],
    }));
    return simulateLatency(true, 360);
  },
};
