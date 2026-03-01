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
  History,
  FileCode,
  Wand2,
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

interface SchemaColumn {
  name: string;
  type: string;
  rawType: string;
  isPrimaryKey: boolean;
  nullable: boolean;
}

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

import { ResultsTable } from "@/components/query/ResultsTable";
import { SchemaExplorer } from "@/components/query/SchemaExplorer";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { SaveQuestionDialog } from "@/components/query/SaveQuestionDialog";
import { SqlHistoryPanel } from "@/components/query/SqlHistoryPanel";
import { SqlTemplatesPanel } from "@/components/query/SqlTemplatesPanel";
import { useSqlHistoryStore } from "@/stores/sql-history-store";
import { formatSQL } from "@/lib/sql-formatter";
import { suggestChart, type ChartSuggestion } from "@/lib/chart-suggestions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DatabaseOption {
  id: string;
  name: string;
  engine: string;
  databaseName: string;
}

interface QueryResultData {
  columns: { name: string; type: string }[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
  sql?: string;
}

type SidebarTab = "schema" | "history" | "templates";

interface EditingQuestion {
  id: string;
  name: string;
  description: string;
}

interface SqlEditorPanelProps {
  editQuestionId?: string | null;
  collectionId?: string | null;
}

export function SqlEditorPanel({
  editQuestionId,
  collectionId,
}: SqlEditorPanelProps) {
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
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("schema");
  const [activeTab, setActiveTab] = useState<string>("table");
  const [vizSettings, setVizSettings] = useState<VizSettings>({
    chartType: "table",
  });
  const [editingQuestion, setEditingQuestion] =
    useState<EditingQuestion | null>(null);
  const [chartSuggestion, setChartSuggestion] =
    useState<ChartSuggestion | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const sqlRef = useRef(sql);
  sqlRef.current = sql;

  const { addEntry } = useSqlHistoryStore();

  // Load question for edit mode
  useEffect(() => {
    if (!editQuestionId) {
      setEditingQuestion(null);
      return;
    }

    fetch(`/api/questions/${editQuestionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load question");
        return r.json();
      })
      .then((q) => {
        setEditingQuestion({
          id: q.id,
          name: q.name,
          description: q.description || "",
        });
        const queryDef = q.queryDefinition;
        const sqlText =
          typeof queryDef === "string" ? queryDef : queryDef?.sql || "";
        setSql(sqlText);
        if (q.databaseId) setSelectedDbId(q.databaseId);
        if (q.vizSettings) setVizSettings(q.vizSettings);
      })
      .catch(() => toast.error("Failed to load question for editing"));
  }, [editQuestionId]);

  // Fetch databases
  useEffect(() => {
    fetch("/api/databases")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDatabases(data);
          if (data.length > 0 && !selectedDbId) setSelectedDbId(data[0].id);
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

  // Get selected database info
  const selectedDb = databases.find((d) => d.id === selectedDbId);

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

        addEntry({
          sql: currentSql,
          databaseId: selectedDbId,
          databaseName: selectedDb?.name || "Unknown",
          error: data.error || "Query failed",
        });
      } else {
        setResult(data);
        toast.success(`Query completed in ${data.executionTimeMs}ms`);

        const suggestion = suggestChart(data.columns, data.rowCount);
        if (
          suggestion.chartType !== "table" &&
          suggestion.confidence !== "low"
        ) {
          setChartSuggestion(suggestion);
          setSuggestionDismissed(false);
        } else {
          setChartSuggestion(null);
        }

        addEntry({
          sql: currentSql,
          databaseId: selectedDbId,
          databaseName: selectedDb?.name || "Unknown",
          executionTimeMs: data.executionTimeMs,
          rowCount: data.rowCount,
        });
      }
    } catch {
      setError("Network error");
      toast.error("Network error");

      addEntry({
        sql: currentSql,
        databaseId: selectedDbId,
        databaseName: selectedDb?.name || "Unknown",
        error: "Network error",
      });
    } finally {
      setRunning(false);
    }
  }, [selectedDbId, selectedDb?.name, addEntry]);

  const handleInsertText = useCallback((text: string) => {
    setSql(text);
  }, []);

  const handleFormat = useCallback(() => {
    const formatted = formatSQL(sql);
    setSql(formatted);
    toast.success("SQL formatted");
  }, [sql]);

  const applySuggestion = useCallback(() => {
    if (!chartSuggestion) return;
    setVizSettings({
      chartType: chartSuggestion.chartType,
      xAxis: chartSuggestion.xAxis,
      yAxis: chartSuggestion.yAxis,
    });
    setActiveTab("chart");
    setSuggestionDismissed(true);
  }, [chartSuggestion]);

  useEffect(() => {
    const handleFormatEvent = () => {
      handleFormat();
    };
    window.addEventListener("sql-format-requested", handleFormatEvent);
    return () => {
      window.removeEventListener("sql-format-requested", handleFormatEvent);
    };
  }, [handleFormat]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background/95">
        {editingQuestion && (
          <span className="text-sm text-muted-foreground">
            Editing: <strong>{editingQuestion.name}</strong>
          </span>
        )}

        <div className="flex-1" />

        <Select value={selectedDbId} onValueChange={setSelectedDbId}>
          <SelectTrigger className="w-[220px]">
            <Database className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Select database..." />
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

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFormat}
                disabled={!sql.trim()}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Format SQL
              <kbd className="ml-2 text-xs bg-muted px-1 rounded">
                Shift+F
              </kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

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
          {running ? "Running..." : "Run"}
          <kbd className="hidden sm:inline-flex ml-1 text-xs bg-primary-foreground/20 px-1 rounded">
            Enter
          </kbd>
        </Button>

        <SaveQuestionDialog
          databaseId={selectedDbId}
          queryDefinition={{ sql }}
          type="NATIVE_SQL"
          vizSettings={vizSettings}
          disabled={!selectedDbId || !result}
          columns={result?.columns}
          rows={result?.rows}
          onVizSettingsChange={setVizSettings}
          collectionId={collectionId}
          editMode={
            editingQuestion
              ? {
                  questionId: editingQuestion.id,
                  name: editingQuestion.name,
                  description: editingQuestion.description,
                }
              : undefined
          }
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
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
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-72 border-r flex-shrink-0 overflow-hidden flex flex-col">
            <div className="flex border-b">
              <button
                onClick={() => setSidebarTab("schema")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === "schema"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                Schema
              </button>
              <button
                onClick={() => setSidebarTab("history")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === "history"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History
              </button>
              <button
                onClick={() => setSidebarTab("templates")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  sidebarTab === "templates"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                Templates
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {sidebarTab === "schema" &&
                (loadingSchema ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : schema.length > 0 ? (
                  <SchemaExplorer
                    tables={schema}
                    databaseName={selectedDb?.databaseName}
                    onInsert={(text) => {
                      setSql((prev) => {
                        const trimmed = prev.trimEnd();
                        return trimmed.endsWith(";")
                          ? `${trimmed.slice(0, -1)} ${text};`
                          : `${trimmed} ${text}`;
                      });
                    }}
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
                ))}

              {sidebarTab === "history" && (
                <SqlHistoryPanel
                  databaseId={selectedDbId}
                  onSelect={handleInsertText}
                />
              )}

              {sidebarTab === "templates" && (
                <SqlTemplatesPanel onSelect={handleInsertText} />
              )}
            </div>
          </div>
        )}

        {/* Editor + Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 pb-2">
            <SqlEditor
              value={sql}
              onChange={setSql}
              onRun={runQuery}
              height="250px"
              schema={schema}
              databaseName={selectedDb?.databaseName}
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
            {result && (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col"
              >
                <div className="flex items-center gap-3">
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

                  {chartSuggestion &&
                    !suggestionDismissed &&
                    activeTab === "table" &&
                    chartSuggestion.confidence === "high" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5 border">
                        <BarChart3 className="h-3.5 w-3.5 text-primary" />
                        <span>
                          This looks like a{" "}
                          <strong className="text-foreground">
                            {chartSuggestion.label}
                          </strong>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-primary"
                          onClick={applySuggestion}
                        >
                          Try it
                        </Button>
                        <button
                          className="text-muted-foreground/60 hover:text-muted-foreground ml-1"
                          onClick={() => setSuggestionDismissed(true)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                </div>

                <TabsContent
                  value="table"
                  className="flex-1 overflow-auto mt-2"
                >
                  <ResultsTable
                    columns={result.columns}
                    rows={result.rows}
                    rowCount={result.rowCount}
                    executionTimeMs={result.executionTimeMs}
                    truncated={result.truncated}
                    sql={result.sql}
                  />
                </TabsContent>

                <TabsContent
                  value="chart"
                  className="flex-1 overflow-auto mt-2"
                >
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
                      + Enter
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
                  Executing query...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
