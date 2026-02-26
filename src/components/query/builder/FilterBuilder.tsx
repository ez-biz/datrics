"use client";

import { useEffect, useState } from "react";
import { Plus, X, Filter } from "lucide-react";
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
import { FilterOperator } from "@/lib/query-engine/types";

interface SchemaColumn {
  name: string;
  type: string;
}

const OPERATORS: { value: FilterOperator; label: string; types: string[] }[] = [
  {
    value: "=",
    label: "Equals",
    types: ["string", "number", "boolean", "date"],
  },
  {
    value: "!=",
    label: "Not equals",
    types: ["string", "number", "boolean", "date"],
  },
  { value: ">", label: "Greater than", types: ["number", "date"] },
  { value: "<", label: "Less than", types: ["number", "date"] },
  { value: ">=", label: "Greater or equal", types: ["number", "date"] },
  { value: "<=", label: "Less or equal", types: ["number", "date"] },
  { value: "contains", label: "Contains", types: ["string"] },
  { value: "not_contains", label: "Does not contain", types: ["string"] },
  { value: "starts_with", label: "Starts with", types: ["string"] },
  { value: "ends_with", label: "Ends with", types: ["string"] },
  {
    value: "is_null",
    label: "Is empty/null",
    types: ["string", "number", "boolean", "date"],
  },
  {
    value: "is_not_null",
    label: "Not empty/null",
    types: ["string", "number", "boolean", "date"],
  },
  { value: "between", label: "Between", types: ["number", "date"] },
];

export function FilterBuilder() {
  const {
    databaseId,
    sourceTable,
    filters,
    addFilter,
    removeFilter,
    updateFilter,
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
        Select a table first to add filters.
      </div>
    );
  }

  const handleAddFilter = () => {
    if (availableColumns.length === 0) return;
    // Default to first column, "=" operator
    addFilter({
      column: availableColumns[0].name,
      operator: "=",
      value: "",
    });
  };

  const getValidOperators = (columnName: string) => {
    const col = availableColumns.find((c) => c.name === columnName);
    const type = col?.type || "string";
    return OPERATORS.filter((o) => o.types.includes(type));
  };

  return (
    <div className="space-y-3">
      {filters.conditions.length === 0 ? (
        <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-sm text-center text-muted-foreground flex flex-col items-center gap-2">
          <Filter className="h-5 w-5 opacity-50" />
          <p>No filters applied. Query will return all rows.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFilter}
            className="mt-1"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Filter
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filters.conditions.map((cond, i) => {
            // we only support flat conditions for MVP
            if ("logic" in cond) return null;

            const operators = getValidOperators(cond.column);
            const needsValue = !["is_null", "is_not_null"].includes(
              cond.operator,
            );
            const needsTwoValues = cond.operator === "between";

            return (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 p-2 rounded border bg-card/50 shadow-sm relative pr-10"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFilter(i)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <Select
                  value={cond.column}
                  onValueChange={(val) => {
                    const ops = getValidOperators(val);
                    const newOp = ops.some((o) => o.value === cond.operator)
                      ? cond.operator
                      : ops[0].value;
                    updateFilter(i, { ...cond, column: val, operator: newOp });
                  }}
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
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

                <Select
                  value={cond.operator}
                  onValueChange={(val: FilterOperator) =>
                    updateFilter(i, { ...cond, operator: val })
                  }
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {needsValue && (
                  <Input
                    placeholder="Value..."
                    value={String(cond.value || "")}
                    onChange={(e) =>
                      updateFilter(i, { ...cond, value: e.target.value })
                    }
                    className="flex-1 min-w-[120px] h-9"
                  />
                )}

                {needsTwoValues && (
                  <>
                    <span className="text-sm font-medium text-muted-foreground px-1">
                      and
                    </span>
                    <Input
                      placeholder="Max value..."
                      value={String(cond.value2 || "")}
                      onChange={(e) =>
                        updateFilter(i, { ...cond, value2: e.target.value })
                      }
                      className="flex-1 min-w-[120px] h-9"
                    />
                  </>
                )}
              </div>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFilter}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2 text-muted-foreground" /> Add another
            filter
          </Button>
        </div>
      )}
    </div>
  );
}
