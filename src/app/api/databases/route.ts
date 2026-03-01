import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getUserDatabaseIds } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string };

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const adminView = searchParams.get("admin") === "true";

    // Admin view (full details) - only for admins
    if (adminView) {
      if (user.role !== "ADMIN") {
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
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(databases);
    }

    // Regular view - filter by user's database permissions
    const accessibleDatabaseIds = await getUserDatabaseIds(user.id);

    const databases = await prisma.databaseConnection.findMany({
      where: {
        id: { in: accessibleDatabaseIds },
      },
      select: {
        id: true,
        name: true,
        engine: true,
        host: true,
        port: true,
        databaseName: true,
        ssl: true,
        lastSyncedAt: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
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
