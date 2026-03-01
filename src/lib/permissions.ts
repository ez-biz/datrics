import { db } from "@/lib/db";

export type AccessLevel = "VIEW" | "QUERY" | "ADMIN";

/**
 * Check if a user can access a specific database
 */
export async function canAccessDatabase(
  userId: string,
  databaseId: string,
  requiredLevel?: AccessLevel
): Promise<boolean> {
  // Get user role
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!user || user.status === "DEACTIVATED") {
    return false;
  }

  // ADMIN users have full access to all databases
  if (user.role === "ADMIN") {
    return true;
  }

  // Check specific database permission
  const permission = await db.databasePermission.findUnique({
    where: {
      userId_databaseId: {
        userId,
        databaseId,
      },
    },
  });

  if (!permission) {
    return false;
  }

  // If no specific level required, any permission grants access
  if (!requiredLevel) {
    return true;
  }

  // Check permission level hierarchy: ADMIN > QUERY > VIEW
  const levelHierarchy: Record<AccessLevel, number> = {
    VIEW: 1,
    QUERY: 2,
    ADMIN: 3,
  };

  const userLevel = levelHierarchy[permission.accessLevel as AccessLevel] || 0;
  const requiredLevelValue = levelHierarchy[requiredLevel];

  return userLevel >= requiredLevelValue;
}

/**
 * Get all database IDs that a user can access
 */
export async function getUserDatabaseIds(userId: string): Promise<string[]> {
  // Get user role
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!user || user.status === "DEACTIVATED") {
    return [];
  }

  // ADMIN users have access to all databases
  if (user.role === "ADMIN") {
    const databases = await db.databaseConnection.findMany({
      select: { id: true },
    });
    return databases.map((d) => d.id);
  }

  // Get specific permissions for user
  const permissions = await db.databasePermission.findMany({
    where: { userId },
    select: { databaseId: true },
  });

  return permissions.map((p) => p.databaseId);
}

/**
 * Get user's databases with their permission levels
 */
export async function getUserDatabases(userId: string): Promise<
  Array<{
    id: string;
    name: string;
    engine: string;
    accessLevel: AccessLevel | "ADMIN";
  }>
> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!user || user.status === "DEACTIVATED") {
    return [];
  }

  // ADMIN users have full access to all databases
  if (user.role === "ADMIN") {
    const databases = await db.databaseConnection.findMany({
      select: { id: true, name: true, engine: true },
      orderBy: { name: "asc" },
    });
    return databases.map((d) => ({
      ...d,
      accessLevel: "ADMIN" as const,
    }));
  }

  // Get databases with specific permissions
  const permissions = await db.databasePermission.findMany({
    where: { userId },
    include: {
      database: {
        select: { id: true, name: true, engine: true },
      },
    },
  });

  return permissions.map((p) => ({
    id: p.database.id,
    name: p.database.name,
    engine: p.database.engine,
    accessLevel: p.accessLevel as AccessLevel,
  }));
}

/**
 * Require database access - throws error if user doesn't have permission
 */
export async function requireDatabaseAccess(
  userId: string,
  databaseId: string,
  level?: AccessLevel
): Promise<void> {
  const hasAccess = await canAccessDatabase(userId, databaseId, level);

  if (!hasAccess) {
    const error = new Error("You do not have access to this database");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

/**
 * Check if user is active
 */
export async function isUserActive(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  return user?.status === "ACTIVE";
}

/**
 * Get user's role
 */
export async function getUserRole(
  userId: string
): Promise<"ADMIN" | "EDITOR" | "VIEWER" | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role as "ADMIN" | "EDITOR" | "VIEWER" | null;
}

/**
 * Check if user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "ADMIN";
}
