import type { Evidence, ProcessDocument } from "@/contracts";

export function EvidenceViewer({
  document,
  evidences,
}: {
  document: ProcessDocument | null;
  evidences: Evidence[];
}) {
  if (!document) {
    return <p className="text-sm text-muted">Selecciona un documento para ver extractos y evidencias.</p>;
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm">{document.excerpt}</p>
      <p className="text-xs text-muted">Referencia SharePoint: {document.sharePointId ?? "sin cargar"}</p>
      <ul className="grid gap-2">
        {evidences.map((item) => (
          <li key={item.id} className="rounded-2xl bg-mist/80 px-3 py-2 text-sm">
            <strong>{item.label}</strong>
            <p className="text-xs text-muted">{item.locator}</p>
            <p>{item.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
