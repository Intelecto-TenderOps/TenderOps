import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { DocumentExplorer } from "@/components/documents/DocumentExplorer";
import { EvidenceViewer } from "@/components/documents/EvidenceViewer";
import { IntegrationNotice } from "@/components/status/IntegrationNotice";
import { Button } from "@/components/ui/button";
import { useLiveTender } from "@/hooks/useLiveTender";
import { documentsService } from "@/services/documentsService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";

export function DocumentosProcesoPage() {
  const { id = "" } = useParams();
  const workspace = useDemoStore((state) => state.workspace);
  const { tender } = useLiveTender(id);
  const liveDocs = useQuery({
    queryKey: ["secop-documents", tender?.secopId ?? id],
    queryFn: () => documentsService.list(tender?.id, tender?.secopId ?? id),
    enabled: Boolean(tender?.secopId ?? id),
    retry: false,
  });
  const docs = liveDocs.data?.items ?? workspace.documents.filter((item) => item.tenderId === tender?.id);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = docs.find((item) => item.id === (selectedId ?? docs[0]?.id)) ?? null;
  const evidences = workspace.evidences.filter((item) => item.documentId === selected?.id);
  const openFlow = useDrawerStore((state) => state.openFlow);
  return (
    <div className="grid gap-3">
      <IntegrationNotice
        title={liveDocs.data?.source === "live" ? "Inventario SECOP" : "Inventario local"}
        detail={
          liveDocs.data?.source === "live"
            ? `${liveDocs.data.items.length} archivos publicados por la fuente. SharePoint no está configurado.`
            : "SharePoint/Graph no está configurado. No se inventan pliegos."
        }
      />
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
