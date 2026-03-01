import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { introspectSchema } from "@/lib/query-engine/schema-builder";
import path from "path";
import fs from "fs";

const PLAYGROUND_NAME = "Sample Database (Playground)";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Idempotency: return existing playground if already created
    const existing = await prisma.databaseConnection.findFirst({
      where: { name: PLAYGROUND_NAME },
      select: { id: true, name: true, engine: true },
    });
    if (existing) {
      return NextResponse.json(existing);
    }

    // Resolve the playground.db path
    const dbPath = path.resolve(process.cwd(), "prisma/playground.db");
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { error: "Playground database file not found. Run: npm run db:playground" },
        { status: 500 }
      );
    }

    // Create DatabaseConnection record
    const db = await prisma.databaseConnection.create({
      data: {
        name: PLAYGROUND_NAME,
        engine: "SQLITE",
        host: "localhost",
        port: 0,
        databaseName: dbPath,
        username: "playground",
        passwordEnc: encrypt("playground"),
        ssl: false,
      },
    });

    // Run schema introspection and cache it
    const schemaGraph = await introspectSchema({
      engine: "SQLITE",
      host: "localhost",
      port: 0,
      databaseName: dbPath,
      password: "playground",
    });

    await prisma.databaseConnection.update({
      where: { id: db.id },
      data: {
        schemaCache: JSON.stringify(schemaGraph),
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({ id: db.id, name: db.name, engine: db.engine });
  } catch (error: unknown) {
    console.error("Failed to create playground database:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
