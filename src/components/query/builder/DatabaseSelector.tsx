"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryBuilderStore } from "@/stores/query-builder-store";
import { toast } from "sonner";

interface DatabaseOption {
  id: string;
  name: string;
  engine: string;
  databaseName: string;
}

export function DatabaseSelector() {
  const [databases, setDatabases] = useState<DatabaseOption[]>([]);
  const [loading, setLoading] = useState(true);

  const { databaseId, setDatabaseId } = useQueryBuilderStore();

  useEffect(() => {
    fetch("/api/databases")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDatabases(data);
        }
      })
      .catch(() => toast.error("Failed to load databases"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading databases...
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-sm text-center text-muted-foreground">
        No databases configured. Add one in Admin Settings.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {databases.map((db) => {
        const selected = db.id === databaseId;
        return (
          <Button
            key={db.id}
            variant={selected ? "default" : "outline"}
            className={`h-auto p-4 flex flex-col items-start gap-1 justify-start relative ${
              selected ? "ring-2 ring-primary ring-offset-1" : ""
            }`}
            onClick={() => setDatabaseId(db.id)}
          >
            <div className="flex items-center gap-2 font-semibold w-full">
              <Database className="h-4 w-4 shrink-0" />
              <span className="truncate">{db.name}</span>
              {selected && <Check className="h-4 w-4 ml-auto shrink-0" />}
            </div>
            <div className="text-xs opacity-70 flex gap-2">
              <span className="uppercase">{db.engine}</span>
              <span>•</span>
              <span className="truncate max-w-[120px]">{db.databaseName}</span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
