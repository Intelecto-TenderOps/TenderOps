import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { ProgressRing } from "@/components/viz/ProgressRing";
import { SelectionChips } from "@/components/selection";
import { prettyLabel } from "@/lib/format";
import { professionalsService } from "@/services/professionalsService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function PersonalPropuestoPage() {
  const { id = "" } = useParams();
  const workspace = useDemoStore((state) => state.workspace);
  const tender = workspace.tenders.find((item) => item.secopId === id || item.id === id);
  const openFlow = useDrawerStore((state) => state.openFlow);
  const roles = workspace.staffRoles.filter((item) => item.tenderId === tender?.id);
  const assignments = workspace.staffAssignments.filter((item) => item.tenderId === tender?.id);
  const resumes = workspace.generatedResumes.filter((item) => item.tenderId === tender?.id);
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id);
  const selected = roles.find((item) => item.id === selectedRoleId) ?? roles[0];
  const assigned = assignments.filter((item) => item.roleId === selected?.id);
  const filled = useMemo(() => {
    const needed = roles.reduce((sum, item) => sum + item.quantity, 0);
    return needed ? Math.round((assignments.length / needed) * 100) : 0;
  }, [roles, assignments.length]);

  return (
    <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
      <div className="grid gap-3">
        <article className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-[24px] p-4">
          <div className="flex items-center gap-3">
            <ProgressRing value={filled} label="Personal" />
            <div>
              <h2 className="text-lg font-semibold">Personal propuesto</h2>
              <p className="text-sm text-muted">{roles.length} perfiles exigidos · {assignments.length} profesionales asignados · {resumes.length} hojas de vida</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openFlow({ type: "staff-role", title: "Registrar perfil requerido", payload: { tenderId: tender?.id } })}>
              Registrar perfil
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                assignments.forEach((item) => {
                  const professional = workspace.professionals.find((row) => row.id === item.professionalId);
                  openFlow({
                    type: "resume-builder",
                    title: "Generar hojas de vida del equipo",
                    size: "extraWide",
                    steps: ["Identificación", "Datos", "Estudios", "Experiencias", "Certificaciones", "Acreditaciones", "Vista previa", "Generación"],
                    payload: { professionalId: item.professionalId, tenderId: tender?.id, roleId: item.roleId, proposedRoleName: professional?.primaryProfile },
                  });
                });
              }}
            >
              Generar hojas de vida del equipo
            </Button>
          </div>
        </article>
        {roles.map((role) => {
          const people = assignments.filter((item) => item.roleId === role.id);
          return (
            <article key={role.id} className={`glass-panel rounded-[24px] p-4 ${selectedRoleId === role.id ? "ring-1 ring-electric/40" : ""}`}>
              <button type="button" className="w-full text-left" onClick={() => setSelectedRoleId(role.id)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{role.name}</h3>
                    <p className="text-xs text-muted">{role.quantity} requerido(s) · {role.educationLevel} · {role.specificMonths} meses específicos · {role.sourceDocument ?? "registro manual"}</p>
                  </div>
                  <StatusBadge value={people.length >= role.quantity ? "cumple" : "pendiente"} />
                </div>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                {people.map((item) => (
                  <StatusBadge key={item.id} value={item.match.outcome} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openFlow({ type: "select-professional", title: `Seleccionar ${role.name}`, size: "wide", payload: { roleId: role.id, tenderId: tender?.id } })}>
                  Seleccionar profesional
                </Button>
                {people.map((item) => {
                  const professional = workspace.professionals.find((row) => row.id === item.professionalId);
                  return (
                    <Button
                      key={item.id}
                      size="sm"
                      onClick={() =>
                        openFlow({
                          type: "resume-builder",
                          title: `HV · ${professional?.fullName}`,
                          size: "extraWide",
                          steps: ["Identificación", "Datos", "Estudios", "Experiencias", "Certificaciones", "Acreditaciones", "Vista previa", "Generación"],
                          payload: { professionalId: item.professionalId, tenderId: tender?.id, roleId: role.id },
                        })
                      }
                    >
                      HV {professional?.givenName}
                    </Button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
      {selected ? (
        <ContextDetailPanel title={selected.name}>
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-muted">Estudios</dt><dd>{selected.educationLevel || "No exigido"}</dd></div>
            <div><dt className="text-muted">Profesiones</dt><dd>{selected.acceptedProfessions.join(", ") || "Abiertas"}</dd></div>
            <div><dt className="text-muted">Experiencia específica</dt><dd>{selected.specificMonths} meses · {selected.specificCriteria || "sin criterio"}</dd></div>
            <div><dt className="text-muted">Fuente</dt><dd>{selected.sourceDocument ?? "Captura manual. Copilot Studio no está conectado."}</dd></div>
          </dl>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Asignados</h3>
          <ul className="mt-2 grid gap-2">
            {assigned.map((item) => {
              const professional = workspace.professionals.find((row) => row.id === item.professionalId);
              const resume = resumes.find((row) => row.id === item.resumeId || (row.professionalId === item.professionalId && row.roleId === item.roleId));
              return (
                <li key={item.id} className="rounded-2xl bg-white/70 px-3 py-2 text-sm">
                  <p className="font-medium">{professional?.fullName}</p>
                  <p className="text-xs text-muted">{prettyLabel(item.match.outcome)} · HV {resume ? prettyLabel(resume.status) : "sin generar"}</p>
                  <SelectionChips items={item.match.reasons.slice(0, 3).map((reason, index) => ({ id: `${item.id}-${index}`, label: reason }))} />
                  {resume ? (
                    <Button size="sm" className="mt-2" onClick={() => void professionalsService.approve(resume.id)}>
                      Aprobar HV
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </ContextDetailPanel>
      ) : (
        <article className="glass-panel rounded-[24px] p-4 text-sm text-muted">Registre los perfiles exigidos por la entidad. Si Copilot Studio no está conectado, la captura es manual.</article>
      )}
    </section>
  );
}
