import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updatePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      databaseId: z.string(),
      accessLevel: z.enum(["VIEW", "QUERY", "ADMIN"]).nullable(),
    })
  ),
});

// GET /api/admin/users/[id]/permissions - Get user's database permissions
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

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all databases
    const databases = await db.databaseConnection.findMany({
      select: {
        id: true,
        name: true,
        engine: true,
      },
      orderBy: { name: "asc" },
    });

    // Get user's permissions
    const permissions = await db.databasePermission.findMany({
      where: { userId: id },
      select: {
        databaseId: true,
        accessLevel: true,
      },
    });

    // Create permission map
    const permissionMap = new Map(
      permissions.map((p) => [p.databaseId, p.accessLevel])
    );

    // Combine databases with permissions
    const databasePermissions = databases.map((database) => ({
      database,
      accessLevel: permissionMap.get(database.id) || null,
    }));

    return NextResponse.json({
      userRole: user.role,
      permissions: databasePermissions,
    });
  } catch (error) {
    console.error("Failed to fetch user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id]/permissions - Update user's database permissions (bulk update)
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
    const validated = updatePermissionsSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current permissions for logging
    const currentPermissions = await db.databasePermission.findMany({
      where: { userId: id },
      include: {
        database: {
          select: { name: true },
        },
      },
    });

    const currentPermMap = new Map(
      currentPermissions.map((p) => [p.databaseId, p])
    );

    // Process each permission change
    const changes: Array<{ databaseName: string; action: string; accessLevel?: string }> = [];

    for (const perm of validated.permissions) {
      const currentPerm = currentPermMap.get(perm.databaseId);
      const database = await db.databaseConnection.findUnique({
        where: { id: perm.databaseId },
        select: { name: true },
      });

      if (!database) continue;

      if (perm.accessLevel === null) {
        // Remove permission
        if (currentPerm) {
          await db.databasePermission.delete({
            where: {
              userId_databaseId: {
                userId: id,
                databaseId: perm.databaseId,
              },
            },
          });
          changes.push({
            databaseName: database.name,
            action: "revoked",
          });
        }
      } else if (currentPerm) {
        // Update existing permission
        if (currentPerm.accessLevel !== perm.accessLevel) {
          await db.databasePermission.update({
            where: {
              userId_databaseId: {
                userId: id,
                databaseId: perm.databaseId,
              },
            },
            data: { accessLevel: perm.accessLevel },
          });
          changes.push({
            databaseName: database.name,
            action: "updated",
            accessLevel: perm.accessLevel,
          });
        }
      } else {
        // Create new permission
        await db.databasePermission.create({
          data: {
            userId: id,
            databaseId: perm.databaseId,
            accessLevel: perm.accessLevel,
          },
        });
        changes.push({
          databaseName: database.name,
          action: "granted",
          accessLevel: perm.accessLevel,
        });
      }
    }

    // Log activity for permission changes
    if (changes.length > 0 && currentUser.id) {
      const grants = changes.filter((c) => c.action === "granted");
      const revokes = changes.filter((c) => c.action === "revoked");

      if (grants.length > 0) {
        await db.activity.create({
          data: {
            userId: currentUser.id,
            action: "granted_database_access",
            targetType: "user",
            targetId: id,
            metadata: JSON.stringify({
              userName: user.name,
              databases: grants.map((g) => ({
                name: g.databaseName,
                accessLevel: g.accessLevel,
              })),
            }),
          },
        });
      }

      if (revokes.length > 0) {
        await db.activity.create({
          data: {
            userId: currentUser.id,
            action: "revoked_database_access",
            targetType: "user",
            targetId: id,
            metadata: JSON.stringify({
              userName: user.name,
              databases: revokes.map((r) => r.databaseName),
            }),
          },
        });
      }
    }

    // Return updated permissions
    const updatedPermissions = await db.databasePermission.findMany({
      where: { userId: id },
      include: {
        database: {
          select: {
            id: true,
            name: true,
            engine: true,
          },
        },
      },
    });

    return NextResponse.json({
      permissions: updatedPermissions,
      changes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
