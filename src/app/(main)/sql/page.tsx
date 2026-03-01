"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Play,
  Database,
  Loader2,
  Code2,
  PanelLeftClose,
  PanelLeft,
  BarChart3,
  Table,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SqlEditor } from "@/components/query/SqlEditor";
import { ResultsTable } from "@/components/query/ResultsTable";
import { SchemaExplorer } from "@/components/query/SchemaExplorer";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { SaveQuestionDialog } from "@/components/query/SaveQuestionDialog";

interface DatabaseOption {
  id: string;
  name: string;
  engine: string;
  databaseName: string;
}

interface SchemaTable {
  name: string;
  columns: {
    name: string;
    type: string;
    rawType: string;
    isPrimaryKey: boolean;
    nullable: boolean;
  }[];
}

interface QueryResultData {
  columns: { name: string; type: string }[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
  sql?: string;
}

export default function SqlPlaygroundPage() {
  // State
  const [databases, setDatabases] = useState<DatabaseOption[]>([]);
  const [selectedDbId, setSelectedDbId] = useState<string>("");
  const [schema, setSchema] = useState<SchemaTable[]>([]);
  const [sql, setSql] = useState("SELECT 1;");
  const [result, setResult] = useState<QueryResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("table");
  const [vizSettings, setVizSettings] = useState<VizSettings>({ chartType: "table" });
  const sqlRef = useRef(sql);
  sqlRef.current = sql;

  // Fetch databases
  useEffect(() => {
    fetch("/api/databases")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDatabases(data);
          if (data.length > 0) setSelectedDbId(data[0].id);
        }
      })
      .catch(() => toast.error("Failed to load databases"));
  }, []);

  // Fetch schema when DB changes
  useEffect(() => {
    if (!selectedDbId) {
      setSchema([]);
      return;
    }

    setLoadingSchema(true);
    fetch(`/api/databases/${selectedDbId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.schemaCache) {
          try {
            const parsed = JSON.parse(data.schemaCache);
            setSchema(parsed.tables || []);
          } catch {
            setSchema([]);
          }
        } else {
          setSchema([]);
        }
      })
      .catch(() => setSchema([]))
      .finally(() => setLoadingSchema(false));
  }, [selectedDbId]);

  // Run query
  const runQuery = useCallback(async () => {
    if (!selectedDbId) {
      toast.error("Please select a database first");
      return;
    }

    const currentSql = sqlRef.current.trim();
    if (!currentSql) {
      toast.error("Please enter a SQL query");
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/databases/${selectedDbId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "native", sql: currentSql }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Query failed");
        toast.error(data.error || "Query failed");
      } else {
        setResult(data);
        toast.success(`Query completed in ${data.executionTimeMs}ms`);
      }
    } catch {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setRunning(false);
    }
  }, [selectedDbId]);

  // Insert text from schema explorer
  const handleInsertText = useCallback((text: string) => {
    setSql((prev) => {
      // Simple: append at cursor position or end
      const trimmed = prev.trimEnd();
      return trimmed.endsWith(";")
        ? `${trimmed.slice(0, -1)} ${text};`
        : `${trimmed} ${text}`;
    });
  }, []);

  const selectedDb = databases.find((d) => d.id === selectedDbId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">SQL Editor</h1>
        </div>

        <div className="flex-1" />

        <Select value={selectedDbId} onValueChange={setSelectedDbId}>
          <SelectTrigger className="w-[220px]">
            <Database className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Select database…" />
          </SelectTrigger>
          <SelectContent>
            {databases.map((db) => (
              <SelectItem key={db.id} value={db.id}>
                <span className="flex items-center gap-2">
                  {db.name}
                  <span className="text-xs text-muted-foreground">
                    {db.engine}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={runQuery}
          disabled={running || !selectedDbId}
          className="gap-2"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running ? "Running…" : "Run"}
          <kbd className="hidden sm:inline-flex ml-1 text-xs bg-primary-foreground/20 px-1 rounded">
            ⌘↵
          </kbd>
        </Button>

        <SaveQuestionDialog
          databaseId={selectedDbId}
          queryDefinition={{ sql }}
          type="NATIVE_SQL"
          vizSettings={vizSettings}
          disabled={!selectedDbId || !result}
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Hide schema" : "Show schema"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Schema Sidebar */}
        {sidebarOpen && (
          <div className="w-64 border-r flex-shrink-0 overflow-hidden">
            {loadingSchema ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : schema.length > 0 ? (
              <SchemaExplorer
                tables={schema}
                databaseName={selectedDb?.databaseName}
                onInsert={handleInsertText}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-2">
                <Database className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {selectedDbId
                    ? "No schema available. Sync the database first."
                    : "Select a database to browse its schema."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Editor + Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor area */}
          <div className="p-4 pb-2">
            <SqlEditor
              value={sql}
              onChange={setSql}
              onRun={runQuery}
              height="250px"
            />
          </div>

          {/* Results area with tabs */}
          <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
            {result && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="h-8 w-fit">
                  <TabsTrigger value="table" className="text-xs gap-1.5">
                    <Table className="h-3 w-3" />
                    Table
                  </TabsTrigger>
                  <TabsTrigger value="chart" className="text-xs gap-1.5">
                    <BarChart3 className="h-3 w-3" />
                    Chart
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="table" className="flex-1 overflow-auto mt-2">
                  <ResultsTable
                    columns={result.columns}
                    rows={result.rows}
                    rowCount={result.rowCount}
                    executionTimeMs={result.executionTimeMs}
                    truncated={result.truncated}
                    sql={result.sql}
                  />
                </TabsContent>

                <TabsContent value="chart" className="flex-1 overflow-auto mt-2">
                  <QueryChart
                    columns={result.columns}
                    rows={result.rows}
                    vizSettings={vizSettings}
                    onVizSettingsChange={setVizSettings}
                  />
                </TabsContent>
              </Tabs>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium mb-1">Query Error</p>
                <pre className="font-mono text-xs whitespace-pre-wrap">
                  {error}
                </pre>
              </div>
            )}

            {!result && !error && !running && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                <Code2 className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <p className="font-medium text-muted-foreground">
                    Write a SQL query and hit Run
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    Use{" "}
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                      ⌘ + Enter
                    </kbd>{" "}
                    to execute
                  </p>
                </div>
              </div>
            )}

            {running && (
              <div className="flex items-center justify-center h-full gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Executing query…
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
