"use client";

import { useState } from "react";
import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export interface DashboardFilter {
  id: string;
  type: "date_range" | "text";
  label: string;
  value: string;
  field?: string; // column name to filter on
}

interface DashboardFiltersProps {
  filters: DashboardFilter[];
  onFiltersChange: (filters: DashboardFilter[]) => void;
  editing?: boolean;
}

export function DashboardFilters({
  filters,
  onFiltersChange,
  editing,
}: DashboardFiltersProps) {
  const [addOpen, setAddOpen] = useState(false);

  const updateFilter = (id: string, value: string) => {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, value } : f))
    );
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  const addDateFilter = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);
    const toDate = now.toISOString().slice(0, 10);

    onFiltersChange([
      ...filters,
      {
        id: crypto.randomUUID(),
        type: "date_range",
        label: "Date Range",
        value: `${fromDate}:${toDate}`,
      },
    ]);
    setAddOpen(false);
  };

  const addTextFilter = () => {
    onFiltersChange([
      ...filters,
      {
        id: crypto.randomUUID(),
        type: "text",
        label: "Search",
        value: "",
      },
    ]);
    setAddOpen(false);
  };

  if (filters.length === 0 && !editing) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-1">
          {filter.type === "date_range" ? (
            <DateRangeFilter
              filter={filter}
              onChange={(value) => updateFilter(filter.id, value)}
              onRemove={editing ? () => removeFilter(filter.id) : undefined}
            />
          ) : (
            <TextFilter
              filter={filter}
              onChange={(value) => updateFilter(filter.id, value)}
              onRemove={editing ? () => removeFilter(filter.id) : undefined}
            />
          )}
        </div>
      ))}

      {editing && (
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 border-dashed">
              <Filter className="h-3.5 w-3.5" />
              Add Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              onClick={addDateFilter}
            >
              <Calendar className="h-4 w-4" />
              Date Range
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              onClick={addTextFilter}
            >
              <Filter className="h-4 w-4" />
              Text Filter
            </button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function DateRangeFilter({
  filter,
  onChange,
  onRemove,
}: {
  filter: DashboardFilter;
  onChange: (value: string) => void;
  onRemove?: () => void;
}) {
  const [from, to] = (filter.value || ":").split(":");

  return (
    <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <Input
        type="date"
        value={from}
        onChange={(e) => onChange(`${e.target.value}:${to}`)}
        className="h-7 w-[130px] border-0 p-0 text-xs shadow-none focus-visible:ring-0"
      />
      <span className="text-xs text-muted-foreground">to</span>
      <Input
        type="date"
        value={to}
        onChange={(e) => onChange(`${from}:${e.target.value}`)}
        className="h-7 w-[130px] border-0 p-0 text-xs shadow-none focus-visible:ring-0"
      />
      {onRemove && (
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function TextFilter({
  filter,
  onChange,
  onRemove,
}: {
  filter: DashboardFilter;
  onChange: (value: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <Input
        value={filter.value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter..."
        className="h-7 w-[150px] border-0 p-0 text-xs shadow-none focus-visible:ring-0"
      />
      {onRemove && (
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
