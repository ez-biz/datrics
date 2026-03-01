import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeAQR, executeRawSQL } from "@/lib/query-engine/query-executor";

// POST - Run all questions in a public dashboard (no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const dashboard = await prisma.dashboard.findFirst({
    where: { publicSlug: slug, isPublic: true },
    select: {
      id: true,
      cards: {
        select: {
          id: true,
          questionId: true,
          question: {
            select: {
              id: true,
              type: true,
              queryDefinition: true,
              databaseId: true,
            },
          },
        },
      },
    },
  });

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const results: Record<string, any> = {};

  await Promise.all(
    dashboard.cards.map(async (card) => {
      if (!card.question) return;
      try {
        let result;
        if (card.question.type === "NATIVE_SQL") {
          const queryDef = JSON.parse(card.question.queryDefinition);
          const sql = typeof queryDef === "string" ? queryDef : queryDef.sql;
          result = await executeRawSQL(card.question.databaseId, sql);
        } else {
          const query = JSON.parse(card.question.queryDefinition);
          result = await executeAQR(card.question.databaseId, query);
        }
        results[card.id] = { data: result, error: null };
      } catch (error: unknown) {
        results[card.id] = {
          data: null,
          error: error instanceof Error ? error.message : "Query failed",
        };
      }
    })
  );

  return NextResponse.json(results);
}
