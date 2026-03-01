import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getUserDatabaseIds, canAccessDatabase } from "@/lib/permissions";

const createQuestionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  type: z.enum(["QUERY_BUILDER", "NATIVE_SQL"]),
  queryDefinition: z.any(), // AQR object or SQL string
  vizSettings: z
    .object({
      chartType: z.enum([
        "table",
        "bar",
        "line",
        "area",
        "pie",
        "scatter",
        "number",
      ]),
      xAxis: z.string().optional(),
      yAxis: z.string().optional(),
      groupBy: z.string().optional(),
      colors: z.array(z.string()).optional(),
    })
    .optional(),
  databaseId: z.string().min(1),
  collectionId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/questions - List all questions for the current user
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
  const archived = searchParams.get("archived") === "true";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Get accessible database IDs for the user
  const accessibleDatabaseIds = await getUserDatabaseIds(user.id);

  const questions = await db.question.findMany({
    where: {
      archived,
      databaseId: { in: accessibleDatabaseIds },
      ...(collectionId ? { collectionId } : {}),
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      collection: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip: offset,
  });

  // Parse JSON fields for response
  const formattedQuestions = questions.map((q: typeof questions[number]) => ({
    ...q,
    queryDefinition: JSON.parse(q.queryDefinition),
    vizSettings: q.vizSettings ? JSON.parse(q.vizSettings) : null,
    tags: q.tags ? JSON.parse(q.tags) : [],
  }));

  return NextResponse.json(formattedQuestions);
}

// POST /api/questions - Create a new question
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
    const validated = createQuestionSchema.parse(body);

    // Verify database exists
    const database = await db.databaseConnection.findUnique({
      where: { id: validated.databaseId },
    });

    if (!database) {
      return NextResponse.json(
        { error: "Database not found" },
        { status: 404 }
      );
    }

    // Check if user has QUERY access to this database
    const hasAccess = await canAccessDatabase(user.id, validated.databaseId, "QUERY");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to create questions for this database" },
        { status: 403 }
      );
    }

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

    const question = await db.question.create({
      data: {
        name: validated.name,
        description: validated.description,
        type: validated.type,
        queryDefinition: JSON.stringify(validated.queryDefinition),
        vizSettings: validated.vizSettings
          ? JSON.stringify(validated.vizSettings)
          : null,
        databaseId: validated.databaseId,
        collectionId: validated.collectionId,
        creatorId: user.id,
        tags: validated.tags ? JSON.stringify(validated.tags) : null,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        action: "created_question",
        targetType: "question",
        targetId: question.id,
        metadata: JSON.stringify({ questionName: question.name }),
      },
    });

    return NextResponse.json({
      ...question,
      queryDefinition: JSON.parse(question.queryDefinition),
      vizSettings: question.vizSettings
        ? JSON.parse(question.vizSettings)
        : null,
      tags: question.tags ? JSON.parse(question.tags) : [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
