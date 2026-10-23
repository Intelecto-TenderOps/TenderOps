import type { ProcessDocument } from "@/contracts";
import { StatusBadge } from "@/components/viz/StatusBadge";
import { formatDateTime } from "@/lib/format";

export function DocumentExplorer({
  documents,
  selectedId,
  onSelect,
}: {
  documents: ProcessDocument[];
  selectedId?: string;
  onSelect: (doc: ProcessDocument) => void;
}) {
  return (
    <ul className="grid gap-2">
      {documents.map((doc) => (
        <li key={doc.id}>
          <button
            type="button"
            onClick={() => onSelect(doc)}
            className={`w-full rounded-2xl border px-3 py-2 text-left ${
              selectedId === doc.id ? "border-electric bg-mist" : "border-transparent bg-white/60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm">{doc.name}</strong>
              <StatusBadge value={doc.status} />
            </div>
            <p className="text-xs text-muted">
              {doc.category} · v{doc.version} · {doc.sizeKb} KB · {formatDateTime(doc.uploadedAt)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
