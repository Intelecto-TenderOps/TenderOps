import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  selectedId,
  enableSelection,
  rowSelection,
  onRowSelectionChange,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  onRowClick?: (row: T) => void;
  selectedId?: string;
  enableSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (value: RowSelectionState) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
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
    initialState: { pagination: { pageSize: 12 } },
  });

  return (
    <div className="flex h-full min-h-[320px] flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white/95 text-[11px] uppercase tracking-[0.12em] text-muted">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-semibold">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="text-left"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "cursor-pointer border-t border-slate-100 hover:bg-mist/70",
                  selectedId === row.original.id && "bg-mist",
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!table.getRowModel().rows.length ? (
          <p className="p-6 text-sm text-muted">No hay registros con los filtros actuales.</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-muted">
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
