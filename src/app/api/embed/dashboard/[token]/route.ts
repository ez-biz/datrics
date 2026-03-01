import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeAQR, executeRawSQL } from "@/lib/query-engine/query-executor";

// GET - Fetch an embedded dashboard with card results (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const dashboard = await prisma.dashboard.findFirst({
    where: { embedToken: token, isPublic: true },
    select: {
      id: true,
      name: true,
      description: true,
      cards: {
        select: {
          id: true,
          cardType: true,
          content: true,
          layoutX: true,
          layoutY: true,
          layoutW: true,
          layoutH: true,
          questionId: true,
          question: {
            select: {
              id: true,
              name: true,
              type: true,
              queryDefinition: true,
              vizSettings: true,
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

  // Run queries for all question cards in parallel
  const cardsWithResults = await Promise.all(
    dashboard.cards.map(async (card) => {
      const base = {
        id: card.id,
        cardType: card.cardType,
        content: card.content ? JSON.parse(card.content) : null,
        layoutX: card.layoutX,
        layoutY: card.layoutY,
        layoutW: card.layoutW,
        layoutH: card.layoutH,
        question: card.question
          ? {
              id: card.question.id,
              name: card.question.name,
              vizSettings: card.question.vizSettings
                ? JSON.parse(card.question.vizSettings)
                : null,
            }
          : null,
        result: null as { columns: unknown[]; rows: unknown[] } | null,
        error: null as string | null,
      };

      if (card.cardType !== "QUESTION" || !card.question) {
        return base;
      }

      try {
        let result;
        if (card.question.type === "NATIVE_SQL") {
          const queryDef = JSON.parse(card.question.queryDefinition);
          const sql =
            typeof queryDef === "string" ? queryDef : queryDef.sql;
          result = await executeRawSQL(card.question.databaseId, sql);
        } else {
          const query = JSON.parse(card.question.queryDefinition);
          result = await executeAQR(card.question.databaseId, query);
        }
        return { ...base, result: { columns: result.columns, rows: result.rows } };
      } catch (error: unknown) {
        return {
          ...base,
          error: error instanceof Error ? error.message : "Query failed",
        };
      }
    })
  );

  return NextResponse.json({
    dashboard: {
      name: dashboard.name,
      description: dashboard.description,
    },
    cards: cardsWithResults,
  });
}
