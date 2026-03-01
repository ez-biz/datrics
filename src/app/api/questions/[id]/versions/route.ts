import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createVersionSchema = z.object({
  changeNote: z.string().max(500).optional(),
});

// GET /api/questions/[id]/versions - List all versions for a question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const question = await db.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const versions = await db.questionVersion.findMany({
    where: { questionId: id },
    orderBy: { version: "desc" },
    include: {
      question: {
        select: { id: true, name: true },
      },
    },
  });

  // Fetch creator info for each version
  const creatorIds = [...new Set(versions.map((v) => v.createdById))];
  const creators = await db.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true, email: true },
  });
  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  return NextResponse.json(
    versions.map((v) => ({
      id: v.id,
      questionId: v.questionId,
      version: v.version,
      queryDefinition: JSON.parse(v.queryDefinition),
      vizSettings: v.vizSettings ? JSON.parse(v.vizSettings) : null,
      changeNote: v.changeNote,
      createdBy: creatorMap.get(v.createdById) ?? { id: v.createdById },
      createdAt: v.createdAt,
    }))
  );
}

// POST /api/questions/[id]/versions - Create a new version snapshot
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

  const question = await db.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const validated = createVersionSchema.parse(body);

    // Calculate the next version number
    const latestVersion = await db.questionVersion.findFirst({
      where: { questionId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    const version = await db.questionVersion.create({
      data: {
        questionId: id,
        version: nextVersion,
        queryDefinition: question.queryDefinition,
        vizSettings: question.vizSettings,
        changeNote: validated.changeNote ?? null,
        createdById: user.id,
      },
    });

    return NextResponse.json(
      {
        id: version.id,
        questionId: version.questionId,
        version: version.version,
        queryDefinition: JSON.parse(version.queryDefinition),
        vizSettings: version.vizSettings
          ? JSON.parse(version.vizSettings)
          : null,
        changeNote: version.changeNote,
        createdBy: { id: user.id, name: user.name, email: user.email },
        createdAt: version.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create question version:", error);
    return NextResponse.json(
      { error: "Failed to create question version" },
      { status: 500 }
    );
  }
}
