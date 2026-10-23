import { beforeEach, describe, expect, it } from "vitest";
import {
  blockers,
  execute,
  filterOpportunities,
  readWorkspace,
  resetDemo,
  WorkbenchError,
} from "./repository";
import { day, money } from "./ui";
import type { Filters, ViewRole, WorkbenchContext } from "./types";

const context = (
  role: ViewRole = "Administrator",
  companyId = "demo-company-1",
): WorkbenchContext => ({
  companyId,
  companyName: "Ejemplo",
  demo: true,
  role,
  csrf: "",
  permissions: [],
  base: "/demo",
});
const filters: Filters = {
  query: "",
  region: "",
  modality: "",
  source: "",
  minAmount: "",
  maxAmount: "",
  from: "",
  until: "",
  stage: "",
};
beforeEach(() => resetDemo());
describe("Repositorio de demostración del frontend", () => {
  it("mantiene dos empresas y rechaza referencias de expedientes ajenos", async () => {
    const a = await readWorkspace(context());
    const b = await readWorkspace(context("Administrator", "demo-company-2"));
    expect(a.opportunities[0].id).not.toBe(b.opportunities[0].id);
    await expect(
      execute(context("Administrator", "demo-company-2"), {
        type: "comment.add",
        opportunityId: a.opportunities[0].id,
        values: { text: "Comentario ajeno" },
      }),
    ).rejects.toThrow("no existe en esta empresa");
    expect(
      (await readWorkspace(context("Administrator", "demo-company-2")))
        .comments,
    ).toHaveLength(0);
  });
  it("valida todos los instantes del fixture y conserva dinero sin pasar por Number", async () => {
    const data = await readWorkspace(context());
    expect(
      data.opportunities.every((op) =>
        Number.isFinite(Date.parse(op.closesAt)),
      ),
    ).toBe(true);
    expect(day("valor inválido")).toBe("Fecha por revisar");
    expect(money("999999999999999999.1234")).toBe(
      "COP 999.999.999.999.999.999,1234",
    );
    expect(
      filterOpportunities(data.opportunities, {
        ...filters,
        query: "gestion documental",
      }),
    ).toHaveLength(1);
    expect(() =>
      filterOpportunities(data.opportunities, {
        ...filters,
        minAmount: "100",
        maxAmount: "10",
      }),
    ).toThrow("mínimo");
    const exact = [
      { ...data.opportunities[0], amount: "999999999999999999.1234" },
    ];
    expect(
      filterOpportunities(exact, {
        ...filters,
        minAmount: "999999999999999999.1235",
      }),
    ).toHaveLength(0);
  });
  it("impide mutaciones por función y nunca cae silenciosamente a fixtures en modo real", async () => {
    const command = {
      type: "triage",
      opportunityId: "demo-a-op-1",
      values: { triage: "Interesada", reason: "Motivo suficiente" },
    };
    await expect(execute(context("Auditor"), command)).rejects.toThrow(
      "función",
    );
    await expect(
      readWorkspace({ ...context(), demo: false }),
    ).rejects.toBeInstanceOf(WorkbenchError);
  });
  it("deduplica comandos y detecta una clave reutilizada con otro contenido", async () => {
    const command = {
      type: "comment.add",
      opportunityId: "demo-a-op-1",
      values: { text: "Nota de revisión" },
    };
    await execute(context(), command, "same-command");
    await execute(context(), command, "same-command");
    expect((await readWorkspace(context())).comments).toHaveLength(1);
    await expect(
      execute(
        context(),
        { ...command, values: { text: "Distinta" } },
        "same-command",
      ),
    ).rejects.toThrow("otra acción");
  });
  it("conserva originales y línea base al recibir una adenda", async () => {
    await execute(context("Approver"), {
      type: "baseline.freeze",
      opportunityId: "demo-a-op-1",
      values: {},
    });
    const before = await readWorkspace(context());
    const doc = before.documents[0];
    const frozen = JSON.stringify(before.baselines[0]);
    await execute(context(), {
      type: "document.adenda",
      id: doc.id,
      opportunityId: doc.opportunityId,
      values: {},
    });
    const after = await readWorkspace(context());
    expect(after.documents.find((item) => item.id === doc.id)).toEqual(doc);
    expect(
      after.documents.filter(
        (item) => item.opportunityId === doc.opportunityId,
      ),
    ).toHaveLength(4);
    expect(JSON.stringify(after.baselines[0])).toBe(frozen);
    expect(after.opportunities[0].stale).toBe(true);
    expect(
      after.approvals
        .filter((item) => item.opportunityId === doc.opportunityId)
        .every((item) => item.status === "Invalidada por adenda"),
    ).toBe(true);
  });
  it("rechaza BID antes de la revisión y lo permite con evidencia y aprobaciones de cada disciplina", async () => {
    const opportunityId = "demo-a-op-1";
    await expect(
      execute(context("Approver"), {
        type: "decision.record",
        opportunityId,
        values: { result: "BID", reason: "Decisión de comité con evidencia." },
      }),
    ).rejects.toThrow("bloqueos");
    let data = await readWorkspace(context());
    for (const req of data.requirements.filter(
      (item) => item.opportunityId === opportunityId,
    ))
      await execute(context("Analyst"), {
        type: "requirement.review",
        opportunityId,
        id: req.id,
        values: {
          status: "Cumple",
          evidence: "Soporte sintético cotejado por el equipo",
          action: "Verificado en la demostración",
        },
      });
    const role: Record<string, ViewRole> = {
      Jurídica: "Legal",
      Financiera: "Financial",
      Técnica: "Analyst",
    };
    for (const approval of data.approvals.filter(
      (item) => item.opportunityId === opportunityId,
    ))
      await execute(context(role[approval.discipline]), {
        type: "approval.respond",
        opportunityId,
        id: approval.id,
        values: {
          status: "Aprobada",
          comment: "Revisión de prueba por la disciplina.",
        },
      });
    data = await readWorkspace(context());
    expect(blockers(data, opportunityId)).toHaveLength(0);
    await execute(context("Approver"), {
      type: "decision.record",
      opportunityId,
      values: {
        result: "BID",
        reason: "Comité autoriza la participación de ejemplo.",
      },
    });
    expect((await readWorkspace(context())).opportunities[0].stage).toBe(
      "Preparación",
    );
    await execute(context("Commercial"), {
      type: "sync.account",
      opportunityId,
      values: { account: "Cuenta de ejemplo verificada" },
    });
    await execute(context("Commercial"), {
      type: "sync.link",
      opportunityId,
      values: {},
    });
    await execute(context("Commercial"), {
      type: "sync.link",
      opportunityId,
      values: {},
    });
    expect(
      (await readWorkspace(context())).sync.filter(
        (item) => item.opportunityId === opportunityId,
      ),
    ).toHaveLength(1);
  });
  it("exige evidencia disponible para cerrar entregables y sincroniza su tarea", async () => {
    const data = await readWorkspace(context());
    const item = data.checklist[1];
    const document = data.documents.find(
      (doc) =>
        doc.opportunityId === item.opportunityId && doc.status === "Available",
    )!;
    const values = {
      state: "Completado",
      owner: item.owner,
      due: item.due,
      manualDate: true,
      note: "Cierre de prueba con soporte",
      evidenceId: "",
    };
    await expect(
      execute(context(), {
        type: "checklist.update",
        opportunityId: item.opportunityId,
        id: item.id,
        values,
      }),
    ).rejects.toThrow("evidencia");
    await execute(context(), {
      type: "checklist.update",
      opportunityId: item.opportunityId,
      id: item.id,
      values: { ...values, evidenceId: document.id },
    });
    const after = await readWorkspace(context());
    expect(after.tasks.find((task) => task.id === item.taskId)?.state).toBe(
      "Completado",
    );
    expect(after.checklist.find((row) => row.id === item.id)?.manualDate).toBe(
      true,
    );
  });
  it("registra el trabajo antes de procesarlo y entrega un resultado con citas y versión", async () => {
    await execute(context(), {
      type: "matrix.export",
      opportunityId: "demo-a-op-1",
      values: {},
    });
    let data = await readWorkspace(context());
    const queued = data.jobs.find(
      (job) => job.type === "Exportación de matriz",
    )!;
    expect(queued.id).toBeTruthy();
    expect(queued.status).toBe("En curso");
    data = await readWorkspace(context());
    const result = data.jobs.find((job) => job.id === queued.id)!;
    expect(result.status).toBe("Completado");
    expect(JSON.parse(result.result).requirements).toHaveLength(6);
  });
  it("no permite eludir evidencia del checklist al cerrar desde tareas", async () => {
    const data = await readWorkspace(context());
    const task = data.tasks.find((row) => row.state !== "Completado")!;
    await expect(
      execute(context(), {
        type: "task.save",
        id: task.id,
        opportunityId: task.opportunityId,
        values: {
          ...task,
          state: "Completado",
          note: "Cierre sin documento",
          evidenceId: "",
        },
      }),
    ).rejects.toThrow(/evidencia|dependencia/);
    expect(
      (await readWorkspace(context())).tasks.find((row) => row.id === task.id)
        ?.state,
    ).toBe(task.state);
  });
  it("conserva los objetivos de servicio como propuestas y exige operación", async () => {
    const command = {
      type: "slo.save",
      id: "ingestion",
      values: {
        target: "Menos de 60 minutos",
        window: "30 días",
        exclusions: "Mantenimiento anunciado",
      },
    };
    await expect(execute(context("Auditor"), command)).rejects.toThrow(
      "función",
    );
    await execute(context(), command);
    const objective = (await readWorkspace(context())).serviceObjectives[0];
    expect(objective.target).toBe("Menos de 60 minutos");
    expect(objective.status).toBe("Propuesto");
  });
});
