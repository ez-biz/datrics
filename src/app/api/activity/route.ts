import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/activity - Get recent activity for the current user
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
  const limit = parseInt(searchParams.get("limit") || "20");
  const action = searchParams.get("action"); // Filter by action type

  const activities = await db.activity.findMany({
    where: {
      userId: user.id,
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Enrich activities with target info
  const enrichedActivities = await Promise.all(
    activities.map(async (activity: { id: string; userId: string; action: string; targetType: string | null; targetId: string | null; metadata: string | null; createdAt: Date }) => {
      let target = null;

      if (activity.targetType === "question" && activity.targetId) {
        const question = await db.question.findUnique({
          where: { id: activity.targetId },
          select: { id: true, name: true },
        });
        target = question;
      } else if (activity.targetType === "dashboard" && activity.targetId) {
        const dashboard = await db.dashboard.findUnique({
          where: { id: activity.targetId },
          select: { id: true, name: true },
        });
        target = dashboard;
      }

      return {
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        target,
      };
    })
  );

  return NextResponse.json(enrichedActivities);
}
