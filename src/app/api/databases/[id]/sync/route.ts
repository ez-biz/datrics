import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { introspectSchema } from "@/lib/query-engine/schema-builder";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Await params as required by Next.js 15+ (in Next.js 14, it's ok too, but good practice to treat as promise or dynamic)
    const { id } = await Promise.resolve(params);

    const db = await prisma.databaseConnection.findUnique({
      where: { id },
    });

    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 404 });
    }

    const config = {
      engine: db.engine,
      host: db.host,
      port: db.port,
      databaseName: db.databaseName,
      username: db.username,
      password: decrypt(db.passwordEnc),
      ssl: db.ssl,
    };

    // Introspect the database layout (tables/columns)
    const schemaGraph = await introspectSchema(config);

    // Save it to the database record as a JSON string
    const updatedDb = await prisma.databaseConnection.update({
      where: { id },
      data: {
        schemaCache: JSON.stringify(schemaGraph),
        lastSyncedAt: new Date(),
      },
      select: {
        id: true,
        lastSyncedAt: true,
      }
    });

    return NextResponse.json({ success: true, lastSyncedAt: updatedDb.lastSyncedAt });
  } catch (error: any) {
    console.error("Failed to sync schema:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
