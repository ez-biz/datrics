"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Settings,
  Globe,
  Lock,
  Trash2,
  GripVertical,
  X,
  Loader2,
  RefreshCw,
  BarChart3,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  Hash,
  Table2,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { ResultsTable } from "@/components/query/ResultsTable";
import { DashboardFilters, DashboardFilter } from "@/components/dashboard/DashboardFilters";

const CHART_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  table: Table2,
  bar: BarChart3,
  line: LineChartIcon,
  area: AreaChartIcon,
  pie: PieChartIcon,
  scatter: ScatterChartIcon,
  number: Hash,
};

interface DashboardCard {
  id: string;
  cardType: "QUESTION" | "TEXT" | "LINK";
  content: unknown;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  question: {
    id: string;
    name: string;
    type: string;
    vizSettings: VizSettings | null;
    databaseId: string;
  } | null;
}

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  publicSlug: string | null;
  embedToken: string | null;
  filters: string | null;
  cards: DashboardCard[];
  creator: { id: string; name: string | null; email: string };
}

interface Question {
  id: string;
  name: string;
  type: string;
  vizSettings: VizSettings | null;
}

interface CardResult {
  cardId: string;
  data: any;
  loading: boolean;
  error: string | null;
}

export default function DashboardViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [cardResults, setCardResults] = useState<Record<string, CardResult>>(
    {}
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilter[]>([]);

  const handleFiltersChange = async (newFilters: DashboardFilter[]) => {
    setFilters(newFilters);
    // Persist filters to dashboard
    try {
      await fetch(`/api/dashboards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: JSON.stringify(newFilters) }),
      });
    } catch {
      // Non-critical
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSharing = async () => {
    if (!dashboard) return;
    setShareLoading(true);
    try {
      const response = await fetch(`/api/dashboards/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !dashboard.isPublic }),
      });
      if (!response.ok) throw new Error("Failed to update sharing");
      const data = await response.json();
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              isPublic: data.isPublic,
              publicSlug: data.publicSlug,
              embedToken: data.embedToken,
            }
          : prev
      );
      toast.success(data.isPublic ? "Dashboard is now public" : "Dashboard is now private");
    } catch (error) {
      toast.error("Failed to update sharing settings");
    } finally {
      setShareLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchQuestions();
  }, [id]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`/api/dashboards/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Dashboard not found");
          router.push("/dashboards");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await response.json();
      setDashboard(data);

      // Load saved filters
      if (data.filters) {
        try {
          setFilters(JSON.parse(data.filters));
        } catch {
          // Invalid JSON, ignore
        }
      }

      // Fetch results for all question cards
      data.cards.forEach((card: DashboardCard) => {
        if (card.cardType === "QUESTION" && card.question) {
          fetchCardResult(card.id, card.question.id);
        }
      });
    } catch (error) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch("/api/questions");
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    }
  };

  const fetchCardResult = async (cardId: string, questionId: string) => {
    setCardResults((prev) => ({
      ...prev,
      [cardId]: { cardId, data: null, loading: true, error: null },
    }));

    try {
      const response = await fetch(`/api/questions/${questionId}/run`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Query failed");
      }

      setCardResults((prev) => ({
        ...prev,
        [cardId]: { cardId, data, loading: false, error: null },
      }));
    } catch (error) {
      setCardResults((prev) => ({
        ...prev,
        [cardId]: {
          cardId,
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load",
        },
      }));
    }
  };

  const addCard = async (questionId: string) => {
    if (!dashboard) return;

    try {
      const response = await fetch(`/api/dashboards/${id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          cardType: "QUESTION",
          layoutX: 0,
          layoutY:
            Math.max(...dashboard.cards.map((c) => c.layoutY + c.layoutH), 0) ||
            0,
          layoutW: 4,
          layoutH: 3,
        }),
      });

      if (!response.ok) throw new Error("Failed to add card");

      const card = await response.json();
      setDashboard((prev) =>
        prev ? { ...prev, cards: [...prev.cards, card] } : prev
      );
      setAddDialogOpen(false);
      toast.success("Card added");

      // Fetch result for new card
      if (card.question) {
        fetchCardResult(card.id, card.question.id);
      }
    } catch (error) {
      toast.error("Failed to add card");
    }
  };

  const removeCard = async (cardId: string) => {
    if (!confirm("Remove this card?")) return;

    try {
      const response = await fetch(
        `/api/dashboards/${id}/cards?cardId=${cardId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to remove");

      setDashboard((prev) =>
        prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : prev
      );
      toast.success("Card removed");
    } catch (error) {
      toast.error("Failed to remove card");
    }
  };

  const onLayoutChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (layout: any[]) => {
      if (!dashboard || !editing) return;

      const layouts = layout.map((l) => ({
        id: l.i,
        layoutX: l.x,
        layoutY: l.y,
        layoutW: l.w,
        layoutH: l.h,
      }));

      // Update local state immediately
      setDashboard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((card) => {
            const newLayout = layouts.find((l) => l.id === card.id);
            return newLayout
              ? {
                  ...card,
                  layoutX: newLayout.layoutX,
                  layoutY: newLayout.layoutY,
                  layoutW: newLayout.layoutW,
                  layoutH: newLayout.layoutH,
                }
              : card;
          }),
        };
      });

      // Persist to server
      try {
        await fetch(`/api/dashboards/${id}/cards`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layouts }),
        });
      } catch (error) {
        console.error("Failed to save layout:", error);
      }
    },
    [dashboard, editing, id]
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const gridLayout = dashboard.cards.map((card) => ({
    i: card.id,
    x: card.layoutX,
    y: card.layoutY,
    w: card.layoutW,
    h: card.layoutH,
    minW: 2,
    minH: 2,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboards")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{dashboard.name}</h1>
              <Badge variant="outline" className="text-xs">
                {dashboard.isPublic ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" /> Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" /> Private
                  </>
                )}
              </Badge>
            </div>
            {dashboard.description && (
              <p className="text-sm text-muted-foreground">
                {dashboard.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Dashboard</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="public-toggle" className="flex flex-col gap-1">
                    <span>Public sharing</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      Anyone with the link can view this dashboard
                    </span>
                  </Label>
                  <Switch
                    id="public-toggle"
                    checked={dashboard.isPublic}
                    onCheckedChange={toggleSharing}
                    disabled={shareLoading}
                  />
                </div>

                {dashboard.isPublic && dashboard.publicSlug && (
                  <>
                    <div className="space-y-2">
                      <Label>Public URL</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted px-3 py-2 text-sm break-all">
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/public/dashboard/${dashboard.publicSlug}`
                            : ""}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/public/dashboard/${dashboard.publicSlug}`,
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

                    {dashboard.embedToken && (
                      <div className="space-y-2">
                        <Label>Embed Code</Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded bg-muted px-3 py-2 text-sm break-all">
                            {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/dashboard/${dashboard.embedToken}" width="100%" height="600" frameborder="0"></iframe>`}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() =>
                              copyToClipboard(
                                `<iframe src="${window.location.origin}/embed/dashboard/${dashboard.embedToken}" width="100%" height="600" frameborder="0"></iframe>`,
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
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Done" : "Edit"}
          </Button>
          {editing && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Question to Dashboard</DialogTitle>
                  <DialogDescription>
                    Select a saved question to add to your dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4 max-h-[400px] overflow-auto">
                  {questions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No saved questions yet. Create a question first.
                    </p>
                  ) : (
                    questions.map((question) => (
                      <button
                        key={question.id}
                        onClick={() => addCard(question.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 text-left transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{question.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {question.type === "NATIVE_SQL"
                              ? "SQL Query"
                              : "Query Builder"}
                          </p>
                        </div>
                        {(() => {
                          const chartType = question.vizSettings?.chartType || "table";
                          const Icon = CHART_ICON_MAP[chartType] || Table2;
                          return (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Icon className="h-4 w-4" />
                              <span className="text-xs capitalize">{chartType}</span>
                            </div>
                          );
                        })()}
                      </button>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Dashboard Filters */}
      {(filters.length > 0 || editing) && (
        <div className="px-6 py-2 border-b bg-background">
          <DashboardFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            editing={editing}
          />
        </div>
      )}

      {/* Dashboard Content */}
      <div className="flex-1 p-6 overflow-auto bg-muted/20">
        {dashboard.cards.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Card className="p-8 text-center max-w-md">
              <h3 className="text-lg font-semibold mb-2">Empty Dashboard</h3>
              <p className="text-muted-foreground mb-4">
                Click Edit and then Add Card to add questions to your dashboard.
              </p>
              <Button onClick={() => setEditing(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start Editing
              </Button>
            </Card>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={gridLayout}
            width={1200}
            gridConfig={{
              cols: 12,
              rowHeight: 80,
            }}
            dragConfig={{
              enabled: editing,
              handle: ".drag-handle",
            }}
            resizeConfig={{
              enabled: editing,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onLayoutChange={onLayoutChange as any}
          >
            {dashboard.cards.map((card) => {
              const result = cardResults[card.id];

              return (
                <div key={card.id} className="relative">
                  <Card className="h-full flex flex-col overflow-hidden">
                    {editing && (
                      <div className="absolute top-2 right-2 z-10 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 drag-handle cursor-move"
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeCard(card.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm truncate">
                        {card.question?.name || "Card"}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 p-2 overflow-hidden">
                      {result?.loading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : result?.error ? (
                        <div className="flex items-center justify-center h-full text-sm text-destructive">
                          {result.error}
                        </div>
                      ) : result?.data ? (
                        card.question?.vizSettings?.chartType === "table" ||
                        !card.question?.vizSettings?.chartType ? (
                          <div className="h-full overflow-auto">
                            <ResultsTable
                              columns={result.data.columns}
                              rows={result.data.rows.slice(0, 10)}
                              rowCount={Math.min(result.data.rowCount, 10)}
                              executionTimeMs={result.data.executionTimeMs}
                              truncated={false}
                              compact
                            />
                          </div>
                        ) : (
                          <QueryChart
                            columns={result.data.columns}
                            rows={result.data.rows}
                            vizSettings={
                              card.question?.vizSettings || { chartType: "bar" }
                            }
                            hideControls
                          />
                        )
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No data
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
