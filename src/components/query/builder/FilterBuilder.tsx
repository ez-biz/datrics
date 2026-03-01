"use client";

import { useEffect } from "react";
import { Plus, X, Filter, FolderPlus } from "lucide-react";
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
import { useSchemaStore } from "@/stores/schema-store";
import {
  FilterCondition,
  FilterGroup,
  FilterOperator,
} from "@/lib/query-engine/types";
import { ColumnCombobox } from "./ColumnCombobox";
import { cn } from "@/lib/utils";

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

interface FilterConditionRowProps {
  condition: FilterCondition;
  columns: { name: string; type: string }[];
  onChange: (condition: FilterCondition) => void;
  onRemove: () => void;
}

function FilterConditionRow({
  condition,
  columns,
  onChange,
  onRemove,
}: FilterConditionRowProps) {
  const getValidOperators = (columnName: string) => {
    const col = columns.find((c) => c.name === columnName);
    const type = col?.type || "string";
    return OPERATORS.filter((o) => o.types.includes(type));
  };

  const operators = getValidOperators(condition.column);
  const needsValue = !["is_null", "is_not_null"].includes(condition.operator);
  const needsTwoValues = condition.operator === "between";

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded border bg-card/50 shadow-sm relative pr-10">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>

      <ColumnCombobox
        columns={columns}
        value={condition.column}
        onChange={(val) => {
          const ops = getValidOperators(val);
          const newOp = ops.some((o) => o.value === condition.operator)
            ? condition.operator
            : ops[0].value;
          onChange({ ...condition, column: val, operator: newOp });
        }}
        placeholder="Select column"
        className="w-[180px] h-9"
      />

      <Select
        value={condition.operator}
        onValueChange={(val: FilterOperator) =>
          onChange({ ...condition, operator: val })
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
          value={String(condition.value || "")}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
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
            value={String(condition.value2 || "")}
            onChange={(e) => onChange({ ...condition, value2: e.target.value })}
            className="flex-1 min-w-[120px] h-9"
          />
        </>
      )}
    </div>
  );
}

interface LogicToggleProps {
  logic: "AND" | "OR";
  onToggle: () => void;
}

function LogicToggle({ logic, onToggle }: LogicToggleProps) {
  return (
    <div className="flex items-center justify-center py-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn(
          "h-6 px-3 text-xs font-semibold rounded-full",
          logic === "AND"
            ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
            : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
        )}
      >
        {logic}
      </Button>
    </div>
  );
}

interface FilterGroupComponentProps {
  group: FilterGroup;
  columns: { name: string; type: string }[];
  depth: number;
  path: number[];
  onUpdate: (path: number[], item: FilterCondition | FilterGroup) => void;
  onRemove: (path: number[]) => void;
  onAddCondition: (path: number[]) => void;
  onAddGroup: (path: number[]) => void;
  onToggleLogic: (path: number[]) => void;
}

function FilterGroupComponent({
  group,
  columns,
  depth,
  path,
  onUpdate,
  onRemove,
  onAddCondition,
  onAddGroup,
  onToggleLogic,
}: FilterGroupComponentProps) {
  const isRoot = depth === 0;

  return (
    <div
      className={cn(
        "space-y-2",
        !isRoot && "ml-4 pl-3 border-l-2 border-primary/30 py-2"
      )}
    >
      {!isRoot && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            Group ({group.logic})
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(path)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {group.conditions.map((cond, i) => {
        const itemPath = [...path, i];

        return (
          <div key={i}>
            {i > 0 && (
              <LogicToggle
                logic={group.logic}
                onToggle={() => onToggleLogic(path)}
              />
            )}
            {"logic" in cond ? (
              <FilterGroupComponent
                group={cond as FilterGroup}
                columns={columns}
                depth={depth + 1}
                path={itemPath}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onAddCondition={onAddCondition}
                onAddGroup={onAddGroup}
                onToggleLogic={onToggleLogic}
              />
            ) : (
              <FilterConditionRow
                condition={cond as FilterCondition}
                columns={columns}
                onChange={(updated) => onUpdate(itemPath, updated)}
                onRemove={() => onRemove(itemPath)}
              />
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddCondition(path)}
          className="flex-1 border-dashed text-xs h-8"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Condition
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddGroup(path)}
          className="border-dashed text-xs h-8"
        >
          <FolderPlus className="h-3 w-3 mr-1" /> Add Group
        </Button>
      </div>
    </div>
  );
}

export function FilterBuilder() {
  const {
    databaseId,
    sourceTable,
    filters,
    setFilters,
    addFilter,
    removeFilterAt,
    updateFilterAt,
    toggleFilterLogic,
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
        Select a table first to add filters.
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

  const handleAddCondition = (path: number[]) => {
    if (availableColumns.length === 0) return;

    const newCondition: FilterCondition = {
      column: availableColumns[0].name,
      operator: "=",
      value: "",
    };

    if (path.length === 0) {
      addFilter(newCondition);
    } else {
      // Add to nested group
      const addToGroup = (
        group: FilterGroup,
        targetPath: number[]
      ): FilterGroup => {
        if (targetPath.length === 0) {
          return {
            ...group,
            conditions: [...group.conditions, newCondition],
          };
        }
        const [head, ...rest] = targetPath;
        const newConditions = [...group.conditions];
        const target = newConditions[head];
        if ("logic" in target) {
          newConditions[head] = addToGroup(target as FilterGroup, rest);
        }
        return { ...group, conditions: newConditions };
      };
      setFilters(addToGroup(filters, path));
    }
  };

  const handleAddGroup = (path: number[]) => {
    const newGroup: FilterGroup = { logic: "AND", conditions: [] };

    if (path.length === 0) {
      setFilters({
        ...filters,
        conditions: [...filters.conditions, newGroup],
      });
    } else {
      const addToGroup = (
        group: FilterGroup,
        targetPath: number[]
      ): FilterGroup => {
        if (targetPath.length === 0) {
          return {
            ...group,
            conditions: [...group.conditions, newGroup],
          };
        }
        const [head, ...rest] = targetPath;
        const newConditions = [...group.conditions];
        const target = newConditions[head];
        if ("logic" in target) {
          newConditions[head] = addToGroup(target as FilterGroup, rest);
        }
        return { ...group, conditions: newConditions };
      };
      setFilters(addToGroup(filters, path));
    }
  };

  const handleToggleLogic = (path: number[]) => {
    if (path.length === 0) {
      toggleFilterLogic();
    } else {
      const toggleInGroup = (
        group: FilterGroup,
        targetPath: number[]
      ): FilterGroup => {
        if (targetPath.length === 0) {
          return {
            ...group,
            logic: group.logic === "AND" ? "OR" : "AND",
          };
        }
        const [head, ...rest] = targetPath;
        const newConditions = [...group.conditions];
        const target = newConditions[head];
        if ("logic" in target) {
          newConditions[head] = toggleInGroup(target as FilterGroup, rest);
        }
        return { ...group, conditions: newConditions };
      };
      setFilters(toggleInGroup(filters, path));
    }
  };

  if (filters.conditions.length === 0) {
    return (
      <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-sm text-center text-muted-foreground flex flex-col items-center gap-2">
        <Filter className="h-5 w-5 opacity-50" />
        <p>No filters applied. Query will return all rows.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddCondition([])}
          className="mt-1"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Filter
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FilterGroupComponent
        group={filters}
        columns={availableColumns}
        depth={0}
        path={[]}
        onUpdate={updateFilterAt}
        onRemove={removeFilterAt}
        onAddCondition={handleAddCondition}
        onAddGroup={handleAddGroup}
        onToggleLogic={handleToggleLogic}
      />
    </div>
  );
}
