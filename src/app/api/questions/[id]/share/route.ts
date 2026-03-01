import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

// POST - Toggle sharing / generate public link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const isPublic = Boolean(body.isPublic);

  const updateData: Record<string, unknown> = { isPublic };
  if (isPublic && !question.publicSlug) {
    updateData.publicSlug = crypto.randomBytes(12).toString("hex");
  }
  if (isPublic && !question.embedToken) {
    updateData.embedToken = crypto.randomBytes(16).toString("hex");
  }
  if (!isPublic) {
    updateData.publicSlug = null;
    updateData.embedToken = null;
  }

  const updated = await prisma.question.update({
    where: { id },
    data: updateData,
    select: { id: true, isPublic: true, publicSlug: true, embedToken: true },
  });

  return NextResponse.json(updated);
}
