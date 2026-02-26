"use client";

import { useEffect, useState } from "react";
import { Plus, X, Calculator, Columns, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryBuilderStore } from "@/stores/query-builder-store";
import { AggregateFunction } from "@/lib/query-engine/types";

interface SchemaColumn {
  name: string;
  type: string;
}

const AGG_FUNCTIONS: {
  value: AggregateFunction;
  label: string;
  types: string[];
}[] = [
  { value: "count", label: "Count of rows", types: ["all"] },
  { value: "count_distinct", label: "Distinct count", types: ["all"] },
  { value: "sum", label: "Sum of", types: ["number"] },
  { value: "avg", label: "Average of", types: ["number"] },
  { value: "min", label: "Minimum of", types: ["number", "date"] },
  { value: "max", label: "Maximum of", types: ["number", "date"] },
];

export function SummarizeBuilder() {
  const {
    databaseId,
    sourceTable,
    aggregations,
    groupBy,
    addAggregation,
    removeAggregation,
    addGroupBy,
    removeGroupBy,
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
        Select a table first to apply grouping and aggregations.
      </div>
    );
  }

  const handleAddMetric = () => {
    addAggregation({ fn: "count", column: "*" });
  };

  const handleAddGrouping = () => {
    if (availableColumns.length > 0) {
      addGroupBy({ column: availableColumns[0].name });
    }
  };

  const getValidAggregations = (columnName: string) => {
    if (columnName === "*")
      return AGG_FUNCTIONS.filter((a) => a.types.includes("all"));
    const col = availableColumns.find((c) => c.name === columnName);
    const type = col?.type || "string";
    return AGG_FUNCTIONS.filter(
      (a) => a.types.includes("all") || a.types.includes(type),
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Metrics Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <Calculator className="h-4 w-4 text-primary" /> Metrics
        </div>

        {aggregations.length === 0 ? (
          <div className="p-3 border border-dashed rounded text-sm text-muted-foreground bg-muted/10">
            No metrics defined.
            <Button
              variant="link"
              size="sm"
              onClick={handleAddMetric}
              className="px-1 h-auto py-0 text-primary"
            >
              Add one
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {aggregations.map((agg, i) => {
              const fns = getValidAggregations(agg.column);
              return (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 p-2 rounded border bg-card/30"
                >
                  <Select
                    value={agg.fn}
                    onValueChange={(val: AggregateFunction) => {
                      const newAggs = [...aggregations];
                      newAggs[i].fn = val;
                      useQueryBuilderStore.setState({ aggregations: newAggs });
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fns.map((fn) => (
                        <SelectItem key={fn.value} value={fn.value}>
                          {fn.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={agg.column}
                    onValueChange={(val) => {
                      const newAggs = [...aggregations];
                      newAggs[i].column = val;
                      // Fallback fn if invalid
                      const newFns = getValidAggregations(val);
                      if (!newFns.some((f) => f.value === agg.fn)) {
                        newAggs[i].fn = newFns[0].value;
                      }
                      useQueryBuilderStore.setState({ aggregations: newAggs });
                    }}
                  >
                    <SelectTrigger className="flex-1 min-w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="*">All rows (*)</SelectItem>
                      <SelectGroup>
                        <SelectLabel>Columns</SelectLabel>
                        {availableColumns.map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAggregation(i)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMetric}
              className="w-full text-xs h-8"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Metric
            </Button>
          </div>
        )}
      </div>

      {/* Grouping Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <Columns className="h-4 w-4 text-primary" /> Group By
        </div>

        {groupBy.length === 0 ? (
          <div className="p-3 border border-dashed rounded text-sm text-muted-foreground bg-muted/10">
            No groupings yet.
            <Button
              variant="link"
              size="sm"
              onClick={handleAddGrouping}
              className="px-1 h-auto py-0 text-primary"
            >
              Group data
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {groupBy.map((g, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 p-2 rounded border bg-card/30"
              >
                <Select
                  value={g.column}
                  onValueChange={(val) => {
                    const newGroups = [...groupBy];
                    newGroups[i].column = val;
                    useQueryBuilderStore.setState({ groupBy: newGroups });
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
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGroupBy(i)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddGrouping}
              className="w-full text-xs h-8"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Grouping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
