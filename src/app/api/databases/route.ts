import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    // Only ADMIN should see database connections
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const databases = await prisma.databaseConnection.findMany({
      select: {
        id: true,
        name: true,
        engine: true,
        host: true,
        port: true,
        databaseName: true,
        username: true,
        ssl: true,
        lastSyncedAt: true,
        createdAt: true,
        // specifically excluding passwordEnc and schemaCache from the list view for security/performance
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(databases);
  } catch (error) {
    console.error("Failed to fetch databases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();
    const { name, engine, host, port, databaseName, username, password, ssl } = data;

    if (
      !name ||
      !engine ||
      !host ||
      port === undefined ||
      !databaseName ||
      !username ||
      !password
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Encrypt the password before storing
    const passwordEnc = encrypt(password);

    const db = await prisma.databaseConnection.create({
      data: {
        name,
        engine,
        host,
        port: parseInt(port, 10),
        databaseName,
        username,
        passwordEnc,
        ssl: Boolean(ssl),
      },
      select: {
        id: true,
        name: true,
        engine: true,
        host: true,
        port: true,
        databaseName: true,
        username: true,
        ssl: true,
        createdAt: true,
      },
    });

    return NextResponse.json(db, { status: 201 });
  } catch (error) {
    console.error("Failed to create database:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
