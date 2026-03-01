"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileQuestion,
  LayoutDashboard,
  Database,
  Table2,
  Loader2,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  id: string;
  type: "question" | "dashboard" | "table" | "database";
  name: string;
  description?: string | null;
  metadata?: Record<string, string>;
}

const typeIcons = {
  question: FileQuestion,
  dashboard: LayoutDashboard,
  database: Database,
  table: Table2,
};

const typeLabels = {
  question: "Questions",
  dashboard: "Dashboards",
  database: "Databases",
  table: "Tables",
};

const typeColors = {
  question: "text-blue-500",
  dashboard: "text-purple-500",
  database: "text-green-500",
  table: "text-orange-500",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 200);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search when query changes
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");

    switch (result.type) {
      case "question":
        router.push(`/question/${result.id}`);
        break;
      case "dashboard":
        router.push(`/dashboard/${result.id}`);
        break;
      case "database":
        router.push(`/admin/databases/${result.id}`);
        break;
      case "table":
        // Table ID format: databaseId:tableName
        const [databaseId] = result.id.split(":");
        router.push(`/question/new?database=${databaseId}&table=${result.name}`);
        break;
    }
  };

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const resultTypes = Object.keys(groupedResults) as Array<
    "question" | "dashboard" | "database" | "table"
  >;

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search across questions, dashboards, and databases"
      >
        <CommandInput
          placeholder="Search questions, dashboards, tables..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
          )}

          {!loading && !query && (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Search className="h-8 w-8 opacity-50" />
                <p>Start typing to search...</p>
              </div>
            </CommandEmpty>
          )}

          {!loading &&
            resultTypes.map((type, index) => (
              <div key={type}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={typeLabels[type]}>
                  {groupedResults[type].map((result) => {
                    const Icon = typeIcons[result.type];
                    return (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.id}-${result.name}`}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3"
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${typeColors[result.type]}`}
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate font-medium">
                            {result.name}
                          </span>
                          {result.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {result.description}
                            </span>
                          )}
                        </div>
                        {result.metadata && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                            {result.metadata.database && (
                              <span className="bg-muted px-1.5 py-0.5 rounded">
                                {result.metadata.database}
                              </span>
                            )}
                            {result.metadata.engine && (
                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                                {result.metadata.engine}
                              </span>
                            )}
                          </div>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </div>
            ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
