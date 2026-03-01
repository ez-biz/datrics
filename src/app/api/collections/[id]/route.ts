import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

// GET /api/collections/[id] - Get collection details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const collection = await db.collection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            questions: true,
            dashboards: true,
            children: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Build breadcrumb path
    const breadcrumbs = await buildCollectionPath(id);

    return NextResponse.json({
      ...collection,
      questionsCount: collection._count.questions,
      dashboardsCount: collection._count.dashboards,
      childrenCount: collection._count.children,
      breadcrumbs,
    });
  } catch (error) {
    console.error("Failed to fetch collection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/collections/[id] - Update collection
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string };

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "VIEWER") {
      return NextResponse.json(
        { error: "Viewers cannot edit collections" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateCollectionSchema.parse(body);

    // Check if collection exists
    const existing = await db.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Prevent circular parent reference
    if (validated.parentId) {
      if (validated.parentId === id) {
        return NextResponse.json(
          { error: "Collection cannot be its own parent" },
          { status: 400 }
        );
      }

      // Check if new parent is a descendant of this collection
      const isDescendant = await isCollectionDescendant(validated.parentId, id);
      if (isDescendant) {
        return NextResponse.json(
          { error: "Cannot move collection into its own descendant" },
          { status: 400 }
        );
      }

      // Verify parent exists
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

    const collection = await db.collection.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && {
          description: validated.description,
        }),
        ...(validated.parentId !== undefined && {
          parentId: validated.parentId,
        }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        updatedAt: true,
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        action: "updated_collection",
        targetType: "collection",
        targetId: collection.id,
        metadata: JSON.stringify({ collectionName: collection.name }),
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update collection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id] - Delete collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string };

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete collections
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete collections" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if collection exists
    const collection = await db.collection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            questions: true,
            dashboards: true,
            children: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Move all children, questions, and dashboards to parent (null = root)
    const parentId = (
      await db.collection.findUnique({
        where: { id },
        select: { parentId: true },
      })
    )?.parentId;

    await Promise.all([
      // Move child collections to parent
      db.collection.updateMany({
        where: { parentId: id },
        data: { parentId: parentId || null },
      }),
      // Move questions to parent
      db.question.updateMany({
        where: { collectionId: id },
        data: { collectionId: parentId || null },
      }),
      // Move dashboards to parent
      db.dashboard.updateMany({
        where: { collectionId: id },
        data: { collectionId: parentId || null },
      }),
    ]);

    // Delete the collection
    await db.collection.delete({
      where: { id },
    });

    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        action: "deleted_collection",
        targetType: "collection",
        targetId: id,
        metadata: JSON.stringify({ collectionName: collection.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete collection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to build collection path
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

// Helper to check if a collection is a descendant of another
async function isCollectionDescendant(
  collectionId: string,
  potentialAncestorId: string
): Promise<boolean> {
  let currentId: string | null = collectionId;

  while (currentId) {
    if (currentId === potentialAncestorId) {
      return true;
    }

    const col: { parentId: string | null } | null =
      await db.collection.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

    if (!col) break;
    currentId = col.parentId;
  }

  return false;
}
