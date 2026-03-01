import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/questions/[id]/versions/[versionId]/restore - Restore a question to a specific version
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; versionId: string }> }
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

  const { id, versionId } = await params;

  const question = await db.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Check permission: owner or admin
  const isOwner = question.creatorId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You don't have permission to restore this question" },
      { status: 403 }
    );
  }

  const version = await db.questionVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.questionId !== id) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  try {
    // Calculate the next version number for the restore record
    const latestVersion = await db.questionVersion.findFirst({
      where: { questionId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Update the question and create a restore version record in a transaction
    const [updatedQuestion, restoreVersion] = await db.$transaction([
      db.question.update({
        where: { id },
        data: {
          queryDefinition: version.queryDefinition,
          vizSettings: version.vizSettings,
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.questionVersion.create({
        data: {
          questionId: id,
          version: nextVersion,
          queryDefinition: version.queryDefinition,
          vizSettings: version.vizSettings,
          changeNote: `Restored from version ${version.version}`,
          createdById: user.id,
        },
      }),
    ]);

    return NextResponse.json({
      question: {
        ...updatedQuestion,
        queryDefinition: JSON.parse(updatedQuestion.queryDefinition),
        vizSettings: updatedQuestion.vizSettings
          ? JSON.parse(updatedQuestion.vizSettings)
          : null,
        tags: updatedQuestion.tags ? JSON.parse(updatedQuestion.tags) : [],
      },
      restoredVersion: {
        id: restoreVersion.id,
        questionId: restoreVersion.questionId,
        version: restoreVersion.version,
        queryDefinition: JSON.parse(restoreVersion.queryDefinition),
        vizSettings: restoreVersion.vizSettings
          ? JSON.parse(restoreVersion.vizSettings)
          : null,
        changeNote: restoreVersion.changeNote,
        createdBy: { id: user.id, name: user.name, email: user.email },
        createdAt: restoreVersion.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to restore question version:", error);
    return NextResponse.json(
      { error: "Failed to restore question version" },
      { status: 500 }
    );
  }
}
