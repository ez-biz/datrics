"use client";

import { useEffect, useState } from "react";
import { Table as TableIcon, Loader2, Database, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryBuilderStore } from "@/stores/query-builder-store";
import { useSchemaStore } from "@/stores/schema-store";

export function TableSelector() {
  const { databaseId, sourceTable, setSourceTable } = useQueryBuilderStore();
  const { fetchSchema, getSchema, isLoading, errors } = useSchemaStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (databaseId) {
      fetchSchema(databaseId);
    }
  }, [databaseId, fetchSchema]);

  const schema = getSchema(databaseId);
  const tables = schema?.tables || [];
  const loading = isLoading(databaseId);
  const error = errors[databaseId];

  if (!databaseId) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-sm text-center text-muted-foreground">
        Select a database first to view tables.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading schema...
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-sm text-center flex flex-col items-center gap-2">
        <Database className="h-6 w-6 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          {error || "No schema found. Sync the database in Admin Settings."}
        </p>
      </div>
    );
  }

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-auto">
        {filteredTables.map((t) => {
          const selected = t.name === sourceTable;
          return (
            <Button
              key={t.name}
              variant={selected ? "default" : "outline"}
              className={`h-auto p-3 flex items-center gap-3 justify-start w-full ${
                selected ? "ring-2 ring-primary ring-offset-1" : ""
              }`}
              onClick={() => setSourceTable(t.name, t.schema)}
            >
              <TableIcon className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <div className="font-semibold truncate">{t.name}</div>
                <div className="text-xs opacity-70">
                  {t.columns.length} columns{t.schema && ` • ${t.schema}`}
                </div>
              </div>
              {selected && <Check className="h-4 w-4 shrink-0" />}
            </Button>
          );
        })}
        {filteredTables.length === 0 && (
          <div className="p-4 text-sm text-center text-muted-foreground">
            No tables matching &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
