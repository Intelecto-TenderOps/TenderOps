import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BOGOTA_ZONE, formatCop, formatLongDate, prettyLabel } from "@/lib/format";

export interface RichColumn<T> {
  id: string;
  header: string;
  sortValue?: (row: T) => string | number;
  grow?: boolean;
  align?: "left" | "right" | "center";
  cell: (row: T) => ReactNode;
}

export function RichPrimary({
  kicker,
  title,
  detail,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      {kicker ? <p className="text-[11px] font-medium leading-4 text-muted">{kicker}</p> : null}
      <p className="text-[15px] font-semibold leading-snug text-ink">{title}</p>
      {detail ? <p className="mt-0.5 text-xs leading-snug text-muted">{detail}</p> : null}
    </div>
  );
}

export function RichScore({ value, hint }: { value: number; hint?: string }) {
  return (
    <div className="min-w-[92px] max-w-[140px]">
      <p className="text-sm font-semibold text-ink">{value}%</p>
      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-[#d7e6ff]">
        <span className="block h-full rounded-full bg-electric" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </span>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function RichStage({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink">
      <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-[#9aafc8]">
        <span className="h-1.5 w-1.5 rounded-full bg-electric" />
      </span>
      {prettyLabel(label)}
    </span>
  );
}

export function RichMoney({ value, hint }: { value: number; hint?: string }) {
  return (
    <div>
      <p className="text-[15px] font-semibold tabular-nums text-ink">{formatCop(value)}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function RichDate({ value, zone = BOGOTA_ZONE }: { value: string; zone?: string }) {
  return (
    <div>
      <p className="text-[15px] font-semibold leading-snug text-ink">{formatLongDate(value)}</p>
      <p className="mt-0.5 text-xs text-muted">{zone}</p>
    </div>
  );
}

export function RichValue({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[15px] font-semibold leading-snug text-ink">{primary}</div>
      {secondary ? <div className="mt-0.5 text-xs leading-snug text-muted">{secondary}</div> : null}
    </div>
  );
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  selectedId,
  enableSelection,
  rowSelection,
  onRowSelectionChange,
  pageSize = 12,
}: {
  data: T[];
  columns: RichColumn<T>[];
  onRowClick?: (row: T) => void;
  selectedId?: string;
  enableSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (value: RowSelectionState) => void;
  pageSize?: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    const selection: ColumnDef<T>[] = enableSelection
      ? [
          {
            id: "select",
            header: ({ table }) => (
              <input
                type="checkbox"
                aria-label="Seleccionar todos"
                className="rich-check"
                checked={table.getIsAllPageRowsSelected()}
                onChange={table.getToggleAllPageRowsSelectedHandler()}
              />
            ),
            cell: ({ row }) => (
              <input
                type="checkbox"
                aria-label={`Seleccionar ${row.original.id}`}
                className="rich-check"
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
                onClick={(event) => event.stopPropagation()}
              />
            ),
            enableSorting: false,
          },
        ]
      : [];
    return [
      ...selection,
      ...columns.map((column) => ({
        id: column.id,
        accessorFn: column.sortValue ?? ((row: T) => row.id),
        header: column.header,
        enableSorting: Boolean(column.sortValue),
        meta: column,
      })),
    ];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, rowSelection: rowSelection ?? {} },
    enableRowSelection: enableSelection,
    onRowSelectionChange: (updater) => {
      if (!onRowSelectionChange) return;
      const next = typeof updater === "function" ? updater(rowSelection ?? {}) : updater;
      onRowSelectionChange(next);
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize } },
  });

  const hasGrow = columns.some((column) => column.grow);
  const template = [
    enableSelection ? "40px" : null,
    ...columns.map((column, index) => {
      if (column.grow || (!hasGrow && index === 0)) return "minmax(220px, 2.6fr)";
      if (column.align === "right") return "minmax(128px, 0.9fr)";
      return "minmax(118px, 1fr)";
    }),
  ]
    .filter(Boolean)
    .join(" ");

  function handleRowKey(event: KeyboardEvent<HTMLDivElement>, row: T) {
    if (!onRowClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div className="flex h-full min-h-[280px] flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[720px]" role="table">
          {table.getHeaderGroups().map((group) => (
            <div
              key={group.id}
              role="row"
              className="sticky top-0 z-10 grid items-center gap-4 border-b border-[var(--to-table-line)] bg-[var(--to-table-head)] px-4 py-2.5 text-[12px] font-medium text-[var(--to-table-head-ink)]"
              style={{ gridTemplateColumns: template }}
            >
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta as RichColumn<T> | undefined;
                const sorted = header.column.getIsSorted();
                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    className={cn(
                      "flex items-center gap-1",
                      meta?.align === "right" && "justify-end",
                      meta?.align === "center" && "justify-center",
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.id === "select" ? (
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos"
                        className="rich-check"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                      />
                    ) : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-left"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {String(header.column.columnDef.header ?? "")}
                        {sorted === "asc" ? (
                          <ArrowUp size={12} />
                        ) : sorted === "desc" ? (
                          <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-45" />
                        )}
                      </button>
                    ) : (
                      String(header.column.columnDef.header ?? "")
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {table.getRowModel().rows.map((row, index) => (
            <div
              key={row.id}
              role="row"
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(row.original)}
              onKeyDown={(event) => handleRowKey(event, row.original)}
              className={cn(
                "grid w-full items-center gap-4 border-b border-[var(--to-table-line)] px-4 py-4 text-left transition-colors",
                index % 2 === 0 ? "bg-[var(--to-table-row)]" : "bg-[var(--to-table-zebra)]",
                onRowClick && "cursor-pointer hover:bg-[var(--to-table-hover)]",
                selectedId === row.original.id && "bg-[var(--to-table-selected)] ring-1 ring-inset ring-[#b7d4ff]",
              )}
              style={{ gridTemplateColumns: template }}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as RichColumn<T> | undefined;
                if (cell.column.id === "select") {
                  return (
                    <div key={cell.id} role="cell" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${row.original.id}`}
                        className="rich-check"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={cell.id}
                    role="cell"
                    className={cn(
                      "min-w-0",
                      meta?.align === "right" && "text-right",
                      meta?.align === "center" && "text-center",
                    )}
                  >
                    {meta?.cell(row.original)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {!table.getRowModel().rows.length ? (
          <p className="p-6 text-sm text-muted">No hay registros con los filtros actuales.</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--to-table-line)] px-4 py-2 text-xs text-muted">
        <span>
          {table.getFilteredRowModel().rows.length} registros · página{" "}
          {table.getState().pagination.pageIndex + 1}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </button>
          <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

export function RichHtmlTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  const template = headers.map((_, index) => (index === 0 ? "minmax(140px, 1.6fr)" : "minmax(110px, 1fr)")).join(" ");
  return (
    <div className="overflow-auto rounded-2xl border border-[var(--to-table-line)]" role="table">
      <div
        role="row"
        className="grid items-center gap-3 border-b border-[var(--to-table-line)] bg-[var(--to-table-head)] px-3 py-2 text-[11px] font-medium text-[var(--to-table-head-ink)]"
        style={{ gridTemplateColumns: template }}
      >
        {headers.map((header) => (
          <div key={header} role="columnheader">
            {header}
          </div>
        ))}
      </div>
      {rows.map((row, index) => (
        <div
          key={`${row[0]}-${index}`}
          role="row"
          className={cn(
            "grid items-start gap-3 border-b border-[var(--to-table-line)] px-3 py-3 text-sm",
            index % 2 === 0 ? "bg-[var(--to-table-row)]" : "bg-[var(--to-table-zebra)]",
          )}
          style={{ gridTemplateColumns: template }}
        >
          {row.map((cell, cellIndex) => (
            <div key={`${cell}-${cellIndex}`} role="cell" className={cn(cellIndex === 0 ? "font-semibold text-ink" : "text-muted")}>
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
