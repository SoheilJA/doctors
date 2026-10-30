"use client";

/**
 * DataTable: TanStack Table wrapper with search, sorting, pagination,
 * loading skeleton, empty state, CSV export and a mobile card fallback.
 * Desktop: table; mobile (< md): cards via `mobileCard` render prop.
 */

import type { LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toFa } from "@/lib/fa";
import { exportCsv } from "@/lib/csv";
import { EmptyState } from "@/components/shared/empty-state";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  /** enable global text filter across all cell values */
  searchable?: boolean;
  toolbar?: ReactNode;
  loading?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  mobileCard?: (row: TData) => ReactNode;
  pageSize?: number;
  /** show a CSV export button that dumps the currently visible rows */
  exportCsvName?: string;
  csvRows?: (row: TData) => Record<string, string | number | undefined | null>;
  onRowClick?: (row: TData) => void;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "جستجو…",
  searchable = true,
  toolbar,
  loading,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  mobileCard,
  pageSize = 10,
  exportCsvName,
  csvRows,
  onRowClick,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue).trim().toLowerCase();
      if (!needle) return true;
      return Object.values(row.original as Record<string, unknown>).some((v) =>
        String(v ?? "").toLowerCase().includes(needle)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const currentPage = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;

  const paginationBar = useMemo(() => {
    if (!pageCount) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          نمایش {toFa(rows.length)} از {toFa(totalRows)} رکورد
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(currentPageSize)}
            onValueChange={(v) => {
              setCurrentPageSize(Number(v));
              table.setPageSize(Number(v));
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs" aria-label="تعداد در هر صفحه">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {toFa(n)} در صفحه
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="صفحه قبل"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
            <span className="px-1 text-xs font-medium tabular-nums">
              {toFa(currentPage + 1)} از {toFa(pageCount)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="صفحه بعد"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    );
  }, [rows.length, totalRows, currentPage, pageCount, currentPageSize]);

  return (
    <div className={cn("space-y-3", className)}>
      {(searchable || toolbar || exportCsvName) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative min-w-52 flex-1 sm:max-w-64">
              <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 ps-8 text-sm"
                aria-label="جستجو در جدول"
              />
            </div>
          )}
          {toolbar}
          {exportCsvName && csvRows && (
            <Button
              variant="outline"
              size="sm"
              className="ms-auto h-9"
              onClick={() => {
                const all = table.getFilteredRowModel().rows.map((r) => csvRows(r.original));
                exportCsv(exportCsvName, all);
              }}
            >
              <Download className="size-4" aria-hidden />
              خروجی CSV
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      return (
                        <th key={header.id} className="whitespace-nowrap px-3 py-2.5 text-start font-semibold">
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-start hover:text-primary"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <ArrowUpDown className={cn("size-3.5 transition-opacity", header.column.getIsSorted() ? "opacity-100" : "opacity-40")} aria-hidden />
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t transition-colors hover:bg-muted/40",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          {mobileCard ? (
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <div key={row.id} onClick={onRowClick ? () => onRowClick(row.original) : undefined} className={cn(onRowClick && "cursor-pointer")}>
                  {mobileCard(row.original)}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border p-3">
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="flex items-start justify-between gap-3 py-1 text-sm">
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {typeof cell.column.columnDef.header === "string"
                          ? cell.column.columnDef.header
                          : cell.column.id}
                      </span>
                      <span className="text-end">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {paginationBar}
        </>
      )}
    </div>
  );
}
