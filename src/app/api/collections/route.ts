import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
});

// GET /api/collections - List all collections (tree structure)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const flat = searchParams.get("flat") === "true";

    if (flat) {
      // Return flat list of all collections (for dropdowns)
      const collections = await db.collection.findMany({
        select: {
          id: true,
          name: true,
          parentId: true,
          _count: {
            select: {
              questions: true,
              dashboards: true,
              children: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Build path for each collection
      const collectionsWithPath = await Promise.all(
        collections.map(async (col) => {
          const path = await buildCollectionPath(col.id);
          return {
            ...col,
            path,
            questionsCount: col._count.questions,
            dashboardsCount: col._count.dashboards,
            childrenCount: col._count.children,
          };
        })
      );

      return NextResponse.json(collectionsWithPath);
    }

    // Return collections at a specific level (for browsing)
    const collections = await db.collection.findMany({
      where: {
        parentId: parentId || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            questions: true,
            dashboards: true,
            children: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Also get questions and dashboards at this level
    const [questions, dashboards] = await Promise.all([
      db.question.findMany({
        where: {
          collectionId: parentId || null,
          archived: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.dashboard.findMany({
        where: {
          collectionId: parentId || null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: { id: true, name: true },
          },
          _count: {
            select: { cards: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Get breadcrumb path if viewing a specific collection
    let breadcrumbs: Array<{ id: string; name: string }> = [];
    if (parentId) {
      breadcrumbs = await buildCollectionPath(parentId);
    }

    return NextResponse.json({
      collections: collections.map((c) => ({
        ...c,
        questionsCount: c._count.questions,
        dashboardsCount: c._count.dashboards,
        childrenCount: c._count.children,
      })),
      questions,
      dashboards: dashboards.map((d) => ({
        ...d,
        cardsCount: d._count.cards,
      })),
      breadcrumbs,
      currentCollectionId: parentId,
    });
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string };

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only editors and admins can create collections
    if (user.role === "VIEWER") {
      return NextResponse.json(
        { error: "Viewers cannot create collections" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createCollectionSchema.parse(body);

    // Verify parent exists if provided
    if (validated.parentId) {
      const parent = await db.collection.findUnique({
        where: { id: validated.parentId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent collection not found" },
          { status: 404 }
        );
      }
    }

    const collection = await db.collection.create({
      data: {
        name: validated.name,
        description: validated.description,
        parentId: validated.parentId || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        createdAt: true,
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        action: "created_collection",
        targetType: "collection",
        targetId: collection.id,
        metadata: JSON.stringify({ collectionName: collection.name }),
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create collection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to build collection path (breadcrumbs)
async function buildCollectionPath(
  collectionId: string
): Promise<Array<{ id: string; name: string }>> {
  const path: Array<{ id: string; name: string }> = [];
  let currentId: string | null = collectionId;

  while (currentId) {
    const col: { id: string; name: string; parentId: string | null } | null =
      await db.collection.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });

    if (!col) break;

    path.unshift({ id: col.id, name: col.name });
    currentId = col.parentId;
  }

  return path;
}
