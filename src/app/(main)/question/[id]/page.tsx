"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
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
  History,
  RotateCcw,
  Share2,
  Copy,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ResultsTable } from "@/components/query/ResultsTable";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { generateSQL } from "@/lib/query-engine/sql-generator";

interface Version {
  id: string;
  version: number;
  changeNote: string | null;
  createdAt: string;
  createdById: string;
}

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
  isPublic?: boolean;
  publicSlug?: string | null;
  embedToken?: string | null;
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

  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [embedToken, setEmbedToken] = useState<string | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasUserChangedViz = useRef(false);
  const vizSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save for vizSettings changes
  const handleVizSettingsChange = useCallback(
    (newSettings: VizSettings) => {
      setVizSettings(newSettings);
      hasUserChangedViz.current = true;

      if (vizSaveTimer.current) clearTimeout(vizSaveTimer.current);
      vizSaveTimer.current = setTimeout(async () => {
        if (!question) return;
        try {
          await fetch(`/api/questions/${question.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vizSettings: newSettings }),
          });
          toast.success("Chart settings saved", { duration: 1500 });
        } catch {
          // Non-critical
        }
      }, 2000);
    },
    [question]
  );

  useEffect(() => {
    return () => {
      if (vizSaveTimer.current) clearTimeout(vizSaveTimer.current);
    };
  }, []);

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
      if (data.isPublic !== undefined) setIsPublic(data.isPublic);
      if (data.publicSlug) setPublicSlug(data.publicSlug);
      if (data.embedToken) setEmbedToken(data.embedToken);
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

  const toggleSharing = async (newValue: boolean) => {
    if (!question) return;
    setSharingLoading(true);
    try {
      const response = await fetch(`/api/questions/${question.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newValue }),
      });
      if (!response.ok) throw new Error("Failed to update sharing");
      const data = await response.json();
      setIsPublic(data.isPublic);
      setPublicSlug(data.publicSlug);
      setEmbedToken(data.embedToken);
      toast.success(data.isPublic ? "Public sharing enabled" : "Public sharing disabled");
    } catch {
      toast.error("Failed to update sharing settings");
    } finally {
      setSharingLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchVersions = async () => {
    setVersionsLoading(true);
    try {
      const response = await fetch(`/api/questions/${id}/versions`);
      if (!response.ok) throw new Error("Failed to fetch versions");
      const data = await response.json();
      setVersions(Array.isArray(data) ? data : data.versions || []);
    } catch {
      toast.error("Failed to load version history");
    } finally {
      setVersionsLoading(false);
    }
  };

  const saveVersion = async () => {
    const changeNote = prompt("Change note (optional):");
    if (changeNote === null) return;
    setSavingVersion(true);
    try {
      const response = await fetch(`/api/questions/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeNote: changeNote || undefined }),
      });
      if (!response.ok) throw new Error("Failed to save version");
      toast.success("Version saved");
      fetchVersions();
    } catch {
      toast.error("Failed to save version");
    } finally {
      setSavingVersion(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!confirm("Restore this version? Current state will be overwritten.")) return;
    try {
      const response = await fetch(
        `/api/questions/${id}/versions/${versionId}/restore`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error("Failed to restore version");
      toast.success("Version restored");
      setHistoryOpen(false);
      fetchQuestion();
    } catch {
      toast.error("Failed to restore version");
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
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Share Question</DialogTitle>
                <DialogDescription>
                  Control public access and get embed codes for this question.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Public sharing</label>
                    <p className="text-xs text-muted-foreground">
                      Anyone with the link can view this question
                    </p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={toggleSharing}
                    disabled={sharingLoading}
                  />
                </div>
                {isPublic && publicSlug && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Public URL</label>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={`${typeof window !== "undefined" ? window.location.origin : ""}/public/question/${publicSlug}`}
                          className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/public/question/${publicSlug}`,
                              "url"
                            )
                          }
                        >
                          {copiedField === "url" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {embedToken && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Embed code</label>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/question/${embedToken}" width="100%" height="400" frameborder="0"></iframe>`}
                            className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(
                                `<iframe src="${window.location.origin}/embed/question/${embedToken}" width="100%" height="400" frameborder="0"></iframe>`,
                                "embed"
                              )
                            }
                          >
                            {copiedField === "embed" ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={question.type !== "NATIVE_SQL"}
                onClick={() => {
                  if (question.type === "NATIVE_SQL") {
                    router.push(`/question/new?mode=sql&edit=${question.id}`);
                  }
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setHistoryOpen(true);
                  fetchVersions();
                }}
              >
                <History className="h-4 w-4 mr-2" />
                Version History
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

      {/* Version History Sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Button
              onClick={saveVersion}
              disabled={savingVersion}
              className="w-full gap-2"
            >
              {savingVersion ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <History className="h-4 w-4" />
              )}
              {savingVersion ? "Saving..." : "Save Version"}
            </Button>

            <div className="space-y-2">
              {versionsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : versions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No versions yet. Save a version to create a snapshot.
                </p>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-start justify-between rounded-lg border p-3 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs shrink-0">
                          v{version.version}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {formatDistanceToNow(new Date(version.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {version.changeNote && (
                        <p className="text-sm mt-1 text-muted-foreground">
                          {version.changeNote}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreVersion(version.id)}
                      className="shrink-0 gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
                  onVizSettingsChange={handleVizSettingsChange}
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
