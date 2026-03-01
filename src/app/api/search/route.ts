import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserDatabaseIds } from "@/lib/permissions";

interface SearchResult {
  id: string;
  type: "question" | "dashboard" | "table" | "database";
  name: string;
  description?: string | null;
  metadata?: Record<string, string>;
}

// GET /api/search - Search across questions, dashboards, and tables
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; email?: string };

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const type = searchParams.get("type"); // Optional filter: question, dashboard, table
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    const results: SearchResult[] = [];

    // Get accessible database IDs for the user
    const accessibleDatabaseIds = await getUserDatabaseIds(dbUser.id);

    // Search questions (if no type filter or type is 'question')
    if (!type || type === "question") {
      const questions = await db.question.findMany({
        where: {
          archived: false,
          databaseId: { in: accessibleDatabaseIds },
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          creator: {
            select: { name: true },
          },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });

      results.push(
        ...questions.map((q) => ({
          id: q.id,
          type: "question" as const,
          name: q.name,
          description: q.description,
          metadata: {
            queryType: q.type,
            creator: q.creator?.name || "Unknown",
          },
        }))
      );
    }

    // Search dashboards (if no type filter or type is 'dashboard')
    if (!type || type === "dashboard") {
      const dashboards = await db.dashboard.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          creator: {
            select: { name: true },
          },
          _count: {
            select: { cards: true },
          },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });

      results.push(
        ...dashboards.map((d) => ({
          id: d.id,
          type: "dashboard" as const,
          name: d.name,
          description: d.description,
          metadata: {
            creator: d.creator?.name || "Unknown",
            cards: `${d._count.cards} cards`,
          },
        }))
      );
    }

    // Search databases (if no type filter or type is 'database')
    if (!type || type === "database") {
      const databases = await db.databaseConnection.findMany({
        where: {
          id: { in: accessibleDatabaseIds },
          OR: [
            { name: { contains: query } },
            { databaseName: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          engine: true,
          databaseName: true,
        },
        take: limit,
      });

      results.push(
        ...databases.map((d) => ({
          id: d.id,
          type: "database" as const,
          name: d.name,
          description: d.databaseName,
          metadata: {
            engine: d.engine,
          },
        }))
      );
    }

    // Search tables from schema cache (if no type filter or type is 'table')
    if (!type || type === "table") {
      const databases = await db.databaseConnection.findMany({
        where: {
          id: { in: accessibleDatabaseIds },
          schemaCache: { not: null },
        },
        select: {
          id: true,
          name: true,
          schemaCache: true,
        },
      });

      for (const database of databases) {
        if (!database.schemaCache) continue;

        try {
          const schema = JSON.parse(database.schemaCache);
          const tables = schema.tables || [];

          for (const table of tables) {
            const tableName = (table.name || "").toLowerCase();
            if (tableName.includes(query)) {
              results.push({
                id: `${database.id}:${table.name}`,
                type: "table" as const,
                name: table.name,
                description: `${table.columns?.length || 0} columns`,
                metadata: {
                  database: database.name,
                  columns: table.columns?.length?.toString() || "0",
                },
              });
            }
          }
        } catch {
          // Skip invalid schema cache
        }
      }
    }

    // Sort results: exact matches first, then by type priority
    const typePriority = { question: 0, dashboard: 1, database: 2, table: 3 };
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === query ? 0 : 1;
      const bExact = b.name.toLowerCase() === query ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return typePriority[a.type] - typePriority[b.type];
    });

    return NextResponse.json({
      results: results.slice(0, limit),
      query,
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
