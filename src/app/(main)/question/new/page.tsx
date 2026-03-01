"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Database,
  Table as TableIcon,
  Columns3,
  Filter,
  Calculator,
  ArrowDownAZ,
  Play,
  Save,
  Code2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import { useQueryBuilderStore } from "@/stores/query-builder-store";
import { generateSQL } from "@/lib/query-engine/sql-generator";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DatabaseSelector } from "@/components/query/builder/DatabaseSelector";
import { TableSelector } from "@/components/query/builder/TableSelector";
import { ColumnSelector } from "@/components/query/builder/ColumnSelector";
import { FilterBuilder } from "@/components/query/builder/FilterBuilder";
import { SummarizeBuilder } from "@/components/query/builder/SummarizeBuilder";
import { SortLimitBuilder } from "@/components/query/builder/SortLimitBuilder";
import { ResultsTable } from "@/components/query/ResultsTable";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { SaveQuestionDialog } from "@/components/query/SaveQuestionDialog";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function NewQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collectionId = searchParams.get("collectionId");
  const store = useQueryBuilderStore();

  const [engine, setEngine] = useState<"POSTGRESQL" | "MYSQL" | "SQLITE">(
    "POSTGRESQL",
  );
  const [generatedSql, setGeneratedSql] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [vizSettings, setVizSettings] = useState<VizSettings>({ chartType: "table" });
  const [activeTab, setActiveTab] = useState<string>("results");

  // Fetch engine for syntax highlighting & generation
  useEffect(() => {
    if (!store.databaseId) return;
    fetch(`/api/databases/`)
      .then((r) => r.json())
      .then((dbs) => {
        const db = dbs.find((d: any) => d.id === store.databaseId);
        if (db) setEngine(db.engine);
      });
  }, [store.databaseId]);

  // Generate SQL dynamically when state changes
  useEffect(() => {
    if (!store.databaseId || !store.sourceTable) {
      setGeneratedSql("");
      return;
    }
    try {
      const aqr = store.toAbstractQuery();
      const result = generateSQL(aqr, engine);
      setGeneratedSql(result.sql); // Note: parameters not shown in preview for simplicity
    } catch (e: any) {
      setGeneratedSql(`-- Error generating SQL: ${e.message}`);
    }
  }, [
    store.databaseId,
    store.sourceTable,
    store.columns,
    store.filters,
    store.aggregations,
    store.groupBy,
    store.orderBy,
    store.limit,
    engine,
  ]);

  const runQuery = async () => {
    if (!store.databaseId || !store.sourceTable) {
      toast.error("Please select a database and table");
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    const aqr = store.toAbstractQuery();

    try {
      const res = await fetch(`/api/databases/${store.databaseId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "aqr", query: aqr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Query failed");
        toast.error("Query failed");
      } else {
        setResult(data);
        toast.success(`Completed in ${data.executionTimeMs}ms`);
      }
    } catch {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setRunning(false);
    }
  };

  const steps = [
    {
      id: "database",
      title: "1. Data Source",
      icon: Database,
      isComplete: !!store.databaseId,
      summary: store.databaseId ? "Database selected" : "",
      content: <DatabaseSelector />,
    },
    {
      id: "table",
      title: "2. Base Table",
      icon: TableIcon,
      isComplete: !!store.sourceTable,
      summary: store.sourceTable || "",
      content: <TableSelector />,
      disabled: !store.databaseId,
    },
    {
      id: "columns",
      title: "3. Columns",
      icon: Columns3,
      isComplete: true, // Optional step
      summary:
        store.columns.length === 0
          ? "All (*)"
          : `${store.columns.length} columns`,
      content: <ColumnSelector />,
      disabled: !store.sourceTable,
    },
    {
      id: "filters",
      title: "4. Filters",
      icon: Filter,
      isComplete: true,
      summary:
        store.filters.conditions.length > 0
          ? `${store.filters.conditions.length} conditions`
          : "None",
      content: <FilterBuilder />,
      disabled: !store.sourceTable,
    },
    {
      id: "summarize",
      title: "5. Summarize",
      icon: Calculator,
      isComplete: true,
      summary:
        [
          ...(store.aggregations.length > 0
            ? [`${store.aggregations.length} metrics`]
            : []),
          ...(store.groupBy.length > 0
            ? [`${store.groupBy.length} groups`]
            : []),
        ].join(", ") || "None",
      content: <SummarizeBuilder />,
      disabled: !store.sourceTable,
    },
    {
      id: "sort",
      title: "6. Sort & Limit",
      icon: ArrowDownAZ,
      isComplete: true,
      summary: `Limit: ${store.limit || "None"}`,
      content: <SortLimitBuilder />,
      disabled: !store.sourceTable,
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-xl font-bold">New Question</h1>
          <p className="text-sm text-muted-foreground">
            Build a query visually without writing SQL.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => store.reset()}>
            Reset
          </Button>
          <Button
            onClick={runQuery}
            disabled={!store.sourceTable || running}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {running ? "Running..." : "Run Query"}
          </Button>
          <SaveQuestionDialog
            databaseId={store.databaseId}
            queryDefinition={store.toAbstractQuery()}
            type="QUERY_BUILDER"
            vizSettings={vizSettings}
            disabled={!store.sourceTable || !result}
            collectionId={collectionId}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Steps */}
        <div className="w-80 border-r bg-background overflow-y-auto">
          {steps.map((step, index) => {
            const isActive = activeStep === index;
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`border-b border-border/50 transition-colors ${
                  step.disabled ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 ${
                    isActive ? "bg-muted/50" : ""
                  }`}
                  onClick={() => !step.disabled && setActiveStep(index)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-md ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}
                      >
                        {step.title}
                      </p>
                      {step.summary && (
                        <p className="text-xs text-muted-foreground">
                          {step.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  {isActive ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Step Content Content Dropdown */}
                {isActive && (
                  <div className="p-4 bg-background border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
                    {step.content}

                    {/* Auto-advance helper */}
                    {index < steps.length - 1 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full mt-4 gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveStep(index + 1);
                        }}
                      >
                        Continue <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Content: Preview & Results */}
        <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <div className="px-6 py-3 border-b bg-background flex items-center justify-between">
              <TabsList className="h-9">
                <TabsTrigger value="results" className="text-xs px-4">
                  Table
                </TabsTrigger>
                <TabsTrigger value="chart" className="text-xs px-4">
                  Chart
                </TabsTrigger>
                <TabsTrigger value="sql" className="text-xs px-4 gap-2">
                  <Code2 className="h-3 w-3" /> SQL
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="results"
              className="flex-1 m-0 p-6 overflow-hidden flex flex-col"
            >
              {!result && !error && !running && (
                <div className="flex-1 border-2 border-dashed rounded-xl flex items-center justify-center text-center p-8 bg-background/50">
                  <div className="max-w-sm">
                    <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Play className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Ready to run</h3>
                    <p className="text-sm text-muted-foreground">
                      {store.sourceTable
                        ? "Click Run Query to execute your visual builder logic."
                        : "Select a database and table on the left to get started."}
                    </p>
                  </div>
                </div>
              )}

              {running && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    Executing query...
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive m-4">
                  <p className="font-medium mb-1">Query Error</p>
                  <pre className="font-mono text-xs whitespace-pre-wrap">
                    {error}
                  </pre>
                </div>
              )}

              {result && !running && (
                <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-muted">
                  <div className="flex-1 overflow-auto p-0">
                    <ResultsTable
                      columns={result.columns}
                      rows={result.rows}
                      rowCount={result.rowCount}
                      executionTimeMs={result.executionTimeMs}
                      truncated={result.truncated}
                    />
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent
              value="chart"
              className="flex-1 m-0 p-6 overflow-hidden flex flex-col"
            >
              {!result && !error && !running && (
                <div className="flex-1 border-2 border-dashed rounded-xl flex items-center justify-center text-center p-8 bg-background/50">
                  <div className="max-w-sm">
                    <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Play className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No data to visualize</h3>
                    <p className="text-sm text-muted-foreground">
                      Run a query first to see chart visualization options.
                    </p>
                  </div>
                </div>
              )}

              {running && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    Loading chart...
                  </div>
                </div>
              )}

              {result && !running && (
                <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-muted p-4">
                  <QueryChart
                    columns={result.columns}
                    rows={result.rows}
                    vizSettings={vizSettings}
                    onVizSettingsChange={setVizSettings}
                  />
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sql" className="m-0 p-6 flex-1 overflow-hidden">
              <Card className="h-full flex flex-col shadow-sm border-muted overflow-hidden bg-[#1E1E1E]">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/10 bg-black/20">
                  <span className="text-xs font-mono text-muted-foreground">
                    Generated {engine} SQL
                  </span>
                </div>
                <div className="flex-1 overflow-auto text-sm">
                  {generatedSql ? (
                    <SyntaxHighlighter
                      language="sql"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: "16px",
                        background: "transparent",
                      }}
                      wrapLines={true}
                    >
                      {generatedSql}
                    </SyntaxHighlighter>
                  ) : (
                    <div className="p-4 text-sm font-mono text-muted-foreground h-full flex items-center justify-center">
                      /* SQL will appear here once a table is selected */
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
