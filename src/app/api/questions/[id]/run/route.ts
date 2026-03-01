import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeAQR, executeRawSQL } from "@/lib/query-engine/query-executor";

// POST /api/questions/[id]/run - Execute a saved question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id } = await params;

  const question = await db.question.findUnique({
    where: { id },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Get database connection
  const database = await db.databaseConnection.findUnique({
    where: { id: question.databaseId },
  });

  if (!database) {
    return NextResponse.json(
      { error: "Database connection not found" },
      { status: 404 }
    );
  }

  try {
    const queryDefinition = JSON.parse(question.queryDefinition);

    // Log the query execution
    await db.activity.create({
      data: {
        userId: user.id,
        action: "ran_question",
        targetType: "question",
        targetId: question.id,
        metadata: JSON.stringify({ questionName: question.name }),
      },
    });

    // Execute based on question type
    if (question.type === "NATIVE_SQL") {
      const result = await executeRawSQL(database.id, queryDefinition.sql);
      return NextResponse.json(result);
    } else {
      // QUERY_BUILDER - execute AQR
      const result = await executeAQR(database.id, queryDefinition);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Query execution failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Query execution failed",
      },
      { status: 500 }
    );
  }
}
