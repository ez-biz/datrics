"use client";

import { cn } from "@/lib/utils";
import { CHART_TYPES } from "./QueryChart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChartTypePickerProps {
  value: string;
  onChange: (chartType: string) => void;
  size?: "sm" | "md";
  includeTable?: boolean;
}

export function ChartTypePicker({
  value,
  onChange,
  size = "md",
  includeTable = false,
}: ChartTypePickerProps) {
  const types = includeTable
    ? [{ value: "table", label: "Table", icon: TableIcon }, ...CHART_TYPES]
    : CHART_TYPES;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {types.map((type) => (
          <Tooltip key={type.value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(type.value)}
                className={cn(
                  "flex items-center justify-center rounded-md border transition-colors",
                  size === "sm"
                    ? "h-8 w-8"
                    : "h-9 w-9",
                  value === type.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <type.icon
                  className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {type.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Re-export a simple table icon for the includeTable option
import { Table2 } from "lucide-react";
const TableIcon = Table2;
