import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const addCardSchema = z.object({
  questionId: z.string().optional(),
  cardType: z.enum(["QUESTION", "TEXT", "LINK"]).default("QUESTION"),
  content: z.any().optional(),
  layoutX: z.number().min(0).default(0),
  layoutY: z.number().min(0).default(0),
  layoutW: z.number().min(1).default(4),
  layoutH: z.number().min(1).default(3),
});

// POST /api/dashboards/[id]/cards - Add a card to dashboard
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id } = await params;

  const dashboard = await db.dashboard.findUnique({ where: { id } });

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  // Check permission
  const isOwner = dashboard.creatorId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = addCardSchema.parse(body);

    // Verify question exists if provided
    if (validated.questionId) {
      const question = await db.question.findUnique({
        where: { id: validated.questionId },
      });
      if (!question) {
        return NextResponse.json(
          { error: "Question not found" },
          { status: 404 }
        );
      }
    }

    const card = await db.dashboardCard.create({
      data: {
        dashboardId: id,
        questionId: validated.questionId,
        cardType: validated.cardType,
        content: validated.content ? JSON.stringify(validated.content) : null,
        layoutX: validated.layoutX,
        layoutY: validated.layoutY,
        layoutW: validated.layoutW,
        layoutH: validated.layoutH,
      },
      include: {
        question: {
          select: {
            id: true,
            name: true,
            type: true,
            vizSettings: true,
            databaseId: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...card,
      content: card.content ? JSON.parse(card.content) : null,
      question: card.question
        ? {
            ...card.question,
            vizSettings: card.question.vizSettings
              ? JSON.parse(card.question.vizSettings)
              : null,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to add card:", error);
    return NextResponse.json({ error: "Failed to add card" }, { status: 500 });
  }
}

// PUT /api/dashboards/[id]/cards - Update card layouts (batch)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id } = await params;

  const dashboard = await db.dashboard.findUnique({ where: { id } });

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const isOwner = dashboard.creatorId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const layouts = z
      .array(
        z.object({
          id: z.string(),
          layoutX: z.number(),
          layoutY: z.number(),
          layoutW: z.number(),
          layoutH: z.number(),
        })
      )
      .parse(body.layouts);

    // Update all layouts in a transaction
    await db.$transaction(
      layouts.map((layout) =>
        db.dashboardCard.update({
          where: { id: layout.id },
          data: {
            layoutX: layout.layoutX,
            layoutY: layout.layoutY,
            layoutW: layout.layoutW,
            layoutH: layout.layoutH,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update layouts:", error);
    return NextResponse.json(
      { error: "Failed to update layouts" },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboards/[id]/cards - Delete a card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return NextResponse.json({ error: "Card ID required" }, { status: 400 });
  }

  const dashboard = await db.dashboard.findUnique({ where: { id } });

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const isOwner = dashboard.creatorId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  await db.dashboardCard.delete({ where: { id: cardId } });

  return NextResponse.json({ success: true });
}
