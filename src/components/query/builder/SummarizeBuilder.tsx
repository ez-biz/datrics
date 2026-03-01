"use client";

import { useEffect } from "react";
import { Plus, X, Calculator, Columns, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useSchemaStore } from "@/stores/schema-store";
import { AggregateFunction, HavingOperator } from "@/lib/query-engine/types";
import { ColumnCombobox } from "./ColumnCombobox";

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

const HAVING_OPERATORS: { value: HavingOperator; label: string }[] = [
  { value: "=", label: "=" },
  { value: "!=", label: "!=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
];

export function SummarizeBuilder() {
  const {
    databaseId,
    sourceTable,
    aggregations,
    groupBy,
    having,
    addAggregation,
    removeAggregation,
    addGroupBy,
    removeGroupBy,
    addHaving,
    removeHaving,
    updateHaving,
  } = useQueryBuilderStore();

  const { fetchSchema, getTableColumns, isLoading } = useSchemaStore();

  useEffect(() => {
    if (databaseId) {
      fetchSchema(databaseId);
    }
  }, [databaseId, fetchSchema]);

  const availableColumns = getTableColumns(databaseId, sourceTable);

  if (!sourceTable) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-sm text-center text-muted-foreground">
        Select a table first to apply grouping and aggregations.
      </div>
    );
  }

  if (isLoading(databaseId)) {
    return (
      <div className="p-4 text-sm text-center text-muted-foreground">
        Loading schema...
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

  const handleAddHaving = () => {
    if (aggregations.length === 0) return;
    const firstAgg = aggregations[0];
    addHaving({
      aggregation: { fn: firstAgg.fn, column: firstAgg.column },
      operator: ">",
      value: 0,
    });
  };

  const getValidAggregations = (columnName: string) => {
    if (columnName === "*")
      return AGG_FUNCTIONS.filter((a) => a.types.includes("all"));
    const col = availableColumns.find((c) => c.name === columnName);
    const type = col?.type || "string";
    return AGG_FUNCTIONS.filter(
      (a) => a.types.includes("all") || a.types.includes(type)
    );
  };

  const getAggregationLabel = (fn: AggregateFunction, column: string) => {
    const fnLabel = AGG_FUNCTIONS.find((a) => a.value === fn)?.label || fn;
    const colLabel = column === "*" ? "All rows" : column;
    return `${fnLabel} ${colLabel}`;
  };

  return (
    <div className="space-y-6">
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

                    <ColumnCombobox
                      columns={availableColumns}
                      value={agg.column}
                      onChange={(val) => {
                        const newAggs = [...aggregations];
                        newAggs[i].column = val;
                        const newFns = getValidAggregations(val);
                        if (!newFns.some((f) => f.value === agg.fn)) {
                          newAggs[i].fn = newFns[0].value;
                        }
                        useQueryBuilderStore.setState({ aggregations: newAggs });
                      }}
                      includeAllRows
                      className="flex-1 min-w-[120px] h-8 text-xs"
                    />

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
                  <ColumnCombobox
                    columns={availableColumns}
                    value={g.column}
                    onChange={(val) => {
                      const newGroups = [...groupBy];
                      newGroups[i].column = val;
                      useQueryBuilderStore.setState({ groupBy: newGroups });
                    }}
                    className="flex-1 h-8 text-xs"
                  />

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

      {/* HAVING Section - only show if aggregations exist */}
      {aggregations.length > 0 && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2 font-medium text-sm text-foreground">
            <Filter className="h-4 w-4 text-primary" /> Filter Results (HAVING)
          </div>
          <p className="text-xs text-muted-foreground">
            Filter aggregated values (e.g., show only counts greater than 10)
          </p>

          {having.length === 0 ? (
            <div className="p-3 border border-dashed rounded text-sm text-muted-foreground bg-muted/10">
              No result filters applied.
              <Button
                variant="link"
                size="sm"
                onClick={handleAddHaving}
                className="px-1 h-auto py-0 text-primary"
              >
                Add one
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {having.map((h, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 p-2 rounded border bg-card/30"
                >
                  <Select
                    value={`${h.aggregation.fn}:${h.aggregation.column}`}
                    onValueChange={(val) => {
                      const [fn, column] = val.split(":") as [
                        AggregateFunction,
                        string
                      ];
                      updateHaving(i, {
                        ...h,
                        aggregation: { fn, column },
                      });
                    }}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Metrics</SelectLabel>
                        {aggregations.map((agg, j) => (
                          <SelectItem
                            key={j}
                            value={`${agg.fn}:${agg.column}`}
                          >
                            {getAggregationLabel(agg.fn, agg.column)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={h.operator}
                    onValueChange={(val: HavingOperator) =>
                      updateHaving(i, { ...h, operator: val })
                    }
                  >
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HAVING_OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="Value..."
                    value={h.value}
                    onChange={(e) =>
                      updateHaving(i, {
                        ...h,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-[100px] h-8 text-xs"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHaving(i)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddHaving}
                className="w-full text-xs h-8"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Filter
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
