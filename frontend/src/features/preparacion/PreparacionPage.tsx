import { DataTable, RichPrimary, RichStage } from "@/components/data/DataTable";
import { PageHeader } from "@/components/data/PageHeader";
import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function PreparacionPage() {
  const docs = useDemoStore((state) => state.workspace.companyDocuments);
  const tasks = useDemoStore((state) => state.workspace.tasks);
  const staffRoles = useDemoStore((state) => state.workspace.staffRoles);
  const assignments = useDemoStore((state) => state.workspace.staffAssignments);
  const resumes = useDemoStore((state) => state.workspace.generatedResumes);
  const openFlow = useDrawerStore((state) => state.openFlow);
  return (
    <section className="grid gap-2">
      <PageHeader
        eyebrow="Preparación"
        title="Vigencias y paquete"
        actions={
          <Button onClick={() => openFlow({ type: "add-evidence", title: "Cargar evidencia", size: "compact" })}>
            Cargar evidencia
          </Button>
        }
      />
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="table-surface min-w-0 overflow-hidden rounded-[20px]">
          <DataTable
            data={docs}
            columns={[
              {
                id: "documento",
                header: "Documento",
                grow: true,
                sortValue: (row) => row.name,
                cell: (row) => <RichPrimary kicker={row.type} title={row.name} />,
              },
              {
                id: "etapa",
                header: "Etapa",
                sortValue: (row) => row.status,
                cell: (row) => <RichStage label={row.status} />,
              },
            ]}
            pageSize={8}
          />
        </div>
        <article className="glass-panel rounded-[24px] p-4">
          <h2 className="font-semibold">Entregables abiertos</h2>
          <ul className="mt-3 grid gap-2">
            {tasks
              .filter((item) => item.status !== "hecha")
              .map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="text-sm">{item.title}</span>
                  <Button size="sm" onClick={() => openFlow({ type: "assign-owners", title: "Asignar", payload: { taskId: item.id, owners: item.owners } })}>
                    Asignar
                  </Button>
                </li>
              ))}
          </ul>
        </article>
      </div>
      <article className="glass-panel rounded-[24px] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Personal y hojas de vida</h2>
          <Button size="sm" onClick={() => openFlow({ type: "import-professionals", title: "Importar perfiles", size: "wide", steps: ["Archivo", "Estructura", "Mapeo", "Validación", "Revisión", "Confirmación", "Resultado"] })}>
            Banco de perfiles
          </Button>
        </div>
        <p className="text-sm text-muted">
          {staffRoles.length} perfiles requeridos · {assignments.length} profesionales propuestos · {resumes.length} hojas de vida. Un paquete no se declara completo si faltan HV aprobadas o soportes.
        </p>
      </article>
    </section>
  );
}
