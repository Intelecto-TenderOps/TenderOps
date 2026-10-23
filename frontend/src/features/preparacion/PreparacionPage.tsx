import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function PreparacionPage() {
  const docs = useDemoStore((state) => state.workspace.companyDocuments);
  const tasks = useDemoStore((state) => state.workspace.tasks);
  const openFlow = useDrawerStore((state) => state.openFlow);
  return (
    <section className="grid gap-3">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Preparación</p>
          <h1 className="text-3xl font-semibold">Vigencias y paquete</h1>
        </div>
        <Button onClick={() => openFlow({ type: "add-evidence", title: "Cargar evidencia", size: "compact" })}>
          Cargar evidencia
        </Button>
      </header>
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="glass-panel rounded-[24px] p-4">
          <h2 className="font-semibold">Documentos empresariales</h2>
          <ul className="mt-3 grid gap-2">
            {docs.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <StatusBadge value={item.status} />
              </li>
            ))}
          </ul>
        </article>
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
    </section>
  );
}
