import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initPlaygroundDatabase } from "@/lib/init-playground";
import fs from "fs";
import path from "path";

const PLAYGROUND_NAME = "Sample Database (Playground)";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if playground.db file exists
    const dbPath = path.resolve(process.cwd(), "prisma/playground.db");
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { error: "Playground database file not found. Run: npm run db:playground" },
        { status: 500 }
      );
    }

    // Initialize (idempotent)
    await initPlaygroundDatabase();

    // Return the record
    const db = await prisma.databaseConnection.findFirst({
      where: { name: PLAYGROUND_NAME },
      select: { id: true, name: true, engine: true },
    });

    if (!db) {
      return NextResponse.json(
        { error: "Failed to create playground database" },
        { status: 500 }
      );
    }

    return NextResponse.json(db);
  } catch (error: unknown) {
    console.error("Failed to create playground database:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
