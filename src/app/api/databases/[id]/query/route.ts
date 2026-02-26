import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeAQR, executeRawSQL } from "@/lib/query-engine/query-executor";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: databaseId } = await params;
    const body = await request.json();

    if (!body.type) {
      return NextResponse.json(
        { error: "Missing 'type' field. Use 'aqr' or 'native'." },
        { status: 400 }
      );
    }

    let result;

    if (body.type === "native") {
      if (!body.sql || typeof body.sql !== "string") {
        return NextResponse.json(
          { error: "Missing or invalid 'sql' field" },
          { status: 400 }
        );
      }
      result = await executeRawSQL(databaseId, body.sql);
    } else if (body.type === "aqr") {
      if (!body.query || !body.query.sourceTable) {
        return NextResponse.json(
          { error: "Missing or invalid 'query' field" },
          { status: 400 }
        );
      }
      result = await executeAQR(databaseId, body.query);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'aqr' or 'native'." },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Query execution failed:", error);
    const message =
      error instanceof Error ? error.message : "Query execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
