import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createDashboardSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  collectionId: z.string().optional(),
});

// GET /api/dashboards - List all dashboards
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get("collectionId");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const dashboards = await db.dashboard.findMany({
    where: {
      ...(collectionId ? { collectionId } : {}),
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      collection: {
        select: { id: true, name: true },
      },
      _count: {
        select: { cards: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip: offset,
  });

  return NextResponse.json(dashboards);
}

// POST /api/dashboards - Create a new dashboard
export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    const validated = createDashboardSchema.parse(body);

    // Verify collection exists if provided
    if (validated.collectionId) {
      const collection = await db.collection.findUnique({
        where: { id: validated.collectionId },
      });
      if (!collection) {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        );
      }
    }

    const dashboard = await db.dashboard.create({
      data: {
        name: validated.name,
        description: validated.description,
        collectionId: validated.collectionId,
        creatorId: user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        action: "created_dashboard",
        targetType: "dashboard",
        targetId: dashboard.id,
        metadata: JSON.stringify({ dashboardName: dashboard.name }),
      },
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create dashboard:", error);
    return NextResponse.json(
      { error: "Failed to create dashboard" },
      { status: 500 }
    );
  }
}
