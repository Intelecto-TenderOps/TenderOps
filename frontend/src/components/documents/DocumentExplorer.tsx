import { DataTable, RichPrimary, RichStage, type RichColumn } from "@/components/data/DataTable";
import type { ProcessDocument } from "@/contracts";

const columns: RichColumn<ProcessDocument>[] = [
  {
    id: "documento",
    header: "Documento",
    grow: true,
    sortValue: (row) => row.name,
    cell: (row) => (
      <RichPrimary kicker={`${row.category} · v${row.version}`} title={row.name} detail={`${row.sizeKb} KB`} />
    ),
  },
  {
    id: "etapa",
    header: "Etapa",
    sortValue: (row) => row.status,
    cell: (row) => <RichStage label={row.status} />,
  },
  {
    id: "carga",
    header: "Carga",
    sortValue: (row) => row.uploadedAt,
    cell: (row) => <RichPrimary title={row.reviewed ? "Revisado" : "Pendiente"} detail={row.excerpt} />,
  },
];

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
    <DataTable data={documents} columns={columns} selectedId={selectedId} onRowClick={onSelect} pageSize={8} />
  );
}
