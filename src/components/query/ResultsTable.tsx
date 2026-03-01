"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  AlertTriangle,
  Clock,
  Rows3,
} from "lucide-react";

interface QueryColumn {
  name: string;
  type: string;
}

interface ResultsTableProps {
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
  sql?: string;
  compact?: boolean;
}

export function ResultsTable({
  columns,
  rows,
  rowCount,
  executionTimeMs,
  truncated,
  compact,
}: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      columns.map((col) => ({
        accessorKey: col.name,
        header: compact
          ? () => (
              <span className="text-xs font-medium">{col.name}</span>
            )
          : ({ column }) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 font-semibold -ml-2"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
              >
                {col.name}
                <Badge
                  variant="outline"
                  className="ml-1.5 text-[10px] px-1 py-0 font-normal"
                >
                  {col.type}
                </Badge>
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-1 h-3 w-3" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-1 h-3 w-3" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
                )}
              </Button>
            ),
        cell: ({ getValue }) => {
          const value = getValue();
          if (value === null)
            return <span className="text-muted-foreground italic">NULL</span>;
          if (value === undefined)
            return <span className="text-muted-foreground italic">—</span>;
          return (
            <span className={compact ? "font-mono text-xs" : "font-mono text-sm"}>
              {String(value)}
            </span>
          );
        },
      })),
    [columns, compact],
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const exportCSV = () => {
    const headers = columns.map((c) => c.name).join(",");
    const csvRows = rows.map((row) =>
      columns
        .map((c) => {
          const val = row[c.name];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    );
    const csv = [headers, ...csvRows].join("\n");
    downloadFile(csv, "query-results.csv", "text/csv");
  };

  const exportJSON = () => {
    const json = JSON.stringify(rows, null, 2);
    downloadFile(json, "query-results.json", "application/json");
  };

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Status Bar */}
      {!compact && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Rows3 className="h-3.5 w-3.5" />
              {rowCount.toLocaleString()} row{rowCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {executionTimeMs}ms
            </span>
            {truncated && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                Results truncated to 2,000 rows
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportJSON}>
              <Download className="h-3.5 w-3.5 mr-1" />
              JSON
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className={compact ? "rounded border overflow-auto max-h-full" : "rounded-lg border overflow-auto max-h-[500px]"}>
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center h-24 text-muted-foreground"
                >
                  No results
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
