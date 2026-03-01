"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Column {
  name: string;
  type: string;
}

interface ColumnComboboxProps {
  columns: Column[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  includeAllRows?: boolean;
  className?: string;
}

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

export function ColumnCombobox({
  columns,
  value,
  onChange,
  placeholder = "Select column...",
  includeAllRows = false,
  className,
}: ColumnComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedColumn = columns.find((c) => c.name === value);
  const displayValue = value === "*" ? "All rows (*)" : selectedColumn?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No column found.</CommandEmpty>
            <CommandGroup>
              {includeAllRows && (
                <CommandItem
                  value="*"
                  onSelect={() => {
                    onChange("*");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "*" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>All rows (*)</span>
                </CommandItem>
              )}
              {columns.map((col) => (
                <CommandItem
                  key={col.name}
                  value={col.name}
                  onSelect={() => {
                    onChange(col.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === col.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">{col.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-2 text-[10px] px-1 py-0 font-normal",
                      typeColor(col.type)
                    )}
                  >
                    {col.type}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
