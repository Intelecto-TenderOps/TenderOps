import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/viz/ProgressRing";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function PreparacionProcesoPage() {
  const { id = "" } = useParams();
  const workspace = useDemoStore((state) => state.workspace);
  const tender = workspace.tenders.find((item) => item.secopId === id || item.id === id);
  const tasks = workspace.tasks.filter((item) => item.tenderId === tender?.id);
  const docs = workspace.companyDocuments;
  const openFlow = useDrawerStore((state) => state.openFlow);
  const done = tasks.filter((item) => item.status === "hecha").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <div className="grid gap-3 lg:grid-cols-[200px_1fr]">
      <article className="glass-panel grid place-items-center rounded-[24px] p-4">
        <ProgressRing value={progress} label="Paquete" />
      </article>
      <div className="grid gap-3">
        <article className="glass-panel rounded-[24px] p-4">
          <div className="mb-2 flex justify-between">
            <h2 className="font-semibold">Checklist</h2>
            <Button size="sm" onClick={() => openFlow({ type: "create-task", title: "Crear entregable", payload: { tenderId: tender?.id } })}>
              Añadir
            </Button>
          </div>
          <ul className="grid gap-2">
            {tasks.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted">{item.owners.join(", ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={item.status} />
                  <Button size="sm" onClick={() => openFlow({ type: "assign-owners", title: "Asignar responsables", payload: { taskId: item.id, owners: item.owners } })}>
                    Asignar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </article>
        <article className="glass-panel rounded-[24px] p-4">
          <div className="mb-2 flex justify-between">
            <h2 className="font-semibold">Personal y hojas de vida</h2>
            <Button size="sm" onClick={() => openFlow({ type: "staff-role", title: "Registrar perfil requerido", payload: { tenderId: tender?.id } })}>
              Personal
            </Button>
          </div>
          <ul className="grid gap-2 text-sm">
            {workspace.staffRoles.filter((item) => item.tenderId === tender?.id).map((role) => {
              const assigned = workspace.staffAssignments.filter((item) => item.roleId === role.id);
              const resumes = workspace.generatedResumes.filter((item) => item.roleId === role.id && item.tenderId === tender?.id);
              const approved = resumes.filter((item) => item.status === "aprobado").length;
              return (
                <li key={role.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                  <span>{role.name} · {assigned.length}/{role.quantity} · HV aprobadas {approved}</span>
                  <StatusBadge value={assigned.length >= role.quantity && approved >= role.quantity ? "cumple" : "pendiente"} />
                </li>
              );
            })}
          </ul>
        </article>
        <article className="glass-panel rounded-[24px] p-4">
          <h2 className="font-semibold">Vigencias empresariales</h2>
          <ul className="mt-2 grid gap-2">
            {docs.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <StatusBadge value={item.status} />
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
