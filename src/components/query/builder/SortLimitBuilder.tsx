"use client";

import { useEffect, useState } from "react";
import { Plus, X, ArrowDownAZ, ArrowUpZA, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryBuilderStore } from "@/stores/query-builder-store";
import { SortClause } from "@/lib/query-engine/types";

interface SchemaColumn {
  name: string;
}

export function SortLimitBuilder() {
  const {
    databaseId,
    sourceTable,
    orderBy,
    limit,
    addOrderBy,
    removeOrderBy,
    setLimit,
  } = useQueryBuilderStore();

  const [availableColumns, setAvailableColumns] = useState<SchemaColumn[]>([]);

  useEffect(() => {
    if (!databaseId || !sourceTable) return;
    fetch(`/api/databases/${databaseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.schemaCache) {
          try {
            const parsed = JSON.parse(data.schemaCache);
            const table = parsed.tables?.find(
              (t: any) => t.name === sourceTable,
            );
            setAvailableColumns(table?.columns || []);
          } catch {}
        }
      });
  }, [databaseId, sourceTable]);

  if (!sourceTable) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-sm text-center text-muted-foreground">
        Select a table first to apply sorting and row limits.
      </div>
    );
  }

  const handleAddSort = () => {
    if (availableColumns.length > 0) {
      addOrderBy({ column: availableColumns[0].name, direction: "ASC" });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Sorting Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <ArrowDownAZ className="h-4 w-4 text-primary" /> Sort Columns
        </div>

        {orderBy.length === 0 ? (
          <div className="p-3 border border-dashed rounded text-sm text-muted-foreground bg-muted/10">
            No sort order applied.
            <Button
              variant="link"
              size="sm"
              onClick={handleAddSort}
              className="px-1 h-auto py-0 text-primary"
            >
              Sort data
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {orderBy.map((sort, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 p-2 rounded border bg-card/30"
              >
                <Select
                  value={sort.column}
                  onValueChange={(val) => {
                    const newSorts = [...orderBy];
                    newSorts[i].column = val;
                    useQueryBuilderStore.setState({ orderBy: newSorts });
                  }}
                >
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant={sort.direction === "ASC" ? "default" : "secondary"}
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    const newSorts = [...orderBy];
                    newSorts[i].direction =
                      sort.direction === "ASC" ? "DESC" : "ASC";
                    useQueryBuilderStore.setState({ orderBy: newSorts });
                  }}
                  title={`Change sorting order (current: ${sort.direction})`}
                >
                  {sort.direction === "ASC" ? (
                    <ArrowDownAZ className="h-4 w-4" />
                  ) : (
                    <ArrowUpZA className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOrderBy(i)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSort}
              className="w-full text-xs h-8"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Sort
            </Button>
          </div>
        )}
      </div>

      {/* Row Limit Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <LayoutList className="h-4 w-4 text-primary" /> Row Limit
        </div>

        <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-lg border max-w-[250px]">
          <span className="text-sm font-medium">Return max</span>
          <Input
            type="number"
            min="1"
            max="10000"
            value={limit || ""}
            onChange={(e) => {
              const val = e.target.value
                ? parseInt(e.target.value, 10)
                : undefined;
              setLimit(val);
            }}
            placeholder="Unlimited"
            className="w-24 text-right pr-2 font-mono h-8 bg-background"
          />
          <span className="text-sm">rows</span>
        </div>
      </div>
    </div>
  );
}
