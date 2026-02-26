import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { testConnection } from "@/lib/query-engine/connection";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();
    let configToTest = null;

    if (data.id) {
      // Test an existing connection from DB
      const db = await prisma.databaseConnection.findUnique({
        where: { id: data.id },
      });

      if (!db) {
        return NextResponse.json({ error: "Database not found" }, { status: 404 });
      }

      configToTest = {
        engine: db.engine,
        host: db.host,
        port: db.port,
        databaseName: db.databaseName,
        username: db.username,
        password: decrypt(db.passwordEnc),
        ssl: db.ssl,
      };
    } else {
      // Test a new connection before saving
      const { engine, host, port, databaseName, username, password, ssl } = data;
      
      if (
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

      configToTest = {
        engine,
        host,
        port: parseInt(port, 10),
        databaseName,
        username,
        password,
        ssl: Boolean(ssl),
      };
    }

    try {
      const isConnected = await testConnection(configToTest);
      return NextResponse.json({ success: isConnected });
    } catch (dbError: any) {
      // Return 400 with the DB error message so the client can show what failed
      return NextResponse.json(
        { error: dbError?.message || "Connection failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Failed to test connection:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
