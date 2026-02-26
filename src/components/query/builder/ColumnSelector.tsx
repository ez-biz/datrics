"use client";

import { useEffect, useState } from "react";
import { Check, Columns3, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryBuilderStore } from "@/stores/query-builder-store";
import { Badge } from "@/components/ui/badge";

interface SchemaColumn {
  name: string;
  type: string;
  rawType: string;
  isPrimaryKey: boolean;
}

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export function ColumnSelector() {
  const {
    databaseId,
    sourceTable,
    columns,
    toggleColumn,
    selectAllColumns,
    clearColumns,
  } = useQueryBuilderStore();

  const [schemaTable, setSchemaTable] = useState<SchemaTable | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!databaseId || !sourceTable) {
      setSchemaTable(null);
      return;
    }

    setLoading(true);
    fetch(`/api/databases/${databaseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.schemaCache) {
          try {
            const parsed = JSON.parse(data.schemaCache);
            const table = parsed.tables?.find(
              (t: SchemaTable) => t.name === sourceTable,
            );
            setSchemaTable(table || null);
          } catch {
            setSchemaTable(null);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [databaseId, sourceTable]);

  if (!sourceTable) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-sm text-center text-muted-foreground">
        Select a table first to pick columns.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading columns...
      </div>
    );
  }

  if (!schemaTable) {
    return (
      <div className="p-4 text-sm text-center text-muted-foreground">
        Could not load schema for {sourceTable}.
      </div>
    );
  }

  const selectedCount = columns.length;
  const allCount = schemaTable.columns.length;
  const allSelected = selectedCount === allCount && allCount > 0;

  const handleToggleAll = () => {
    if (allSelected) {
      clearColumns();
    } else {
      selectAllColumns(
        schemaTable.columns.map((c) => c.name),
        sourceTable,
      );
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "number":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "string":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      case "boolean":
        return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      case "date":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-muted-foreground bg-muted border-muted-foreground/20";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border">
        <div className="text-sm font-medium flex items-center gap-2 pl-2">
          <Columns3 className="h-4 w-4 text-primary" />
          {selectedCount === 0
            ? "All columns (Default)"
            : `${selectedCount} selected`}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleAll}
          className="h-8 text-xs"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[400px] overflow-auto pr-2">
        {schemaTable.columns.map((col) => {
          const isSelected = columns.some((c) => c.column === col.name);
          return (
            <button
              key={col.name}
              className={`flex items-center justify-between p-2.5 rounded-md border text-left transition-colors text-sm
                ${isSelected ? "bg-primary/10 border-primary shadow-sm" : "hover:bg-muted/50 hover:border-border/80 bg-background"}
              `}
              onClick={() => toggleColumn(col.name, sourceTable)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div
                  className={`flex items-center justify-center shrink-0 w-4 h-4 rounded-[4px] border ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-transparent border-input"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span className="truncate flex items-center gap-1.5 font-medium">
                  {col.isPrimaryKey && (
                    <Key className="h-3 w-3 text-amber-500" />
                  )}
                  {col.name}
                </span>
              </div>
              <Badge
                variant="outline"
                className={`ml-2 text-[10px] px-1 py-0 font-normal ${typeColor(col.type)}`}
              >
                {col.type}
              </Badge>
            </button>
          );
        })}
      </div>
      {selectedCount === 0 && (
        <p className="text-xs text-muted-foreground pt-1">
          *If no columns are selected, the query will return all columns
          (`SELECT *`).
        </p>
      )}
    </div>
  );
}
