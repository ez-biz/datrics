import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - Public access to a shared question (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const question = await prisma.question.findFirst({
    where: { publicSlug: slug, isPublic: true },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      queryDefinition: true,
      vizSettings: true,
      databaseId: true,
      creator: { select: { name: true } },
    },
  });
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ...question,
    queryDefinition: JSON.parse(question.queryDefinition),
    vizSettings: question.vizSettings
      ? JSON.parse(question.vizSettings)
      : null,
  });
}
