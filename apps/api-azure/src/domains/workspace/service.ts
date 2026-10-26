import { z } from "zod";
import { copilotClient } from "../../clients/copilot.js";
import { dynamicsClient } from "../../clients/dynamics.js";
import { integrationReady, loadConfig } from "../../shared/config.js";
import { DomainError } from "../../shared/errors.js";
import { createPrefixedId } from "../../shared/ids.js";
import type { Actor } from "../../shared/types.js";
import type { BusinessStore } from "../../store/types.js";
import type {
  AlertItem,
  AnalyticsSnapshot,
  CommercialOpportunity,
  CopilotMessage,
  CriterionWeight,
  Decision,
  IntegrationStatus,
  Recommendation,
  Requirement,
  Tender,
  WorkTask,
} from "../../contracts/workspace.js";
import { CompanyService } from "../companies/service.js";
import { matchProfessionalToRole } from "../professionals/matching.js";
import { hybridSearch } from "../secop/search.js";
import { toTender } from "../secop/normalize.js";

export class WorkspaceService {
  constructor(
    private readonly store: BusinessStore,
    private readonly companies: CompanyService,
  ) {}

  async requireCompany(actor: Actor, companyId: string, permission = "workbench.read") {
    return this.companies.authorize(actor, companyId, permission);
  }

  async snapshot(actor: Actor, companyId: string) {
    await this.requireCompany(actor, companyId);
    const workspace = await this.store.workspace(companyId);
    const catalog = (await this.store.listProcesses()).map((process) => toTender(process));
    const tenders = workspace.tenders.length ? workspace.tenders : catalog;
    return {
      ...workspace,
      companyId,
      tenders,
      integrations: this.integrations(),
    };
  }

  integrations(): IntegrationStatus[] {
    const config = loadConfig();
    return [
      status("entra", "Entra ID", "Entra ID", integrationReady("entra"), "Validación JWT de la API protegida"),
      status("dataverse", "Dataverse", "Dataverse", integrationReady("dataverse"), config.storageMode === "Memory" ? "Almacén local de desarrollo" : "Web API lista cuando el esquema esté verificado"),
      status("secop", "SECOP", "SECOP", true, "API pública de datos.gov.co; no requiere secreto privado"),
      status("dynamics", "Dynamics 365", "Dynamics 365", integrationReady("dynamics"), "Oportunidades y tareas comerciales"),
      status("sharepoint", "SharePoint", "SharePoint", integrationReady("graph"), "Biblioteca Cuenta / Pliegos"),
      status("copilot", "Copilot Studio", "Copilot Studio", integrationReady("copilot"), "Gateway de agentes; no se sustituye por otro motor"),
    ];
  }

  async searchTenders(actor: Actor, companyId: string, filters: Parameters<typeof hybridSearch>[1], page = 1, pageSize = 25) {
    await this.requireCompany(actor, companyId);
    return hybridSearch(this.store, filters, page, pageSize);
  }

  async getTender(actor: Actor, companyId: string, id: string): Promise<Tender | null> {
    await this.requireCompany(actor, companyId);
    const workspace = await this.store.workspace(companyId);
    const local = workspace.tenders.find((item) => item.id === id || item.secopId === id);
    if (local) return local;
    const process = await this.store.getProcess(id);
    return process ? toTender(process) : null;
  }

  async toggleFlag(actor: Actor, companyId: string, id: string, flag: "favorite" | "watching") {
    await this.requireCompany(actor, companyId, "workbench.edit");
    const workspace = await this.store.workspace(companyId);
    const tenders = workspace.tenders.map((item) => (item.id === id ? { ...item, [flag]: !item[flag] } : item));
    await this.store.saveWorkspace(companyId, { tenders });
    const process = await this.store.getProcess(id);
    if (process && flag === "watching") await this.store.upsertProcess({ ...process, relevant: true });
    return true;
  }

  async saveSearch(actor: Actor, companyId: string, name: string, filters: Record<string, unknown>) {
    await this.requireCompany(actor, companyId, "workbench.edit");
    const workspace = await this.store.workspace(companyId);
    const search = {
      id: createPrefixedId("ss"),
      companyId,
      name: z.string().trim().min(1).max(100).parse(name),
      filters,
      active: true,
      createdAt: new Date().toISOString(),
    };
    await this.store.saveWorkspace(companyId, { searches: [search, ...workspace.searches] });
    return search;
  }

  async saveTask(actor: Actor, companyId: string, task: Omit<WorkTask, "id" | "companyId"> & { id?: string }) {
    await this.requireCompany(actor, companyId, "workbench.edit");
    const workspace = await this.store.workspace(companyId);
    const record: WorkTask = { ...task, id: task.id ?? createPrefixedId("tsk"), companyId };
    const tasks = workspace.tasks.some((item) => item.id === record.id)
      ? workspace.tasks.map((item) => (item.id === record.id ? record : item))
      : [record, ...workspace.tasks];
    await this.store.saveWorkspace(companyId, { tasks });
    await this.audit(companyId, actor, "task.save", record.id);
    return record;
  }

  async recordDecision(actor: Actor, companyId: string, input: { tenderId: string; decided: Recommendation; rationale: string }) {
    await this.requireCompany(actor, companyId, "workbench.decide");
    const parsed = z.object({
      tenderId: z.string().min(1),
      decided: z.enum(["BID", "NO_BID", "REVISION"]),
      rationale: z.string().trim().min(10),
    }).parse(input);
    const workspace = await this.store.workspace(companyId);
    const recommended = workspace.assessments.find((item) => item.tenderId === parsed.tenderId)?.recommendation ?? "REVISION";
    const decision: Decision = {
      id: createPrefixedId("dec"),
      companyId,
      tenderId: parsed.tenderId,
      recommended,
      decided: parsed.decided,
      decidedBy: actor.name,
      decidedAt: new Date().toISOString(),
      rationale: parsed.rationale,
      risks: [],
      blockers: [],
      version: 1,
      simulated: false,
    };
    await this.store.saveWorkspace(companyId, {
      decisions: [decision, ...workspace.decisions.filter((item) => item.tenderId !== parsed.tenderId)],
    });
    const process = await this.store.getProcess(parsed.tenderId);
    if (process) await this.store.upsertProcess({ ...process, relevant: true });
    await this.audit(companyId, actor, `decision.${parsed.decided}`, parsed.tenderId);
    return decision;
  }

  async updateRequirement(actor: Actor, companyId: string, id: string, patch: Partial<Requirement>) {
    await this.requireCompany(actor, companyId, "workbench.edit");
    const workspace = await this.store.workspace(companyId);
    await this.store.saveWorkspace(companyId, {
      requirements: workspace.requirements.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
    return true;
  }

  async createOpportunity(actor: Actor, companyId: string, input: Omit<CommercialOpportunity, "id" | "createdAt" | "activities" | "tasks" | "documents" | "companyId">) {
    await this.requireCompany(actor, companyId, "workbench.commercial");
    const workspace = await this.store.workspace(companyId);
    const decision = workspace.decisions.find((item) => item.tenderId === input.tenderId);
    if (decision?.decided !== "BID") throw new DomainError(409, "bid_required");
    let dynamicsOpportunityId = input.dynamicsOpportunityId;
    if (dynamicsClient.enabled() && input.dynamicsAccountId) {
      const created = await dynamicsClient.createOpportunity({
        name: input.name,
        accountId: input.dynamicsAccountId,
        secopId: input.tenderId,
      });
      dynamicsOpportunityId = created.opportunityid;
    } else if (!dynamicsOpportunityId) {
      throw new DomainError(503, "dynamics_not_configured");
    }
    const opportunity: CommercialOpportunity = {
      ...input,
      id: createPrefixedId("opp"),
      companyId,
      dynamicsOpportunityId,
      createdAt: new Date().toISOString(),
      activities: 0,
      tasks: 0,
      documents: 0,
    };
    await this.store.saveWorkspace(companyId, {
      opportunities: [opportunity, ...workspace.opportunities],
      tenders: workspace.tenders.map((item) =>
        item.id === input.tenderId ? { ...item, dynamicsOpportunityId } : item,
      ),
    });
    await this.audit(companyId, actor, "opportunity.create", opportunity.id);
    return opportunity;
  }

  async analytics(actor: Actor, companyId: string): Promise<AnalyticsSnapshot> {
    const workspace = await this.snapshot(actor, companyId);
    const today = new Date().toISOString().slice(0, 10);
    return {
      detected: workspace.tenders.length,
      evaluated: workspace.assessments.length,
      recommended: workspace.tenders.filter((item) => item.recommendation === "BID").length,
      discarded: workspace.tenders.filter((item) => item.recommendation === "NO_BID").length,
      closingSoon: workspace.tenders.filter((item) => item.status === "abierto").length,
      inDynamics: workspace.opportunities.length,
      overdueTasks: workspace.tasks.filter((item) => item.dueDate <= today && item.status !== "hecha").length,
      winRate: workspace.opportunities.length
        ? Math.round((workspace.opportunities.filter((item) => item.outcome === "ganada").length / workspace.opportunities.length) * 100)
        : 0,
      funnel: [
        { stage: "Detectadas", count: workspace.tenders.length },
        { stage: "Evaluadas", count: workspace.assessments.length },
        { stage: "Recomendadas", count: workspace.tenders.filter((item) => item.recommendation === "BID").length },
        { stage: "En Dynamics", count: workspace.opportunities.length },
        { stage: "Ganadas", count: workspace.opportunities.filter((item) => item.outcome === "ganada").length },
      ],
      byModality: groupCount(workspace.tenders, (item) => item.modality),
      byEntity: groupSum(workspace.tenders, (item) => item.entity, (item) => item.value),
    };
  }

  async askCopilot(actor: Actor, companyId: string, body: string, agent: CopilotMessage["agent"] = "orquestador") {
    await this.requireCompany(actor, companyId, "workbench.read");
    const workspace = await this.store.workspace(companyId);
    const user: CopilotMessage = {
      id: createPrefixedId("cp"),
      companyId,
      role: "user",
      agent,
      body,
      createdAt: new Date().toISOString(),
    };
    let assistant: CopilotMessage;
    if (copilotClient.enabled()) {
      const result = await copilotClient.invoke({ agent, input: { body }, companyId, actor: actor.key });
      assistant = {
        id: createPrefixedId("cp"),
        companyId,
        role: "assistant",
        agent,
        body: String(result.output.summary ?? result.output.text ?? ""),
        createdAt: new Date().toISOString(),
        findings: result.evidence,
        status: "listo",
      };
    } else if (agent === "candidatos") {
      const roles = workspace.staffRoles;
      const findings: string[] = ["copilot_not_configured"];
      const tableRows: string[][] = [];
      for (const role of roles) {
        for (const professional of workspace.professionals) {
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
          tableRows.push([professional.fullName, role.name, match.outcome, match.reasons[0] ?? "Sin criterio adicional"]);
          findings.push(...match.reasons.slice(0, 2));
        }
      }
      assistant = {
        id: createPrefixedId("cp"),
        companyId,
        role: "assistant",
        agent,
        body: "Copilot Studio no está configurado. La comparación de perfiles se calculó de forma determinista en Azure Functions y no inventa experiencia ni certificaciones.",
        createdAt: new Date().toISOString(),
        findings: findings.slice(0, 8),
        table: tableRows.length
          ? { headers: ["Profesional", "Perfil requerido", "Resultado", "Motivo"], rows: tableRows.slice(0, 12) }
          : undefined,
        recommendation: "Revise y asigne el profesional en Personal propuesto. La asignación definitiva corresponde a un usuario autorizado.",
        status: "error",
      };
    } else {
      assistant = {
        id: createPrefixedId("cp"),
        companyId,
        role: "assistant",
        agent,
        body: "Copilot Studio no está configurado. No se genera una respuesta simulada en este entorno.",
        createdAt: new Date().toISOString(),
        findings: ["copilot_not_configured"],
        status: "error",
      };
    }
    await this.store.saveWorkspace(companyId, { copilotThread: [...workspace.copilotThread, user, assistant] });
    return { user, assistant, configured: copilotClient.enabled() };
  }

  async saveWeights(actor: Actor, companyId: string, weights: CriterionWeight[]) {
    await this.requireCompany(actor, companyId, "workbench.edit");
    const workspace = await this.store.workspace(companyId);
    const enabled = weights.filter((item) => item.enabled);
    const total = enabled.reduce((sum, item) => sum + item.weight, 0) || 1;
    const assessments = workspace.assessments.map((item) => {
      const map: Record<string, number> = {
        "cw-fit": item.compatibility,
        "cw-exp": item.experience,
        "cw-fin": item.financial,
        "cw-leg": item.legal,
        "cw-tec": item.technical,
        "cw-score": item.scoring,
      };
      const score = Math.round(enabled.reduce((sum, weight) => sum + ((map[weight.id] ?? item.score) * weight.weight) / total, 0));
      return { ...item, score, version: item.version + 1, updatedAt: new Date().toISOString() };
    });
    await this.store.saveWorkspace(companyId, { criterionWeights: weights, assessments });
    return true;
  }

  async markAlert(actor: Actor, companyId: string, id: string, patch: Partial<AlertItem>) {
    await this.requireCompany(actor, companyId, "workbench.read");
    const workspace = await this.store.workspace(companyId);
    await this.store.saveWorkspace(companyId, {
      alerts: workspace.alerts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
    return true;
  }

  private async audit(companyId: string, actor: Actor, action: string, entity: string) {
    await this.store.appendAudit({
      id: createPrefixedId("aud"),
      companyId,
      actor: actor.name,
      action,
      entity,
      correlationId: createPrefixedId("corr"),
      at: new Date().toISOString(),
    });
  }
}

function status(
  id: string,
  name: string,
  system: IntegrationStatus["system"],
  ready: boolean,
  note: string,
): IntegrationStatus {
  return {
    id,
    name,
    system,
    status: ready ? "saludable" : "desconectada",
    lastSync: null,
    note: ready ? note : `${note}. Integración deshabilitada hasta configurar secretos.`,
  };
}

function groupCount<T>(items: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

function groupSum<T>(items: T[], key: (item: T) => string, value: (item: T) => number): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + value(item));
  return [...map.entries()].map(([name, amount]) => ({ name, value: amount }));
}
