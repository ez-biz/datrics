import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeAQR, executeRawSQL } from "@/lib/query-engine/query-executor";

// GET - Fetch and run an embedded question (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const question = await prisma.question.findFirst({
    where: { embedToken: token, isPublic: true },
    select: {
      id: true,
      name: true,
      type: true,
      queryDefinition: true,
      vizSettings: true,
      databaseId: true,
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    let result;
    if (question.type === "NATIVE_SQL") {
      const queryDef = JSON.parse(question.queryDefinition);
      const sql = typeof queryDef === "string" ? queryDef : queryDef.sql;
      result = await executeRawSQL(question.databaseId, sql);
    } else {
      const query = JSON.parse(question.queryDefinition);
      result = await executeAQR(question.databaseId, query);
    }

    return NextResponse.json({
      question: {
        name: question.name,
        vizSettings: question.vizSettings
          ? JSON.parse(question.vizSettings)
          : null,
      },
      columns: result.columns,
      rows: result.rows,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    );
  }
}
