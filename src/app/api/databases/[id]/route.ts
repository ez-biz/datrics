import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await Promise.resolve(params);

    const db = await prisma.databaseConnection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        engine: true,
        host: true,
        port: true,
        databaseName: true,
        username: true,
        ssl: true,
        schemaCache: true,
        lastSyncedAt: true,
        createdAt: true,
      }
    });

    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 404 });
    }

    return NextResponse.json(db);
  } catch (error) {
    console.error("Failed to fetch database details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await Promise.resolve(params);

    await prisma.databaseConnection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete database:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
