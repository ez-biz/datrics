import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/questions/recent - Get recently viewed/created questions
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
  const limit = parseInt(searchParams.get("limit") || "6");

  // Get recently viewed questions from activity
  const recentActivities = await db.activity.findMany({
    where: {
      userId: user.id,
      targetType: "question",
      action: { in: ["viewed_question", "ran_question", "created_question"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 2, // Get more to dedupe
    distinct: ["targetId"],
  });

  const questionIds = recentActivities
    .map((a: { targetId: string | null }) => a.targetId)
    .filter((id: string | null): id is string => id !== null);

  if (questionIds.length === 0) {
    // Fallback to recently created questions
    const questions = await db.question.findMany({
      where: { archived: false },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(
      questions.map((q: typeof questions[number]) => ({
        ...q,
        queryDefinition: JSON.parse(q.queryDefinition),
        vizSettings: q.vizSettings ? JSON.parse(q.vizSettings) : null,
        tags: q.tags ? JSON.parse(q.tags) : [],
      }))
    );
  }

  const questions = await db.question.findMany({
    where: {
      id: { in: questionIds },
      archived: false,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  // Maintain activity order
  const orderedQuestions = questionIds
    .map((id: string) => questions.find((q: typeof questions[number]) => q.id === id))
    .filter((q: typeof questions[number] | undefined): q is typeof questions[number] => q !== undefined)
    .slice(0, limit);

  return NextResponse.json(
    orderedQuestions.map((q: typeof questions[number]) => ({
      ...q,
      queryDefinition: JSON.parse(q.queryDefinition),
      vizSettings: q.vizSettings ? JSON.parse(q.vizSettings) : null,
      tags: q.tags ? JSON.parse(q.tags) : [],
    }))
  );
}
