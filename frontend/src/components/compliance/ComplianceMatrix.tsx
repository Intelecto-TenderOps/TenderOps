import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { Requirement } from "@/contracts";

const columns: ColumnDef<Requirement>[] = [
  { accessorKey: "code", header: "Identificador" },
  { accessorKey: "category", header: "Categoría" },
  { accessorKey: "requirement", header: "Requisito" },
  { accessorKey: "condition", header: "Condición" },
  { accessorKey: "source", header: "Fuente" },
  { accessorKey: "evidence", header: "Evidencia" },
  {
    accessorKey: "compliance",
    header: "Cumplimiento",
    cell: ({ getValue }) => <StatusBadge value={String(getValue())} />,
  },
  {
    accessorKey: "risk",
    header: "Riesgo",
    cell: ({ getValue }) => <StatusBadge value={String(getValue())} />,
  },
  { accessorKey: "owner", header: "Responsable" },
  { accessorKey: "dueDate", header: "Fecha" },
  { accessorKey: "status", header: "Estado" },
  {
    accessorKey: "copied",
    header: "Copiado",
    cell: ({ getValue }) => <StatusBadge value={String(getValue())} />,
  },
  { accessorKey: "notes", header: "Observaciones" },
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
