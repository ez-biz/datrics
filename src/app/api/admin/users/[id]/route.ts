import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "DEACTIVATED"]).optional(),
});

// GET /api/admin/users/[id] - Get user details with stats
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

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            questions: true,
            dashboards: true,
          },
        },
        databasePermissions: {
          include: {
            database: {
              select: {
                id: true,
                name: true,
                engine: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get last activity
    const lastActivity = await db.activity.findFirst({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, action: true },
    });

    // Get recent questions
    const recentQuestions = await db.question.findMany({
      where: { creatorId: id },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get recent dashboards
    const recentDashboards = await db.dashboard.findMany({
      where: { creatorId: id },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      ...user,
      questionsCount: user._count.questions,
      dashboardsCount: user._count.dashboards,
      lastActiveAt: lastActivity?.createdAt || null,
      lastAction: lastActivity?.action || null,
      recentQuestions,
      recentDashboards,
    });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const currentUser = session?.user as { id?: string; role?: string };

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-demotion if only admin
    if (validated.role && validated.role !== "ADMIN" && currentUser.id === id) {
      const adminCount = await db.user.count({
        where: { role: "ADMIN", status: "ACTIVE" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the only admin user" },
          { status: 400 }
        );
      }
    }

    // Prevent self-deactivation if only admin
    if (validated.status === "DEACTIVATED" && currentUser.id === id) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log activity for role changes
    if (validated.role && validated.role !== existingUser.role && currentUser.id) {
      await db.activity.create({
        data: {
          userId: currentUser.id,
          action: "changed_user_role",
          targetType: "user",
          targetId: user.id,
          metadata: JSON.stringify({
            userName: user.name,
            previousRole: existingUser.role,
            newRole: validated.role,
          }),
        },
      });
    }

    // Log activity for status changes
    if (validated.status && validated.status !== existingUser.status && currentUser.id) {
      const action = validated.status === "DEACTIVATED" ? "deactivated_user" : "reactivated_user";
      await db.activity.create({
        data: {
          userId: currentUser.id,
          action,
          targetType: "user",
          targetId: user.id,
          metadata: JSON.stringify({ userName: user.name }),
        },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const currentUser = session?.user as { id?: string; role?: string };

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If deleting an admin, check that there are other admins
    if (user.role === "ADMIN") {
      const adminCount = await db.user.count({
        where: { role: "ADMIN", status: "ACTIVE" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the only admin user" },
          { status: 400 }
        );
      }
    }

    // Delete user (cascade will handle related records)
    await db.user.delete({
      where: { id },
    });

    // Log activity
    if (currentUser.id) {
      await db.activity.create({
        data: {
          userId: currentUser.id,
          action: "deleted_user",
          targetType: "user",
          targetId: id,
          metadata: JSON.stringify({ userName: user.name, userEmail: user.email }),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
