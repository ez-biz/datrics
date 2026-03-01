import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { nanoid } from "nanoid";

const updateDashboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  collectionId: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  filters: z.any().optional(),
});

// GET /api/dashboards/[id] - Get a single dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const dashboard = await db.dashboard.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      collection: {
        select: { id: true, name: true },
      },
      cards: {
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
        orderBy: [{ layoutY: "asc" }, { layoutX: "asc" }],
      },
    },
  });

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  // Log view activity
  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (user) {
    await db.activity.create({
      data: {
        userId: user.id,
        action: "viewed_dashboard",
        targetType: "dashboard",
        targetId: dashboard.id,
      },
    });
  }

  return NextResponse.json({
    ...dashboard,
    filters: dashboard.filters ? JSON.parse(dashboard.filters) : null,
    cards: dashboard.cards.map((card: typeof dashboard.cards[number]) => ({
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
    })),
  });
}

// PUT /api/dashboards/[id] - Update a dashboard
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

  // Check permission: owner or admin
  const isOwner = dashboard.creatorId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You don't have permission to edit this dashboard" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = updateDashboardSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.collectionId !== undefined)
      updateData.collectionId = validated.collectionId;
    if (validated.filters !== undefined)
      updateData.filters = JSON.stringify(validated.filters);

    // Handle public sharing
    if (validated.isPublic !== undefined) {
      updateData.isPublic = validated.isPublic;
      if (validated.isPublic && !dashboard.publicSlug) {
        updateData.publicSlug = nanoid(10);
      }
    }

    const updated = await db.dashboard.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update dashboard:", error);
    return NextResponse.json(
      { error: "Failed to update dashboard" },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboards/[id] - Delete a dashboard
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

  const dashboard = await db.dashboard.findUnique({ where: { id } });

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  // Check permission: owner or admin
  const isOwner = dashboard.creatorId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You don't have permission to delete this dashboard" },
      { status: 403 }
    );
  }

  await db.dashboard.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
