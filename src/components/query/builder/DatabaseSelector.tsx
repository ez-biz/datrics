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
    <div className="flex flex-col gap-2">
      {databases.map((db) => {
        const selected = db.id === databaseId;
        return (
          <Button
            key={db.id}
            variant={selected ? "default" : "outline"}
            className={`h-auto p-3 flex items-center gap-3 justify-start w-full ${
              selected ? "ring-2 ring-primary ring-offset-1" : ""
            }`}
            onClick={() => setDatabaseId(db.id)}
          >
            <Database className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <div className="font-semibold truncate">{db.name}</div>
              <div className="text-xs opacity-70 truncate">
                {db.engine} • {db.databaseName}
              </div>
            </div>
            {selected && <Check className="h-4 w-4 shrink-0 text-primary-foreground" />}
          </Button>
        );
      })}
    </div>
  );
}
