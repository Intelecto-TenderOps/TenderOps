import { DataTable, RichDate, RichPrimary, RichStage, RichValue, type RichColumn } from "@/components/data/DataTable";
import type { Requirement } from "@/contracts";
import { prettyLabel } from "@/lib/format";

const columns: RichColumn<Requirement>[] = [
  {
    id: "requisito",
    header: "Requisito",
    grow: true,
    sortValue: (row) => row.requirement,
    cell: (row) => <RichPrimary kicker={`${row.code} · ${prettyLabel(row.category)}`} title={row.requirement} detail={row.condition} />,
  },
  {
    id: "evidencia",
    header: "Fuente y evidencia",
    sortValue: (row) => row.source,
    cell: (row) => <RichValue primary={row.source} secondary={row.evidence || "Sin evidencia"} />,
  },
  {
    id: "cumplimiento",
    header: "Cumplimiento",
    sortValue: (row) => row.compliance,
    cell: (row) => <RichValue primary={prettyLabel(row.compliance)} secondary={`Riesgo ${prettyLabel(row.risk)}`} />,
  },
  {
    id: "responsable",
    header: "Responsable",
    sortValue: (row) => row.owner,
    cell: (row) => <RichValue primary={row.owner} secondary={prettyLabel(row.copied)} />,
  },
  {
    id: "cierre",
    header: "Cierre",
    sortValue: (row) => row.dueDate,
    cell: (row) => <RichDate value={row.dueDate} />,
  },
  {
    id: "etapa",
    header: "Etapa",
    sortValue: (row) => row.status,
    cell: (row) => <RichStage label={row.status} />,
  },
];

export function ComplianceMatrix({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Requirement[];
  selectedId?: string;
  onSelect: (row: Requirement) => void;
}) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      selectedId={selectedId}
      onRowClick={onSelect}
    />
  );
}
