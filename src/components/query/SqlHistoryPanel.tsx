"use client";

import { useState } from "react";
import { History, Clock, Database, CheckCircle, XCircle, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useSqlHistoryStore,
  SqlHistoryEntry,
} from "@/stores/sql-history-store";
import { cn } from "@/lib/utils";

interface SqlHistoryPanelProps {
  databaseId?: string;
  onSelect: (sql: string) => void;
}

export function SqlHistoryPanel({ databaseId, onSelect }: SqlHistoryPanelProps) {
  const { history, removeEntry, clearHistory, getRecentQueries } = useSqlHistoryStore();
  const [search, setSearch] = useState("");

  const entries = databaseId ? getRecentQueries(databaseId, 50) : history.slice(0, 50);

  const filteredEntries = search
    ? entries.filter(
        (e) =>
          e.sql.toLowerCase().includes(search.toLowerCase()) ||
          e.databaseName.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateSql = (sql: string, maxLength: number = 100) => {
    const normalized = sql.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return normalized.slice(0, maxLength) + "...";
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No query history</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Executed queries will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4 text-primary" />
            Query History
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredEntries.map((entry) => (
            <HistoryEntryItem
              key={entry.id}
              entry={entry}
              onSelect={() => onSelect(entry.sql)}
              onRemove={() => removeEntry(entry.id)}
              formatTime={formatTime}
              truncateSql={truncateSql}
              showDatabase={!databaseId}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface HistoryEntryItemProps {
  entry: SqlHistoryEntry;
  onSelect: () => void;
  onRemove: () => void;
  formatTime: (iso: string) => string;
  truncateSql: (sql: string, max?: number) => string;
  showDatabase: boolean;
}

function HistoryEntryItem({
  entry,
  onSelect,
  onRemove,
  formatTime,
  truncateSql,
  showDatabase,
}: HistoryEntryItemProps) {
  return (
    <div
      className={cn(
        "group relative p-2 rounded-md border cursor-pointer transition-colors",
        "hover:bg-accent hover:border-accent-foreground/20",
        entry.error ? "border-destructive/30 bg-destructive/5" : "bg-card"
      )}
      onClick={onSelect}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      <div className="pr-8">
        <code className="text-xs font-mono text-foreground/90 block break-all">
          {truncateSql(entry.sql)}
        </code>

        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(entry.executedAt)}
          </span>

          {showDatabase && (
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              {entry.databaseName}
            </span>
          )}

          {entry.error ? (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="h-3 w-3" />
              Failed
            </span>
          ) : entry.rowCount !== undefined ? (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              {entry.rowCount} rows
              {entry.executionTimeMs && ` (${entry.executionTimeMs}ms)`}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
