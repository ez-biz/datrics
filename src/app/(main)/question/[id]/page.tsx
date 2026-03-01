"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Play,
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Archive,
  Pencil,
  Clock,
  Database,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultsTable } from "@/components/query/ResultsTable";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { generateSQL } from "@/lib/query-engine/sql-generator";

interface Question {
  id: string;
  name: string;
  description: string | null;
  type: "QUERY_BUILDER" | "NATIVE_SQL";
  queryDefinition: unknown;
  vizSettings: VizSettings | null;
  databaseId: string;
  creator: { id: string; name: string | null; email: string };
  collection: { id: string; name: string } | null;
  verified: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedSql, setGeneratedSql] = useState("");
  const [vizSettings, setVizSettings] = useState<VizSettings>({ chartType: "table" });

  useEffect(() => {
    fetchQuestion();
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`/api/questions/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Question not found");
          router.push("/questions");
          return;
        }
        throw new Error("Failed to fetch question");
      }
      const data = await response.json();
      setQuestion(data);
      if (data.vizSettings) {
        setVizSettings(data.vizSettings);
      }

      // Generate SQL for display
      if (data.type === "QUERY_BUILDER") {
        try {
          const sqlResult = generateSQL(data.queryDefinition, "POSTGRESQL");
          setGeneratedSql(sqlResult.sql);
        } catch (e) {
          setGeneratedSql("-- Could not generate SQL preview");
        }
      } else {
        setGeneratedSql(
          typeof data.queryDefinition === "string"
            ? data.queryDefinition
            : data.queryDefinition.sql || ""
        );
      }

      // Auto-run the query
      runQuery(data);
    } catch (error) {
      toast.error("Failed to load question");
      setLoading(false);
    }
  };

  const runQuery = async (q: Question = question!) => {
    if (!q) return;

    setRunning(true);
    setError(null);

    try {
      const response = await fetch(`/api/questions/${q.id}/run`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Query failed");
        toast.error("Query failed");
      } else {
        setResult(data);
        toast.success(`Completed in ${data.executionTimeMs}ms`);
      }
    } catch (err) {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setRunning(false);
      setLoading(false);
    }
  };

  const deleteQuestion = async () => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Question deleted");
      router.push("/questions");
    } catch (error) {
      toast.error("Failed to delete question");
    }
  };

  if (loading && !question) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/questions")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{question.name}</h1>
              {question.verified && (
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-600"
                >
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              {question.description && (
                <span>{question.description}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated{" "}
                {formatDistanceToNow(new Date(question.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => runQuery()}
            disabled={running}
            className="gap-2"
          >
            {running ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running ? "Running..." : "Refresh"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={deleteQuestion}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue={vizSettings.chartType === "table" ? "table" : "chart"} className="flex-1 flex flex-col h-full">
          <div className="px-6 py-3 border-b bg-background">
            <TabsList className="h-9">
              <TabsTrigger value="table" className="text-xs px-4">
                Table
              </TabsTrigger>
              <TabsTrigger value="chart" className="text-xs px-4">
                Chart
              </TabsTrigger>
              <TabsTrigger value="sql" className="text-xs px-4">
                SQL
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="table"
            className="flex-1 m-0 p-6 overflow-auto"
          >
            {error ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium mb-1">Query Error</p>
                <pre className="font-mono text-xs whitespace-pre-wrap">
                  {error}
                </pre>
              </div>
            ) : running ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  Executing query...
                </div>
              </div>
            ) : result ? (
              <Card className="shadow-sm border-muted">
                <ResultsTable
                  columns={result.columns}
                  rows={result.rows}
                  rowCount={result.rowCount}
                  executionTimeMs={result.executionTimeMs}
                  truncated={result.truncated}
                />
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="chart" className="flex-1 m-0 p-6 overflow-auto">
            {result && !running && (
              <Card className="p-4 shadow-sm border-muted">
                <QueryChart
                  columns={result.columns}
                  rows={result.rows}
                  vizSettings={vizSettings}
                  onVizSettingsChange={setVizSettings}
                />
              </Card>
            )}
            {running && (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  Loading chart...
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sql" className="flex-1 m-0 p-6 overflow-auto">
            <Card className="h-full flex flex-col shadow-sm border-muted overflow-hidden bg-[#1E1E1E]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/10 bg-black/20">
                <span className="text-xs font-mono text-muted-foreground">
                  {question.type === "NATIVE_SQL" ? "Raw SQL" : "Generated SQL"}
                </span>
              </div>
              <div className="flex-1 overflow-auto text-sm">
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
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
