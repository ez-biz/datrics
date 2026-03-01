import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeAQR, executeRawSQL } from "@/lib/query-engine/query-executor";

// POST - Run a public shared question (no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const question = await prisma.question.findFirst({
    where: { publicSlug: slug, isPublic: true },
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
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    );
  }
}
