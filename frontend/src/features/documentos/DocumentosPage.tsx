import { useState } from "react";
import { PageHeader } from "@/components/data/PageHeader";
import { DocumentExplorer } from "@/components/documents/DocumentExplorer";
import { EvidenceViewer } from "@/components/documents/EvidenceViewer";
import { ActiveFilterChips } from "@/components/selection";
import { Button } from "@/components/ui/button";
import { useFilterChips } from "@/hooks/useFilterChips";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function DocumentosPage() {
  const { chips, setChips } = useFilterChips();
  const documents = useDemoStore((state) => state.workspace.documents);
  const evidences = useDemoStore((state) => state.workspace.evidences);
  const filtered = documents.filter((item) =>
    chips.every((chip) => (chip.field === "category" ? item.category === chip.value : true)),
  );
  const [selectedId, setSelectedId] = useState(filtered[0]?.id);
  const selected = filtered.find((item) => item.id === selectedId) ?? null;
  const openFlow = useDrawerStore((state) => state.openFlow);
  return (
    <section className="grid gap-2">
      <PageHeader
        eyebrow="Documentos"
        title="Repositorio de procesos"
        actions={
          <Button
            onClick={() =>
              openFlow({
                type: "filters-generic",
                title: "Filtros documentales",
                size: "compact",
                payload: {
                  active: chips,
                  onApply: setChips,
                  fields: [{ field: "category", label: "Tipo", options: ["pliego", "técnico", "estudio", "adenda"] }],
                },
              })
            }
          >
            Filtros
          </Button>
        }
      />
      <ActiveFilterChips chips={chips} onRemove={(id) => setChips(chips.filter((chip) => chip.id !== id))} onClear={() => setChips([])} />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="table-surface overflow-hidden rounded-[20px]">
          <DocumentExplorer documents={filtered} selectedId={selectedId} onSelect={(doc) => setSelectedId(doc.id)} />
        </div>
        <div className="glass-panel rounded-[24px] p-4">
          <EvidenceViewer document={selected} evidences={evidences.filter((item) => item.documentId === selected?.id)} />
        </div>
      </div>
    </section>
  );
}
