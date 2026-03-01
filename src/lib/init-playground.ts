import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { introspectSchema } from "@/lib/query-engine/schema-builder";
import path from "path";
import fs from "fs";

const PLAYGROUND_NAME = "Sample Database (Playground)";

/**
 * Auto-registers the bundled playground SQLite database if:
 * 1. The playground.db file exists on disk
 * 2. No playground DatabaseConnection record exists yet
 *
 * Safe to call multiple times (idempotent).
 */
export async function initPlaygroundDatabase(): Promise<void> {
  try {
    // Check if already registered
    const existing = await prisma.databaseConnection.findFirst({
      where: { name: PLAYGROUND_NAME },
      select: { id: true },
    });
    if (existing) return;

    // Check if the file exists
    const dbPath = path.resolve(process.cwd(), "prisma/playground.db");
    if (!fs.existsSync(dbPath)) return;

    // Create the DatabaseConnection record
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

    console.log("Playground database auto-registered successfully");
  } catch (error) {
    // Non-critical — don't break the home page if this fails
    console.error("Failed to auto-register playground database:", error);
  }
}
