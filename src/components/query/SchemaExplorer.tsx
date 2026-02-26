"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Database,
  TableIcon,
  Search,
  Key,
} from "lucide-react";

interface SchemaColumn {
  name: string;
  type: string;
  rawType: string;
  isPrimaryKey: boolean;
  nullable: boolean;
}

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

interface SchemaExplorerProps {
  tables: SchemaTable[];
  onInsert?: (text: string) => void;
  databaseName?: string;
}

export function SchemaExplorer({
  tables,
  onInsert,
  databaseName,
}: SchemaExplorerProps) {
  const [search, setSearch] = useState("");
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const filteredTables = tables.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.columns.some((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName);
      else next.add(tableName);
      return next;
    });
  };

  const handleColumnClick = (tableName: string, columnName: string) => {
    if (onInsert) {
      onInsert(`${tableName}.${columnName}`);
    }
  };

  const handleTableClick = (tableName: string) => {
    if (onInsert) {
      onInsert(tableName);
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "number":
        return "text-blue-500";
      case "string":
        return "text-green-500";
      case "boolean":
        return "text-purple-500";
      case "date":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium truncate">
            {databaseName || "Schema"}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter tables…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-1">
        {filteredTables.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No tables found
          </div>
        ) : (
          filteredTables.map((table) => {
            const isExpanded = expandedTables.has(table.name);
            return (
              <div key={table.name}>
                {/* Table row */}
                <button
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors text-left group"
                  onClick={() => toggleTable(table.name)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <TableIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span
                    className="truncate font-medium cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTableClick(table.name);
                    }}
                  >
                    {table.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="ml-auto text-[10px] px-1 py-0 shrink-0 opacity-60"
                  >
                    {table.columns.length}
                  </Badge>
                </button>

                {/* Columns */}
                {isExpanded && (
                  <div className="ml-5 border-l pl-2">
                    {table.columns.map((col) => (
                      <button
                        key={col.name}
                        className="w-full flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handleColumnClick(table.name, col.name)}
                        title={`${col.rawType}${col.nullable ? " (nullable)" : ""} — click to insert`}
                      >
                        {col.isPrimaryKey && (
                          <Key className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate">{col.name}</span>
                        <span
                          className={`ml-auto text-[10px] ${typeColor(col.type)} shrink-0`}
                        >
                          {col.rawType}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
