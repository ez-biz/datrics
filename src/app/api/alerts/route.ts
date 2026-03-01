import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createAlertSchema = z.object({
  name: z.string().min(1).max(255),
  questionId: z.string().min(1),
  valueSource: z.string().min(1),
  operator: z.enum(["gt", "gte", "lt", "lte", "eq", "neq"]),
  threshold: z.number(),
  notifyInApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySlack: z.boolean().optional(),
});

// GET /api/alerts - List current user's alerts
export async function GET() {
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

  const alerts = await db.alert.findMany({
    where: { creatorId: user.id },
    include: {
      question: { select: { id: true, name: true, databaseId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alerts);
}

// POST /api/alerts - Create a new alert
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
    const validated = createAlertSchema.parse(body);

    // Verify question exists
    const question = await db.question.findUnique({
      where: { id: validated.questionId },
    });
    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const alert = await db.alert.create({
      data: {
        name: validated.name,
        questionId: validated.questionId,
        creatorId: user.id,
        valueSource: validated.valueSource,
        operator: validated.operator,
        threshold: validated.threshold,
        notifyInApp: validated.notifyInApp ?? true,
        notifyEmail: validated.notifyEmail ?? false,
        notifySlack: validated.notifySlack ?? false,
      },
      include: {
        question: { select: { id: true, name: true, databaseId: true } },
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
