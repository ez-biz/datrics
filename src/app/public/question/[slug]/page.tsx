"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { QueryChart, VizSettings } from "@/components/query/QueryChart";
import { ResultsTable } from "@/components/query/ResultsTable";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface QuestionData {
  name: string;
  description: string | null;
  vizSettings: VizSettings | null;
}

export default function PublicQuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch question metadata
        const metaRes = await fetch(`/api/public/question/${slug}`);
        if (!metaRes.ok) {
          setError("Question not found or not publicly shared");
          setLoading(false);
          return;
        }
        const meta = await metaRes.json();
        setQuestion(meta);

        // Run the query
        const runRes = await fetch(`/api/public/question/${slug}/run`, {
          method: "POST",
        });
        if (!runRes.ok) {
          const data = await runRes.json();
          setError(data.error || "Failed to run query");
          setLoading(false);
          return;
        }
        const data = await runRes.json();
        setResult(data);
      } catch {
        setError("Failed to load question");
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

  if (!question || !result) return null;

  const vizSettings = question.vizSettings || { chartType: "table" as const };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{question.name}</h1>
          {question.description && (
            <p className="text-muted-foreground mt-1">{question.description}</p>
          )}
        </div>

        {vizSettings.chartType === "table" || !vizSettings.chartType ? (
          <Card>
            <ResultsTable
              columns={result.columns}
              rows={result.rows}
              rowCount={result.rowCount}
              executionTimeMs={result.executionTimeMs}
              truncated={result.truncated}
            />
          </Card>
        ) : (
          <Card className="p-4">
            <QueryChart
              columns={result.columns}
              rows={result.rows}
              vizSettings={vizSettings}
              hideControls
            />
          </Card>
        )}
      </div>
    </div>
  );
}
