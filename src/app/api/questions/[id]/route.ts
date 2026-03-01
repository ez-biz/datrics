import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateQuestionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  queryDefinition: z.any().optional(),
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
  collectionId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
  verified: z.boolean().optional(),
});

// GET /api/questions/[id] - Get a single question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const question = await db.question.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      collection: {
        select: { id: true, name: true },
      },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Log view activity
  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (user) {
    await db.activity.create({
      data: {
        userId: user.id,
        action: "viewed_question",
        targetType: "question",
        targetId: question.id,
      },
    });
  }

  return NextResponse.json({
    ...question,
    queryDefinition: JSON.parse(question.queryDefinition),
    vizSettings: question.vizSettings ? JSON.parse(question.vizSettings) : null,
    tags: question.tags ? JSON.parse(question.tags) : [],
  });
}

// PUT /api/questions/[id] - Update a question
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

  const question = await db.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Check permission: owner or admin
  const isOwner = question.creatorId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You don't have permission to edit this question" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = updateQuestionSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.queryDefinition !== undefined)
      updateData.queryDefinition = JSON.stringify(validated.queryDefinition);
    if (validated.vizSettings !== undefined)
      updateData.vizSettings = JSON.stringify(validated.vizSettings);
    if (validated.collectionId !== undefined)
      updateData.collectionId = validated.collectionId;
    if (validated.tags !== undefined)
      updateData.tags = JSON.stringify(validated.tags);
    if (validated.archived !== undefined)
      updateData.archived = validated.archived;
    if (validated.verified !== undefined && isAdmin)
      updateData.verified = validated.verified;

    const updated = await db.question.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      ...updated,
      queryDefinition: JSON.parse(updated.queryDefinition),
      vizSettings: updated.vizSettings ? JSON.parse(updated.vizSettings) : null,
      tags: updated.tags ? JSON.parse(updated.tags) : [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

// DELETE /api/questions/[id] - Delete a question
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

  const question = await db.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Check permission: owner or admin
  const isOwner = question.creatorId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You don't have permission to delete this question" },
      { status: 403 }
    );
  }

  await db.question.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
