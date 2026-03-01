"use client";

import { useEffect, useState, use } from "react";
import { Loader2 } from "lucide-react";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { ResultsTable } from "@/components/query/ResultsTable";

export const dynamic = "force-dynamic";

interface EmbedData {
  question: {
    name: string;
    vizSettings: VizSettings | null;
  };
  columns: { name: string; type: string }[];
  rows: Record<string, unknown>[];
}

export default function EmbedQuestionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<EmbedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/embed/question/${token}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to load question");
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

  const vizSettings = data.question.vizSettings;
  const isTable =
    !vizSettings?.chartType || vizSettings.chartType === "table";

  return (
    <div className="h-screen w-screen bg-white p-0 overflow-auto">
      {isTable ? (
        <ResultsTable
          columns={data.columns}
          rows={data.rows}
          rowCount={data.rows.length}
          executionTimeMs={0}
          truncated={false}
          compact
        />
      ) : (
        <div className="h-full w-full p-4">
          <QueryChart
            columns={data.columns}
            rows={data.rows}
            vizSettings={vizSettings!}
            hideControls
          />
        </div>
      )}
    </div>
  );
}
