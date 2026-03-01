import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/users/[id]/activity - Get user's activity history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [activities, total] = await Promise.all([
      db.activity.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.activity.count({ where: { userId: id } }),
    ]);

    // Enrich activities with target info
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
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
        } else if (activity.targetType === "user" && activity.targetId) {
          const targetUser = await db.user.findUnique({
            where: { id: activity.targetId },
            select: { id: true, name: true, email: true },
          });
          target = targetUser;
        }

        return {
          ...activity,
          metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
          target,
        };
      })
    );

    return NextResponse.json({
      activities: enrichedActivities,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch user activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
