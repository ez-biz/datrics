"use client";

import { useEffect, useState, use } from "react";
import { Loader2 } from "lucide-react";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { ResultsTable } from "@/components/query/ResultsTable";

export const dynamic = "force-dynamic";

interface CardData {
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
    vizSettings: VizSettings | null;
  } | null;
  result: {
    columns: { name: string; type: string }[];
    rows: Record<string, unknown>[];
  } | null;
  error: string | null;
}

interface EmbedDashboardData {
  dashboard: {
    name: string;
    description: string | null;
  };
  cards: CardData[];
}

export default function EmbedDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<EmbedDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/embed/dashboard/${token}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to load dashboard");
        }
        const result = await response.json();
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Sort cards by layout position (top to bottom, left to right)
  const sortedCards = [...data.cards].sort((a, b) => {
    if (a.layoutY !== b.layoutY) return a.layoutY - b.layoutY;
    return a.layoutX - b.layoutX;
  });

  return (
    <div className="min-h-screen w-screen bg-white p-4">
      <div className="grid grid-cols-12 gap-4 auto-rows-[80px]">
        {sortedCards.map((card) => {
          const colSpan = Math.max(card.layoutW, 2);
          const rowSpan = Math.max(card.layoutH, 2);

          return (
            <div
              key={card.id}
              className="rounded-lg border bg-white shadow-sm overflow-hidden flex flex-col"
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
              }}
            >
              {/* Card Header */}
              {card.question && (
                <div className="px-3 py-2 border-b">
                  <h3 className="text-sm font-medium truncate">
                    {card.question.name}
                  </h3>
                </div>
              )}

              {/* Card Content */}
              <div className="flex-1 p-2 overflow-hidden">
                {card.error ? (
                  <div className="flex items-center justify-center h-full text-sm text-red-500">
                    {card.error}
                  </div>
                ) : card.result ? (
                  (() => {
                    const vizSettings = card.question?.vizSettings;
                    const isTable =
                      !vizSettings?.chartType ||
                      vizSettings.chartType === "table";

                    if (isTable) {
                      return (
                        <div className="h-full overflow-auto">
                          <ResultsTable
                            columns={card.result.columns}
                            rows={card.result.rows.slice(0, 10)}
                            rowCount={Math.min(card.result.rows.length, 10)}
                            executionTimeMs={0}
                            truncated={false}
                            compact
                          />
                        </div>
                      );
                    }

                    return (
                      <QueryChart
                        columns={card.result.columns}
                        rows={card.result.rows}
                        vizSettings={vizSettings!}
                        hideControls
                      />
                    );
                  })()
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No data
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
