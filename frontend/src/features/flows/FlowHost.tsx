import { useMemo, useState } from "react";
import { FlowDrawerBody } from "@/components/flow/FlowDrawerBody";
import { FlowDrawerFooter } from "@/components/flow/FlowDrawerFooter";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { AdvancedFilters } from "@/components/data/AdvancedFilters";
import { DataTable, RichHtmlTable, RichPrimary, RichScore, RichValue, type RichColumn } from "@/components/data/DataTable";
import { formatCop, prettyLabel } from "@/lib/format";
import { MultiSelectWithChips } from "@/components/selection";
import type { FilterChip, Recommendation, Tender } from "@/contracts";
import { departments, modalities, people } from "@/mocks/catalogs";
import { companyService } from "@/services/companyService";
import { decisionsService } from "@/services/decisionsService";
import { opportunitiesService } from "@/services/opportunitiesService";
import { tasksService } from "@/services/tasksService";
import { complianceService } from "@/services/complianceService";
import { assessmentsService } from "@/services/assessmentsService";
import { adminService } from "@/services/adminService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";
import { useUiStore } from "@/store/ui-store";
import { createId } from "@/lib/ids";
import { z } from "zod";

const experienceSchema = z.object({
  client: z.string().min(3, "Indica el cliente"),
  object: z.string().min(8, "Describe el objeto contractual"),
  contractNumber: z.string().min(3, "Indica el contrato"),
  value: z.string().min(1, "Indica el valor"),
  startDate: z.string().min(1, "Indica la fecha de inicio"),
  endDate: z.string().min(1, "Indica la fecha de fin"),
});

export function FlowHost() {
  const type = useDrawerStore((state) => state.type);
  if (type === "filters-tenders" || type === "filters-generic") return <FiltersFlow />;
  if (type === "create-experience") return <ExperienceFlow />;
  if (type === "assign-owners") return <AssignFlow />;
  if (type === "record-decision") return <DecisionFlow />;
  if (type === "create-opportunity") return <OpportunityFlow />;
  if (type === "create-task" || type === "edit-task") return <TaskFlow />;
  if (type === "edit-requirement") return <RequirementFlow />;
  if (type === "weights") return <WeightsFlow />;
  if (type === "compare-tenders") return <CompareFlow />;
  if (type === "edit-user") return <UserFlow />;
  if (type === "create-capability") return <CapabilityFlow />;
  if (type === "edit-company") return <CompanyFlow />;
  return <GenericFlow />;
}

function FiltersFlow() {
  const payload = useDrawerStore((state) => state.payload);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const apply = payload.onApply as ((chips: FilterChip[]) => void) | undefined;
  const active = (payload.active as FilterChip[]) ?? [];
  const [pending, setPending] = useState<FilterChip[]>(active);
  const fields = (payload.fields as { field: string; label: string; options: string[] }[]) ?? [
    { field: "modality", label: "Modalidad", options: modalities },
    { field: "department", label: "Departamento", options: departments },
    { field: "status", label: "Estado", options: ["abierto", "en_evaluacion", "cerrado"] },
    { field: "value", label: "Valor", options: ["Más de $100 millones"] },
  ];

  function upsert(field: string, label: string, value: string) {
    setPending((current) => {
      const next = current.filter((chip) => chip.field !== field);
      if (!value) return next;
      return [...next, { id: `${field}:${value}`, field, label, value }];
    });
  }

  return (
    <>
      <FlowDrawerBody>
        <AdvancedFilters
          active={active}
          pending={pending}
          onRemoveActive={(id) => apply?.(active.filter((chip) => chip.id !== id))}
          onRemovePending={(id) => setPending((current) => current.filter((chip) => chip.id !== id))}
          onClearActive={() => apply?.([])}
          onClearPending={() => setPending([])}
        >
          {fields.map((field) => (
            <Field key={field.field} label={field.label} htmlFor={`filter-${field.field}`}>
              <Select
                id={`filter-${field.field}`}
                aria-label={field.label}
                value={pending.find((chip) => chip.field === field.field)?.value ?? ""}
                onChange={(event) => upsert(field.field, field.label, event.target.value)}
              >
                <option value="">Todas</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </AdvancedFilters>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow(true)}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={() => {
            apply?.(pending);
            closeFlow(true);
          }}
        >
          Ver resultados
        </Button>
      </FlowDrawerFooter>
    </>
  );
}

function ExperienceFlow() {
  const step = useDrawerStore((state) => state.step);
  const setStep = useDrawerStore((state) => state.setStep);
  const setDirty = useDrawerStore((state) => state.setDirty);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const companyId = useUiStore((state) => state.companyId);
  const [form, setForm] = useState({
    client: "",
    object: "",
    contractNumber: "",
    value: "",
    startDate: "",
    endDate: "",
    location: "Bogotá D.C.",
    evidenceName: "",
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  function patch(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
    setDirty(true);
  }

  async function save() {
    const parsed = experienceSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setStatus("saving");
    try {
      await companyService.saveExperience({
        id: "",
        companyId,
        client: form.client,
        object: form.object,
        contractNumber: form.contractNumber,
        currency: "COP",
        value: Number(form.value),
        startDate: form.startDate,
        endDate: form.endDate,
        location: form.location,
        evidenceName: form.evidenceName || "Pendiente",
        evidenceSharePointId: null,
        complete: Boolean(form.evidenceName),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "Valentina Herrera",
      });
      closeFlow(true);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <FlowDrawerBody>
        {step === 0 && (
          <div className="grid gap-3">
            <Field label="Objeto" htmlFor="exp-object" error={error}>
              <Textarea id="exp-object" value={form.object} onChange={(e) => patch({ object: e.target.value })} />
            </Field>
            <Field label="Ubicación" htmlFor="exp-location">
              <Input id="exp-location" value={form.location} onChange={(e) => patch({ location: e.target.value })} />
            </Field>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-3">
            <Field label="Cliente" htmlFor="exp-client">
              <Input id="exp-client" value={form.client} onChange={(e) => patch({ client: e.target.value })} />
            </Field>
            <Field label="Contrato" htmlFor="exp-contract">
              <Input id="exp-contract" value={form.contractNumber} onChange={(e) => patch({ contractNumber: e.target.value })} />
            </Field>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-3">
            <Field label="Valor en COP" htmlFor="exp-value">
              <Input id="exp-value" type="number" value={form.value} onChange={(e) => patch({ value: e.target.value })} />
            </Field>
            <Field label="Inicio" htmlFor="exp-start">
              <Input id="exp-start" type="date" value={form.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
            </Field>
            <Field label="Fin" htmlFor="exp-end">
              <Input id="exp-end" type="date" value={form.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
            </Field>
          </div>
        )}
        {step === 3 && (
          <Field label="Documento de soporte" htmlFor="exp-evidence">
            <Input id="exp-evidence" value={form.evidenceName} onChange={(e) => patch({ evidenceName: e.target.value })} />
          </Field>
        )}
        {step === 4 && (
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-muted">Cliente</dt><dd>{form.client || "—"}</dd></div>
            <div><dt className="text-muted">Objeto</dt><dd>{form.object || "—"}</dd></div>
            <div><dt className="text-muted">Contrato</dt><dd>{form.contractNumber || "—"}</dd></div>
            <div><dt className="text-muted">Valor</dt><dd>{form.value || "—"}</dd></div>
          </dl>
        )}
        {status === "error" ? <p role="alert">No se pudo guardar la experiencia.</p> : null}
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow()}>Cancelar</Button>
        {step > 0 ? <Button onClick={() => setStep(step - 1)}>Volver</Button> : null}
        {step < 4 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)}>
            Continuar
          </Button>
        ) : (
          <Button variant="primary" onClick={save} disabled={status === "saving"}>
            {status === "saving" ? "Guardando…" : "Confirmar"}
          </Button>
        )}
      </FlowDrawerFooter>
    </>
  );
}

function AssignFlow() {
  const payload = useDrawerStore((state) => state.payload);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const [owners, setOwners] = useState<string[]>(
    (payload.owners as string[]) ?? ["Laura Méndez"],
  );
  return (
    <>
      <FlowDrawerBody>
        <MultiSelectWithChips
          id="assign-owners"
          label="Responsables"
          values={owners}
          onChange={setOwners}
          options={people.map((person) => ({ value: person.name, label: `${person.name} · ${person.role}` }))}
        />
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow(true)}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            const requirementId = payload.requirementId as string | undefined;
            const taskId = payload.taskId as string | undefined;
            if (requirementId) await complianceService.update(requirementId, { owner: owners.join(", ") });
            if (taskId) {
              const task = useDemoStore.getState().workspace.tasks.find((item) => item.id === taskId);
              if (task) await tasksService.save({ ...task, owners });
            }
            closeFlow(true);
          }}
        >
          Asignar
        </Button>
      </FlowDrawerFooter>
    </>
  );
}

function DecisionFlow() {
  const step = useDrawerStore((state) => state.step);
  const setStep = useDrawerStore((state) => state.setStep);
  const recordId = useDrawerStore((state) => state.recordId);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const [decision, setDecision] = useState<Recommendation>("BID");
  const [rationale, setRationale] = useState("");
  return (
    <>
      <FlowDrawerBody>
        {step === 0 && (
          <Field label="Decisión humana" htmlFor="dec-choice">
            <Select id="dec-choice" value={decision} onChange={(e) => setDecision(e.target.value as Recommendation)}>
              <option value="BID">BID</option>
              <option value="NO_BID">NO BID</option>
              <option value="REVISION">Revisión</option>
            </Select>
          </Field>
        )}
        {step === 1 && (
          <Field label="Justificación" htmlFor="dec-rationale">
            <Textarea id="dec-rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} />
          </Field>
        )}
        {step === 2 && (
          <p className="text-sm">
            Vas a registrar una decisión humana <strong>{decision}</strong> sobre {recordId}. La recomendación simulada se conserva aparte.
          </p>
        )}
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow()}>Cancelar</Button>
        {step > 0 ? <Button onClick={() => setStep(step - 1)}>Volver</Button> : null}
        {step < 2 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)}>Continuar</Button>
        ) : (
          <Button
            variant="primary"
            onClick={async () => {
              if (recordId) {
                await decisionsService.record({
                  tenderId: recordId,
                  decided: decision,
                  rationale,
                  decidedBy: "Valentina Herrera",
                });
              }
              closeFlow(true);
            }}
          >
            Confirmar
          </Button>
        )}
      </FlowDrawerFooter>
    </>
  );
}

function OpportunityFlow() {
  const step = useDrawerStore((state) => state.step);
  const setStep = useDrawerStore((state) => state.setStep);
  const payload = useDrawerStore((state) => state.payload);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const tender = useDemoStore((state) =>
    state.workspace.tenders.find((item) => item.id === payload.tenderId),
  );
  if (!tender) {
    return (
      <FlowDrawerBody>
        <p>Selecciona un proceso para crear la oportunidad comercial.</p>
      </FlowDrawerBody>
    );
  }
  return (
    <>
      <FlowDrawerBody>
        {step === 0 && <p className="text-sm">Proceso origen: {tender.secopId}. Se mapeará a Dynamics 365 de forma simulada.</p>}
        {step === 1 && <p className="text-sm">Cuenta compradora: {tender.entity} · {tender.entityTaxId}</p>}
        {step === 2 && (
          <p className="text-sm">
            Valor {tender.value.toLocaleString("es-CO")} COP. Se evitará duplicar si ya existe {tender.dynamicsOpportunityId ?? "sin oportunidad"}.
          </p>
        )}
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow(true)}>Cancelar</Button>
        {step > 0 ? <Button onClick={() => setStep(step - 1)}>Volver</Button> : null}
        {step < 2 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)}>Continuar</Button>
        ) : (
          <Button
            variant="primary"
            onClick={async () => {
              await opportunitiesService.create({
                tenderId: tender.id,
                dynamicsOpportunityId: tender.dynamicsOpportunityId ?? `D365-OPP-${createId("n")}`,
                dynamicsAccountId: `D365-ACC-${tender.entityTaxId}`,
                account: tender.entity,
                name: tender.object,
                value: tender.value,
                owner: tender.owner,
                stage: "calificación",
                status: "abierta",
                outcome: null,
              });
              closeFlow(true);
            }}
          >
            Registrar en Dynamics
          </Button>
        )}
      </FlowDrawerFooter>
    </>
  );
}

function TaskFlow() {
  const payload = useDrawerStore((state) => state.payload);
  const recordId = useDrawerStore((state) => state.recordId);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const existing = useDemoStore((state) => state.workspace.tasks.find((item) => item.id === recordId));
  const [title, setTitle] = useState(existing?.title ?? "");
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "2026-10-30");
  const [priority, setPriority] = useState(existing?.priority ?? "media");
  const [owners, setOwners] = useState<string[]>(existing?.owners ?? []);
  const [error, setError] = useState("");
  return (
    <>
      <FlowDrawerBody>
        <div className="grid gap-3">
          <Field label="Título" htmlFor="task-title" error={error}>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Fecha" htmlFor="task-due">
            <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Prioridad" htmlFor="task-priority">
            <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
              <option value="baja">baja</option>
              <option value="media">media</option>
              <option value="alta">alta</option>
              <option value="urgente">urgente</option>
            </Select>
          </Field>
          <MultiSelectWithChips
            id="task-owners"
            label="Responsables"
            values={owners}
            onChange={setOwners}
            options={people.map((person) => ({ value: person.name, label: person.name }))}
          />
        </div>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow()}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            if (title.trim().length < 4) {
              setError("Escribe un título con al menos 4 caracteres");
              return;
            }
            await tasksService.save({
              id: existing?.id,
              tenderId: existing?.tenderId ?? (payload.tenderId as string | null) ?? null,
              title,
              description: existing?.description ?? "",
              owners,
              status: existing?.status ?? "pendiente",
              priority,
              category: existing?.category ?? "operación",
              dueDate,
              evidence: existing?.evidence ?? null,
              dynamicsTaskId: existing?.dynamicsTaskId ?? null,
            });
            closeFlow(true);
          }}
        >
          Guardar
        </Button>
      </FlowDrawerFooter>
    </>
  );
}

function RequirementFlow() {
  const recordId = useDrawerStore((state) => state.recordId);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const requirement = useDemoStore((state) =>
    state.workspace.requirements.find((item) => item.id === recordId),
  );
  const [owner, setOwner] = useState(requirement?.owner ?? "");
  const [status, setStatus] = useState(requirement?.status ?? "abierto");
  const [copied, setCopied] = useState(requirement?.copied ?? "pendiente");
  const [notes, setNotes] = useState(requirement?.notes ?? "");
  if (!requirement) return <FlowDrawerBody>Requisito no encontrado.</FlowDrawerBody>;
  return (
    <>
      <FlowDrawerBody>
        <div className="grid gap-3">
          <p className="text-sm">{requirement.requirement}</p>
          <Field label="Responsable" htmlFor="req-owner">
            <Select id="req-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
              {people.map((person) => (
                <option key={person.id} value={person.name}>
                  {person.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="req-status">
            <Select id="req-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="abierto">abierto</option>
              <option value="en_revision">en revisión</option>
              <option value="cerrado">cerrado</option>
            </Select>
          </Field>
          <Field label="Copiado" htmlFor="req-copied">
            <Select id="req-copied" value={copied} onChange={(e) => setCopied(e.target.value as typeof copied)}>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="listo_no_cargado">Listo, pero no cargado</option>
              <option value="cargado">Cargado</option>
            </Select>
          </Field>
          <Field label="Observaciones" htmlFor="req-notes">
            <Textarea id="req-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow()}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            await complianceService.update(requirement.id, { owner, status, copied, notes });
            closeFlow(true);
          }}
        >
          Guardar
        </Button>
      </FlowDrawerFooter>
    </>
  );
}

function WeightsFlow() {
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const initial = useDemoStore((state) => state.workspace.criterionWeights);
  const [weights, setWeights] = useState(initial);
  return (
    <>
      <FlowDrawerBody>
        <div className="grid gap-3">
          {weights.map((item) => (
            <label key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{item.name}</span>
              <input
                type="number"
                className="h-10 w-20 rounded-2xl border border-[var(--to-line)] px-2"
                value={item.weight}
                onChange={(event) =>
                  setWeights((current) =>
                    current.map((row) =>
                      row.id === item.id ? { ...row, weight: Number(event.target.value) } : row,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow(true)}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            await assessmentsService.saveWeights(weights);
            closeFlow(true);
          }}
        >
          Recalcular
        </Button>
      </FlowDrawerFooter>
    </>
  );
}

function CompareFlow() {
  const payload = useDrawerStore((state) => state.payload);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const ids = (payload.ids as string[]) ?? [];
  const allTenders = useDemoStore((state) => state.workspace.tenders);
  const tenders = allTenders.filter((item) => ids.includes(item.id));
  const columns: RichColumn<Tender>[] = [
    {
      id: "proceso",
      header: "Proceso / entidad",
      grow: true,
      sortValue: (row) => row.object,
      cell: (row) => <RichPrimary kicker={row.secopId} title={row.object} detail={`${row.entity} · ${row.department}`} />,
    },
    {
      id: "presupuesto",
      header: "Presupuesto",
      sortValue: (row) => row.value,
      cell: (row) => <RichValue primary={formatCop(row.value)} secondary={row.modality} />,
    },
    {
      id: "encaje",
      header: "Encaje",
      sortValue: (row) => row.compatibility,
      cell: (row) => <RichScore value={row.compatibility} hint={`Riesgo ${prettyLabel(row.risk)}`} />,
    },
  ];
  return (
    <>
      <FlowDrawerBody>
        {tenders.length ? (
          <DataTable data={tenders} columns={columns} />
        ) : (
          <RichHtmlTable headers={["Atributo"]} rows={[["Selecciona procesos para comparar"]]} />
        )}
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button variant="primary" onClick={() => closeFlow(true)}>Cerrar</Button>
      </FlowDrawerFooter>
    </>
  );
}

function UserFlow() {
  const recordId = useDrawerStore((state) => state.recordId);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const user = useDemoStore((state) => state.workspace.memberships.find((item) => item.id === recordId));
  const [role, setRole] = useState(user?.role ?? "Analista");
  if (!user) return <FlowDrawerBody>Usuario no encontrado.</FlowDrawerBody>;
  return (
    <>
      <FlowDrawerBody>
        <Field label="Rol" htmlFor="user-role">
          <Select id="user-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            {["Administrador", "Analista", "Comercial", "Jurídico", "Financiero", "Técnico", "Lector"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </Field>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow(true)}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            await adminService.saveUser({ ...user, role });
            closeFlow(true);
          }}
        >
          Guardar
        </Button>
      </FlowDrawerFooter>
    </>
  );
}

function CapabilityFlow() {
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const companyId = useUiStore((state) => state.companyId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validUntil, setValidUntil] = useState("2030-12-31");
  const [sectors, setSectors] = useState<string[]>(["Tecnología"]);
  const [error, setError] = useState("");
  return (
    <>
      <FlowDrawerBody>
        <div className="grid gap-3">
          <Field label="Nombre de la capacidad" htmlFor="cap-name" error={error}>
            <Input id="cap-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Descripción" htmlFor="cap-desc">
            <Textarea id="cap-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Vigente hasta" htmlFor="cap-valid">
            <Input id="cap-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
          <MultiSelectWithChips
            id="cap-sectors"
            label="Sectores"
            values={sectors}
            onChange={setSectors}
            options={["Tecnología", "Ciberseguridad", "Gestión documental", "Analítica"].map((item) => ({
              value: item,
              label: item,
            }))}
          />
        </div>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow()}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            if (!name.trim()) {
              setError("Indica el nombre de la capacidad");
              return;
            }
            await companyService.saveCapability({
              id: "",
              companyId,
              name,
              description,
              sector: sectors[0] ?? "Tecnología",
              country: "CO",
              validUntil,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: "Valentina Herrera",
            });
            closeFlow(true);
          }}
        >
          Guardar
        </Button>
      </FlowDrawerFooter>
    </>
  );
}

function CompanyFlow() {
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const companyId = useUiStore((state) => state.companyId);
  const company = useDemoStore((state) => state.workspace.companies.find((item) => item.id === companyId));
  const [legalName, setLegalName] = useState(company?.legalName ?? "");
  if (!company) return <FlowDrawerBody>Empresa no encontrada.</FlowDrawerBody>;
  return (
    <>
      <FlowDrawerBody>
        <Field label="Razón social" htmlFor="co-name">
          <Input id="co-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </Field>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow(true)}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            await companyService.saveCompany({ ...company, legalName });
            closeFlow(true);
          }}
        >
          Guardar
        </Button>
      </FlowDrawerFooter>
    </>
  );
}

function GenericFlow() {
  const type = useDrawerStore((state) => state.type);
  const payload = useDrawerStore((state) => state.payload);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const details = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  return (
    <>
      <FlowDrawerBody>
        <p className="text-sm">
          Flujo simulado <strong>{type}</strong>. Los cambios se registran en el espacio de demostración.
        </p>
        <pre className="mt-3 overflow-auto rounded-2xl bg-mist p-3 text-xs">{details}</pre>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow(true)}>Cancelar</Button>
        <Button variant="primary" onClick={() => closeFlow(true)}>
          Confirmar
        </Button>
      </FlowDrawerFooter>
    </>
  );
}
