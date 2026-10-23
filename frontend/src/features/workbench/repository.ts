import { z } from "zod";
import { seedWorkspace, roleLabels } from "./fixtures";
import type {
  Command,
  Filters,
  Opportunity,
  ViewRole,
  WorkbenchContext,
  WorkspaceData,
} from "./types";

export const referenceDate = "2026-10-22";
export class WorkbenchError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const stores = new Map<string, WorkspaceData>();
const receipts = new Map<string, string>();
export const demoCompanyIds = ["demo-company-1", "demo-company-2"];
const text = z.string().trim().min(1, "Completa este campo.");
const date = z.iso.date();
const str = (values: Record<string, unknown>, key: string): string =>
  z.string().parse(values[key]);
const optional = (values: Record<string, unknown>, key: string): string =>
  z.string().optional().parse(values[key]) ?? "";
const actorName = (role: ViewRole): string =>
  `Demostración · ${roleLabels[role]}`;
export const operationalRoles: ViewRole[] = [
  "Administrator",
  "Analyst",
  "Commercial",
];
export function can(context: WorkbenchContext, action: string): boolean {
  if (!context.demo) return context.permissions.includes(action);
  const roles: Record<string, ViewRole[]> = {
    edit: operationalRoles,
    source: ["Administrator"],
    decide: ["Approver"],
    approve: ["Approver", "Legal", "Financial", "Analyst"],
    finance: ["Financial", "Approver", "Auditor"],
    legal: ["Legal", "Approver"],
    commercial: ["Commercial", "Administrator"],
    audit: ["Administrator", "Auditor"],
    operations: ["Administrator"],
    comment: [
      "Administrator",
      "Analyst",
      "Commercial",
      "Legal",
      "Financial",
      "Approver",
    ],
  };
  return (roles[action] ?? []).includes(context.role);
}
function requireAction(context: WorkbenchContext, action: string): void {
  if (!can(context, action))
    throw new WorkbenchError(
      "permission_denied",
      "Tu función no permite esta acción.",
    );
}
function available(context: WorkbenchContext): void {
  if (!context.demo)
    throw new WorkbenchError(
      "service_not_connected",
      "Este módulo está preparado. Su servicio todavía no está conectado. Puedes recorrerlo con datos de demostración.",
    );
  if (!demoCompanyIds.includes(context.companyId))
    throw new WorkbenchError(
      "company_access_denied",
      "La empresa no pertenece a esta demostración.",
    );
}
function current(context: WorkbenchContext): WorkspaceData {
  available(context);
  if (!stores.has(context.companyId))
    stores.set(context.companyId, seedWorkspace(context.companyId));
  return stores.get(context.companyId)!;
}
export async function readWorkspace(
  context: WorkbenchContext,
  signal?: AbortSignal,
): Promise<WorkspaceData> {
  await new Promise<void>((resolve) => setTimeout(resolve, 100));
  signal?.throwIfAborted();
  const store = current(context);
  for (const job of store.jobs)
    if (job.status === "Pendiente" || job.status === "En curso") {
      job.polls++;
      job.progress = Math.min(100, job.polls * 50);
      job.status = job.progress === 100 ? "Completado" : "En curso";
      if (job.status === "Completado") finishJob(store, job.id);
    }
  return structuredClone(store);
}
function finishJob(store: WorkspaceData, id: string): void {
  const job = store.jobs.find((item) => item.id === id)!;
  const op = store.opportunities.find((item) => item.id === job.opportunityId);
  if (job.type === "Reevaluación" && op) {
    op.analysisVersion++;
    op.stale = false;
    op.version++;
    for (const approval of store.approvals.filter(
      (item) => item.opportunityId === op.id,
    )) {
      approval.status = "Pendiente";
      approval.analysisVersion = op.analysisVersion;
    }
  }
  job.result = JSON.stringify(
    {
      kind: "DEMO_ONLY",
      companyScope: job.opportunityId || "company",
      analysisVersion: op?.analysisVersion,
      generatedAt: new Date().toISOString(),
      documents: store.documents
        .filter(
          (doc) =>
            doc.opportunityId === job.opportunityId &&
            doc.status === "Available",
        )
        .map((doc) => ({ id: doc.id, version: doc.version, hash: doc.hash })),
      note: "Manifiesto de demostración. No es una oferta presentada ni un paquete de originales.",
    },
    null,
    2,
  );
  if (job.type === "Exportación de matriz")
    job.result = JSON.stringify(
      {
        kind: "DEMO_ONLY",
        analysisVersion: op?.analysisVersion,
        requirements: store.requirements.filter(
          (req) => req.opportunityId === job.opportunityId,
        ),
      },
      null,
      2,
    );
}
function job(store: WorkspaceData, type: string, opportunityId: string): void {
  if (
    store.jobs.some(
      (item) =>
        item.type === type &&
        item.opportunityId === opportunityId &&
        ["Pendiente", "En curso"].includes(item.status),
    )
  )
    throw new WorkbenchError(
      "job_running",
      "Ya existe un trabajo en curso para esta operación.",
    );
  store.jobs.unshift({
    id: crypto.randomUUID(),
    type,
    opportunityId,
    status: "Pendiente",
    progress: 0,
    error: "",
    transient: true,
    attempts: 1,
    correlationId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    polls: 0,
    result: "",
  });
}
export function blockers(store: WorkspaceData, id: string): string[] {
  const op = store.opportunities.find((item) => item.id === id);
  if (!op) return ["Expediente no disponible."];
  const messages = store.requirements
    .filter(
      (req) =>
        req.opportunityId === id &&
        req.mandatory &&
        !["Cumple", "No aplica"].includes(req.status) &&
        !store.waivers.some(
          (waiver) =>
            waiver.opportunityId === id &&
            waiver.requirementId === req.id &&
            waiver.until >= referenceDate,
        ),
    )
    .map((req) => req.title);
  if (op.stale)
    messages.push("El análisis está desactualizado por una adenda.");
  for (const approval of store.approvals.filter(
    (item) => item.opportunityId === id,
  ))
    if (
      approval.status !== "Aprobada" ||
      approval.analysisVersion !== op.analysisVersion
    )
      messages.push(`Aprobación ${approval.discipline.toLowerCase()} vigente`);
  return messages;
}

export async function execute(
  context: WorkbenchContext,
  command: Command,
  commandId: string = crypto.randomUUID(),
): Promise<void> {
  available(context);
  const fingerprint = JSON.stringify(command);
  const receiptKey = `${context.companyId}:${context.role}:${commandId}`;
  if (receipts.has(receiptKey)) {
    if (receipts.get(receiptKey) !== fingerprint)
      throw new WorkbenchError(
        "conflict",
        "La clave ya se utilizó para otra acción.",
      );
    return;
  }
  const store = structuredClone(current(context));
  const values = command.values;
  const op = command.opportunityId
    ? store.opportunities.find((item) => item.id === command.opportunityId)
    : undefined;
  if (command.opportunityId && !op)
    throw new WorkbenchError(
      "not_found",
      "El expediente no existe en esta empresa.",
    );
  if (op && values.version !== undefined && values.version !== op.version)
    throw new WorkbenchError(
      "version_conflict",
      "El expediente cambió. Recarga antes de guardar.",
    );
  const find = <T extends { id: string }>(rows: T[]): T => {
    const row = rows.find((item) => item.id === command.id);
    if (!row)
      throw new WorkbenchError(
        "not_found",
        "No se encontró el registro en esta empresa.",
      );
    return row;
  };
  const requireOp = (): Opportunity => {
    if (!op) throw new WorkbenchError("not_found", "Selecciona un expediente.");
    return op;
  };
  switch (command.type) {
    case "triage":
      requireAction(context, "edit");
      requireOp().triage = z
        .enum(["Por revisar", "Interesada", "Descartada"])
        .parse(values.triage);
      requireOp().triageReason = text.parse(values.reason);
      break;
    case "owner":
      requireAction(context, "edit");
      if (!store.members.some((member) => member.name === values.owner))
        throw new WorkbenchError(
          "invalid_owner",
          "Selecciona una persona autorizada.",
        );
      requireOp().owner = str(values, "owner");
      break;
    case "source.configure": {
      requireAction(context, "source");
      const source = find(store.sources);
      if (!source.available)
        throw new WorkbenchError(
          "source_unavailable",
          "El módulo de este país aún no está habilitado.",
        );
      source.enabled = z.boolean().parse(values.enabled);
      source.interval = z.coerce
        .number()
        .int()
        .min(15)
        .max(1440)
        .parse(values.interval);
      source.authorized = z.boolean().parse(values.authorized);
      source.termsVersion = text.parse(values.termsVersion);
      break;
    }
    case "source.run": {
      requireAction(context, "source");
      const source = find(store.sources);
      if (!source.enabled || !source.authorized)
        throw new WorkbenchError(
          "terms_required",
          "Activa la fuente y registra la autorización de términos antes de simular el lote.",
        );
      job(store, "Ingesta de lote", "");
      break;
    }
    case "search.save": {
      const parsed = z
        .object({
          name: text.max(100),
          query: z.string(),
          region: z.string(),
          modality: z.string(),
          source: z.string(),
          minAmount: z.string(),
          maxAmount: z.string(),
          from: z.string(),
          until: z.string(),
          active: z.boolean(),
        })
        .parse(values);
      validateFilters({ ...parsed, stage: "" });
      if (command.id) Object.assign(find(store.searches), parsed);
      else store.searches.push({ id: crypto.randomUUID(), ...parsed });
      break;
    }
    case "search.delete":
      store.searches = store.searches.filter(
        (item) => item.id !== find(store.searches).id,
      );
      break;
    case "alert.read":
      find(store.alerts).read = z.boolean().parse(values.read);
      break;
    case "alert.mute": {
      const alert = find(store.alerts);
      const until = optional(values, "until");
      if (until) date.parse(until);
      alert.mutedUntil = until;
      break;
    }
    case "comment.add":
      requireAction(context, "comment");
      store.comments.push({
        id: crypto.randomUUID(),
        opportunityId: requireOp().id,
        author: actorName(context.role),
        text: text.max(2000).parse(values.text),
        at: new Date().toISOString(),
      });
      break;
    case "document.upload": {
      requireAction(context, "edit");
      const name = text.max(200).parse(values.name);
      const size = z
        .number()
        .positive()
        .max(20 * 1024 * 1024)
        .parse(values.size);
      store.documents.push({
        id: crypto.randomUUID(),
        opportunityId: requireOp().id,
        name,
        category: "Anexo",
        version: 1,
        hash: str(values, "hash"),
        status: "Quarantined",
        size: `${Math.ceil(size / 1024)} KB`,
        uploadedAt: new Date().toISOString(),
        review: "Pendiente",
        reviewer: "",
        comment: "",
        content: "",
        locator: "",
        supersedes: null,
        engine: "Pendiente de circuito seguro",
        confidence: null,
      });
      break;
    }
    case "document.review": {
      requireAction(context, "edit");
      const document = find(store.documents);
      if (
        document.opportunityId !== requireOp().id ||
        document.status !== "Available"
      )
        throw new WorkbenchError(
          "document_unavailable",
          "Solo se pueden revisar archivos disponibles de este expediente.",
        );
      document.review = z.enum(["Revisado", "Devuelto"]).parse(values.review);
      document.comment = text.parse(values.comment);
      document.reviewer = actorName(context.role);
      break;
    }
    case "document.adenda": {
      requireAction(context, "edit");
      const document = find(store.documents);
      if (
        document.opportunityId !== requireOp().id ||
        document.status !== "Available"
      )
        throw new WorkbenchError(
          "document_unavailable",
          "Selecciona un documento disponible.",
        );
      const next = {
        ...document,
        id: crypto.randomUUID(),
        version: document.version + 1,
        supersedes: document.id,
        hash: "d".repeat(64),
        name: `Adenda ${document.version} · ${document.name}`,
        review: "Pendiente" as const,
        reviewer: "",
        comment: "",
        uploadedAt: new Date().toISOString(),
      };
      store.documents.push(next);
      requireOp().stale = true;
      for (const approval of store.approvals.filter(
        (item) => item.opportunityId === op?.id,
      ))
        approval.status = "Invalidada por adenda";
      store.alerts.unshift({
        id: crypto.randomUUID(),
        opportunityId: requireOp().id,
        title: "Nueva adenda en el expediente",
        reason:
          "Se conserva el original. Revisa requisitos, fechas y aprobaciones afectadas.",
        kind: "Adenda",
        urgency: "Alta",
        read: false,
        mutedUntil: "",
        at: new Date().toISOString(),
      });
      break;
    }
    case "requirement.review": {
      requireAction(context, "edit");
      const req = find(store.requirements);
      if (req.opportunityId !== requireOp().id)
        throw new WorkbenchError("not_found", "Requisito no disponible.");
      req.status = z
        .enum([
          "Cumple",
          "No cumple",
          "Pendiente de evidencia",
          "Indeterminado",
          "No aplica",
        ])
        .parse(values.status);
      req.evidence = text.parse(values.evidence);
      req.action = text.parse(values.action);
      break;
    }
    case "analysis.run":
      requireAction(context, "edit");
      job(store, "Reevaluación", requireOp().id);
      break;
    case "approval.request":
      requireAction(context, "edit");
      for (const approval of store.approvals.filter(
        (item) => item.opportunityId === requireOp().id,
      )) {
        approval.status = "Pendiente";
        approval.analysisVersion = requireOp().analysisVersion;
      }
      break;
    case "approval.respond": {
      requireAction(context, "approve");
      const approval = find(store.approvals);
      if (approval.opportunityId !== requireOp().id || requireOp().stale)
        throw new WorkbenchError(
          "stale_analysis",
          "Reevalúa el expediente antes de aprobar.",
        );
      const allowed: Record<string, ViewRole> = {
        Jurídica: "Legal",
        Financiera: "Financial",
        Técnica: "Analyst",
      };
      if (context.role !== allowed[approval.discipline])
        throw new WorkbenchError(
          "permission_denied",
          "Tu función no puede aprobar esta disciplina.",
        );
      approval.status = z.enum(["Aprobada", "Devuelta"]).parse(values.status);
      approval.comment = text.parse(values.comment);
      approval.actor = actorName(context.role);
      approval.date = new Date().toISOString();
      approval.analysisVersion = requireOp().analysisVersion;
      break;
    }
    case "waiver.create": {
      requireAction(context, "decide");
      const requirementId = str(values, "requirementId");
      if (
        !store.requirements.some(
          (req) =>
            req.id === requirementId && req.opportunityId === requireOp().id,
        )
      )
        throw new WorkbenchError(
          "invalid_reference",
          "Selecciona un requisito del expediente.",
        );
      const until = date.parse(values.until);
      if (until < referenceDate)
        throw new WorkbenchError(
          "expired_waiver",
          "La excepción ya estaría vencida.",
        );
      store.waivers.push({
        id: crypto.randomUUID(),
        opportunityId: requireOp().id,
        requirementId,
        reason: text.min(10).parse(values.reason),
        until,
        actor: actorName(context.role),
      });
      break;
    }
    case "decision.record": {
      requireAction(context, "decide");
      const result = z.enum(["BID", "NO_BID"]).parse(values.result);
      const reason = text.min(10).parse(values.reason);
      if (result === "BID" && blockers(store, requireOp().id).length)
        throw new WorkbenchError(
          "decision_blocked",
          "Resuelve los bloqueos y las aprobaciones o registra las excepciones autorizadas.",
        );
      store.decisions.push({
        id: crypto.randomUUID(),
        opportunityId: requireOp().id,
        result,
        reason,
        actor: actorName(context.role),
        date: new Date().toISOString(),
        analysisVersion: requireOp().analysisVersion,
        version:
          store.decisions.filter((item) => item.opportunityId === op?.id)
            .length + 1,
      });
      requireOp().stage = result === "BID" ? "Preparación" : "Cerrada";
      break;
    }
    case "baseline.freeze":
      requireAction(context, "decide");
      store.baselines.push({
        id: crypto.randomUUID(),
        opportunityId: requireOp().id,
        analysisVersion: requireOp().analysisVersion,
        profileVersion: 1,
        ruleVersion: 1,
        at: new Date().toISOString(),
        actor: actorName(context.role),
        documents: store.documents
          .filter(
            (doc) => doc.opportunityId === op?.id && doc.status === "Available",
          )
          .map((doc) => ({ id: doc.id, version: doc.version, hash: doc.hash })),
      });
      break;
    case "escalation.create":
      requireAction(context, "comment");
      store.escalations.push({
        id: crypto.randomUUID(),
        opportunityId: requireOp().id,
        title: text.parse(values.title),
        severity: z.enum(["Alta", "Media", "Baja"]).parse(values.severity),
        owner: text.parse(values.owner),
        due: date.parse(values.due),
        status: "Abierta",
        resolution: "",
      });
      break;
    case "escalation.resolve":
      requireAction(context, "edit");
      find(store.escalations).resolution = text
        .min(10)
        .parse(values.resolution);
      find(store.escalations).status = "Resuelta";
      break;
    case "checklist.generate":
      requireAction(context, "edit");
      for (const req of store.requirements.filter(
        (item) => item.opportunityId === requireOp().id && item.mandatory,
      ))
        if (!store.checklist.some((item) => item.requirementId === req.id)) {
          const taskId = crypto.randomUUID();
          store.checklist.push({
            id: crypto.randomUUID(),
            opportunityId: requireOp().id,
            requirementId: req.id,
            title: req.title,
            owner: req.owner,
            due: requireOp().closesAt.slice(0, 10),
            state: "Pendiente",
            dependencyId: null,
            evidenceId: "",
            note: "",
            manualDate: false,
            taskId,
          });
          store.tasks.push({
            id: taskId,
            opportunityId: requireOp().id,
            title: req.title,
            owner: req.owner,
            due: requireOp().closesAt.slice(0, 10),
            state: "Pendiente",
            priority: "Media",
            note: "",
            evidenceId: "",
            manualDate: false,
            version: 1,
          });
        }
      break;
    case "checklist.update": {
      requireAction(context, "edit");
      const item = find(store.checklist);
      if (item.opportunityId !== requireOp().id)
        throw new WorkbenchError("not_found", "Entregable no disponible.");
      const state = z
        .enum(["Pendiente", "En curso", "Bloqueado", "Completado"])
        .parse(values.state);
      const evidenceId = optional(values, "evidenceId");
      const note = text.parse(values.note);
      if (!store.members.some((member) => member.name === values.owner))
        throw new WorkbenchError(
          "invalid_owner",
          "Selecciona una persona autorizada.",
        );
      if (state === "Completado") {
        if (
          item.dependencyId &&
          store.checklist.find((row) => row.id === item.dependencyId)?.state !==
            "Completado"
        )
          throw new WorkbenchError(
            "dependency_pending",
            "Completa la dependencia antes de cerrar este entregable.",
          );
        if (
          !store.documents.some(
            (doc) =>
              doc.id === evidenceId &&
              doc.opportunityId === op?.id &&
              doc.status === "Available",
          )
        )
          throw new WorkbenchError(
            "evidence_required",
            "Selecciona evidencia disponible del expediente.",
          );
      }
      Object.assign(item, {
        state,
        evidenceId,
        note,
        owner: str(values, "owner"),
        due: date.parse(values.due),
        manualDate: z.boolean().parse(values.manualDate),
      });
      const task = store.tasks.find((task) => task.id === item.taskId);
      if (task)
        Object.assign(task, {
          state,
          evidenceId,
          note,
          owner: item.owner,
          due: item.due,
          manualDate: item.manualDate,
          version: task.version + 1,
        });
      break;
    }
    case "task.save": {
      requireAction(context, "edit");
      const owner = text.parse(values.owner);
      if (!store.members.some((member) => member.name === owner))
        throw new WorkbenchError(
          "invalid_owner",
          "Selecciona una persona autorizada.",
        );
      const state = z
        .enum(["Pendiente", "En curso", "Bloqueado", "Completado"])
        .parse(values.state);
      const note = optional(values, "note");
      const evidenceId = optional(values, "evidenceId");
      if (state === "Completado" && !note.trim() && !evidenceId)
        throw new WorkbenchError(
          "evidence_required",
          "Añade una nota o evidencia antes de completar la tarea.",
        );
      if (
        evidenceId &&
        !store.documents.some(
          (doc) =>
            doc.id === evidenceId &&
            doc.opportunityId === requireOp().id &&
            doc.status === "Available",
        )
      )
        throw new WorkbenchError(
          "invalid_reference",
          "La evidencia no está disponible en este expediente.",
        );
      const parsed = {
        title: text.parse(values.title),
        owner,
        due: date.parse(values.due),
        state,
        priority: z.enum(["Alta", "Media", "Baja"]).parse(values.priority),
        note,
        evidenceId,
        manualDate: z.boolean().parse(values.manualDate),
      };
      if (command.id) {
        const task = find(store.tasks);
        if (task.opportunityId !== requireOp().id)
          throw new WorkbenchError("not_found", "Tarea no disponible.");
        if (task.state === "Completado" && state !== "Completado")
          throw new WorkbenchError(
            "closed_task",
            "Una tarea cerrada requiere un proceso explícito de reapertura.",
          );
        const item = store.checklist.find((item) => item.taskId === task.id);
        if (item && state === "Completado") {
          if (
            item.dependencyId &&
            store.checklist.find((row) => row.id === item.dependencyId)
              ?.state !== "Completado"
          )
            throw new WorkbenchError(
              "dependency_pending",
              "Completa la dependencia antes de cerrar este entregable.",
            );
          if (!evidenceId)
            throw new WorkbenchError(
              "evidence_required",
              "Selecciona evidencia disponible del expediente.",
            );
        }
        Object.assign(task, parsed, { version: task.version + 1 });
        if (item)
          Object.assign(item, {
            state,
            note,
            evidenceId,
            owner,
            due: parsed.due,
            manualDate: parsed.manualDate,
          });
      } else
        store.tasks.push({
          id: crypto.randomUUID(),
          opportunityId: requireOp().id,
          version: 1,
          ...parsed,
        });
      break;
    }
    case "package.generate":
      requireAction(context, "edit");
      if (
        store.checklist.some(
          (item) =>
            item.opportunityId === requireOp().id &&
            item.state !== "Completado",
        )
      )
        throw new WorkbenchError(
          "not_ready",
          "Completa los entregables pendientes antes de generar el manifiesto de prueba.",
        );
      job(store, "Paquete de propuesta", requireOp().id);
      break;
    case "matrix.export":
      job(store, "Exportación de matriz", requireOp().id);
      break;
    case "sync.account":
      requireAction(context, "commercial");
      requireOp().account = text.min(5).parse(values.account);
      break;
    case "sync.link": {
      requireAction(context, "commercial");
      if (!requireOp().account)
        throw new WorkbenchError(
          "account_required",
          "Resuelve primero la cuenta compradora.",
        );
      if (
        store.decisions.filter((item) => item.opportunityId === op?.id).at(-1)
          ?.result !== "BID"
      )
        throw new WorkbenchError(
          "bid_required",
          "Se necesita una decisión BID autorizada.",
        );
      if (!store.sync.some((item) => item.opportunityId === op?.id))
        store.sync.push({
          id: crypto.randomUUID(),
          opportunityId: requireOp().id,
          status: "Vinculada (demo)",
          direction: "TenderOps → Dynamics",
          lastSync: new Date().toISOString(),
          account: requireOp().account!,
          externalId: `DEMO-OPP-${store.sync.length + 1}`,
          conflictField: "",
          localValue: "",
          remoteValue: "",
          resolution: "",
          currency: requireOp().currency,
          manualFields: ["Nombre comercial", "Propietario comercial"],
        });
      break;
    }
    case "sync.resolve":
      requireAction(context, "commercial");
      find(store.sync).resolution = z
        .enum([
          "Conservar valor manual de Dynamics",
          "Aplicar valor de TenderOps autorizado",
        ])
        .parse(values.resolution);
      find(store.sync).status = "Reconciliada (demo)";
      break;
    case "sync.reconcile":
      requireAction(context, "commercial");
      job(store, "Reconciliación", "");
      break;
    case "sync.close":
      requireAction(context, "commercial");
      if (!store.sync.some((item) => item.opportunityId === requireOp().id))
        throw new WorkbenchError(
          "link_required",
          "No existe vínculo comercial.",
        );
      requireOp().outcomeReason = text.min(10).parse(values.reason);
      requireOp().outcome = z.enum(["Ganada", "Perdida"]).parse(values.outcome);
      requireOp().stage = "Cerrada";
      break;
    case "company-document.save": {
      requireAction(context, "edit");
      const document = find(store.companyDocuments);
      const issuedOn = date.parse(values.issuedOn);
      const validUntil = date.parse(values.validUntil);
      if (issuedOn > validUntil)
        throw new WorkbenchError(
          "invalid_range",
          "La vigencia no puede terminar antes de la emisión.",
        );
      document.issuedOn = issuedOn;
      document.validUntil = validUntil;
      document.source = text.parse(values.source);
      document.version++;
      document.status =
        validUntil < referenceDate ? "Vencido" : "Revisión requerida";
      break;
    }
    case "slo.save":
      requireAction(context, "operations");
      Object.assign(find(store.serviceObjectives), {
        target: text.parse(values.target),
        window: text.parse(values.window),
        exclusions: text.parse(values.exclusions),
        status: "Propuesto",
      });
      break;
    case "job.retry": {
      requireAction(context, "operations");
      const item = find(store.jobs);
      if (!item.transient || item.status !== "Fallido")
        throw new WorkbenchError(
          "permanent_failure",
          "Solo se reintentan fallos transitorios después de revisar su causa.",
        );
      item.status = "Pendiente";
      item.attempts++;
      item.polls = 0;
      item.error = "";
      break;
    }
    case "preferences.save":
      Object.assign(
        store.preferences,
        z
          .object({
            email: z.boolean(),
            teams: z.boolean(),
            internal: z.boolean(),
            quietStart: z.iso.time({ precision: -1 }),
            quietEnd: z.iso.time({ precision: -1 }),
            timezone: text,
            warningDays: z.coerce.number().int().min(1).max(365),
          })
          .parse(values),
      );
      break;
    case "retention.save":
      requireAction(context, "legal");
      store.preferences.retentionDays = z
        .string()
        .regex(/^$|^[1-9]\d{0,3}$/)
        .parse(values.retentionDays);
      store.preferences.legalHold = z.boolean().parse(values.legalHold);
      break;
    default:
      throw new WorkbenchError(
        "unsupported_command",
        "La acción no está disponible.",
      );
  }
  if (op) op.version++;
  store.audit.unshift({
    id: crypto.randomUUID(),
    opportunityId: op?.id ?? "",
    action: command.type,
    actor: actorName(context.role),
    at: new Date().toISOString(),
    detail:
      "Cambio en datos sintéticos de esta empresa. No se envió a sistemas externos.",
    correlationId: commandId,
  });
  stores.set(context.companyId, store);
  receipts.set(receiptKey, fingerprint);
}
export function validateFilters(filters: Filters): void {
  const amount = z
    .string()
    .regex(/^$|^\d{1,24}(\.\d{1,4})?$/, "Usa cifras sin separadores de miles.");
  amount.parse(filters.minAmount);
  amount.parse(filters.maxAmount);
  if (
    filters.minAmount &&
    filters.maxAmount &&
    units(filters.minAmount) > units(filters.maxAmount)
  )
    throw new WorkbenchError(
      "invalid_range",
      "El valor mínimo no puede superar el máximo.",
    );
  if (filters.from) date.parse(filters.from);
  if (filters.until) date.parse(filters.until);
  if (filters.from && filters.until && filters.from > filters.until)
    throw new WorkbenchError(
      "invalid_range",
      "La fecha inicial no puede superar la final.",
    );
}
function units(value: string): bigint {
  const [whole, decimal = ""] = value.split(".");
  return BigInt(whole) * 10000n + BigInt(decimal.padEnd(4, "0"));
}
export function filterOpportunities(
  rows: Opportunity[],
  filters: Filters,
): Opportunity[] {
  validateFilters(filters);
  const normalize = (value: string): string =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return rows.filter(
    (row) =>
      (!filters.query ||
        normalize(`${row.title} ${row.reference} ${row.buyer}`).includes(
          normalize(filters.query),
        )) &&
      (!filters.region || row.region === filters.region) &&
      (!filters.modality || row.modality === filters.modality) &&
      (!filters.source || row.source === filters.source) &&
      (!filters.stage || row.stage === filters.stage) &&
      (!filters.minAmount || units(row.amount) >= units(filters.minAmount)) &&
      (!filters.maxAmount || units(row.amount) <= units(filters.maxAmount)) &&
      (!filters.from || row.closesAt.slice(0, 10) >= filters.from) &&
      (!filters.until || row.closesAt.slice(0, 10) <= filters.until),
  );
}
export function resetDemo(): void {
  stores.clear();
  receipts.clear();
}
