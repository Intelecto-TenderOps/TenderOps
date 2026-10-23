import { useState } from "react";
import { useParams } from "react-router-dom";
import { DocumentExplorer } from "@/components/documents/DocumentExplorer";
import { EvidenceViewer } from "@/components/documents/EvidenceViewer";
import { Button } from "@/components/ui/button";
import { documentsService } from "@/services/documentsService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function DocumentosProcesoPage() {
  const { id = "" } = useParams();
  const workspace = useDemoStore((state) => state.workspace);
  const tender = workspace.tenders.find((item) => item.secopId === id || item.id === id);
  const docs = workspace.documents.filter((item) => item.tenderId === tender?.id);
  const [selectedId, setSelectedId] = useState(docs[0]?.id);
  const selected = docs.find((item) => item.id === selectedId) ?? null;
  const evidences = workspace.evidences.filter((item) => item.documentId === selected?.id);
  const openFlow = useDrawerStore((state) => state.openFlow);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <article className="glass-panel rounded-[24px] p-4">
        <div className="mb-3 flex justify-between">
          <h2 className="font-semibold">Explorador</h2>
          <Button size="sm" onClick={() => openFlow({ type: "add-document", title: "Añadir documento", size: "compact" })}>
            Añadir
          </Button>
        </div>
        <DocumentExplorer
          documents={docs}
          selectedId={selectedId}
          onSelect={(doc) => setSelectedId(doc.id)}
        />
      </article>
      <article className="glass-panel rounded-[24px] p-4">
        <div className="mb-3 flex justify-between">
          <h2 className="font-semibold">Evidencias</h2>
          {selected ? (
            <Button size="sm" onClick={() => void documentsService.markReviewed(selected.id)}>
              Marcar revisado
            </Button>
          ) : null}
        </div>
        <EvidenceViewer document={selected} evidences={evidences} />
      </article>
    </div>
  );
}

export function RequisitosPage() {
  const { id = "" } = useParams();
  const workspace = useDemoStore((state) => state.workspace);
  const tender = workspace.tenders.find((item) => item.secopId === id || item.id === id);
  const rows = workspace.requirements.filter((item) => item.tenderId === tender?.id);
  return (
    <ul className="grid gap-2">
      {rows.map((item) => (
        <li key={item.id} className="glass-panel rounded-[22px] p-3">
          <p className="text-sm font-semibold">{item.code} · {item.requirement}</p>
          <p className="text-xs text-muted">{item.source} · {item.compliance}</p>
        </li>
      ))}
    </ul>
  );
}

export function ActividadPage() {
  const events = useDemoStore((state) => state.workspace.auditEvents);
  return (
    <ul className="grid gap-2">
      {events.map((item) => (
        <li key={item.id} className="glass-panel rounded-[22px] px-4 py-3 text-sm">
          <strong>{item.actor}</strong> {item.action}
          <p className="text-xs text-muted">{item.entity} · {item.correlationId}</p>
        </li>
      ))}
    </ul>
  );
}
