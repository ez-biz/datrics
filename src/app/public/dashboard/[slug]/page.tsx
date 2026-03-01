"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { ResultsTable } from "@/components/query/ResultsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface DashboardData {
  id: string;
  name: string;
  description: string | null;
  cards: Array<{
    id: string;
    layoutX: number;
    layoutY: number;
    layoutW: number;
    layoutH: number;
    question: {
      id: string;
      name: string;
      vizSettings: VizSettings | null;
    } | null;
  }>;
}

interface CardResult {
  data: any;
  loading: boolean;
  error: string | null;
}

export default function PublicDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [cardResults, setCardResults] = useState<Record<string, CardResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/dashboard/${slug}`);
        if (!res.ok) {
          setError("Dashboard not found or not publicly shared");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setDashboard(data);

        // Run all card queries via public endpoint
        try {
          const runRes = await fetch(`/api/public/dashboard/${slug}/run`, {
            method: "POST",
          });
          if (runRes.ok) {
            const results = await runRes.json();
            const mapped: Record<string, CardResult> = {};
            for (const [cardId, r] of Object.entries(results) as [string, any][]) {
              mapped[cardId] = {
                data: r.data,
                loading: false,
                error: r.error,
              };
            }
            setCardResults(mapped);
          }
        } catch {
          // Non-critical
        }
      } catch {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-lg font-semibold mb-2">Unable to load</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (!dashboard) return null;

  const sortedCards = [...dashboard.cards].sort(
    (a, b) => a.layoutY - b.layoutY || a.layoutX - b.layoutX
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-muted-foreground mt-1">{dashboard.description}</p>
          )}
        </div>

        <div
          className="grid grid-cols-12 gap-4"
          style={{ gridAutoRows: "80px" }}
        >
          {sortedCards.map((card) => {
            const result = cardResults[card.id];
            const vizSettings = card.question?.vizSettings || {
              chartType: "table" as const,
            };

            return (
              <div
                key={card.id}
                style={{
                  gridColumn: `span ${card.layoutW}`,
                  gridRow: `span ${card.layoutH}`,
                }}
              >
                <Card className="h-full flex flex-col overflow-hidden">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm truncate">
                      {card.question?.name || "Card"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 p-2 overflow-hidden">
                    {!result || result.loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : result.error ? (
                      <div className="flex items-center justify-center h-full text-sm text-destructive">
                        {result.error}
                      </div>
                    ) : result.data ? (
                      vizSettings.chartType === "table" ||
                      !vizSettings.chartType ? (
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
                          vizSettings={vizSettings}
                          hideControls
                        />
                      )
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
