import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - Public access to a shared dashboard (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const dashboard = await prisma.dashboard.findFirst({
    where: { publicSlug: slug, isPublic: true },
    select: {
      id: true,
      name: true,
      description: true,
      filters: true,
      creatorId: true,
      creator: { select: { name: true } },
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

  return NextResponse.json({
    ...dashboard,
    filters: dashboard.filters ? JSON.parse(dashboard.filters) : null,
    cards: dashboard.cards.map((card) => ({
      ...card,
      content: card.content ? JSON.parse(card.content) : null,
      question: card.question
        ? {
            ...card.question,
            queryDefinition: JSON.parse(card.question.queryDefinition),
            vizSettings: card.question.vizSettings
              ? JSON.parse(card.question.vizSettings)
              : null,
          }
        : null,
    })),
  });
}
