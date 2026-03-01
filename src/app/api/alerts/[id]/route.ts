import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateAlertSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  valueSource: z.string().min(1).optional(),
  operator: z.enum(["gt", "gte", "lt", "lte", "eq", "neq"]).optional(),
  threshold: z.number().optional(),
  enabled: z.boolean().optional(),
  notifyInApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
});

async function getUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return db.user.findUnique({ where: { email: session.user.email } });
}

// GET /api/alerts/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const alert = await db.alert.findUnique({
    where: { id },
    include: {
      question: { select: { id: true, name: true, databaseId: true } },
    },
  });

  if (!alert || alert.creatorId !== user.id) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json(alert);
}

// PUT /api/alerts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.alert.findUnique({ where: { id } });
  if (!existing || existing.creatorId !== user.id) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const validated = updateAlertSchema.parse(body);

    const updated = await db.alert.update({
      where: { id },
      data: validated,
      include: {
        question: { select: { id: true, name: true, databaseId: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

// DELETE /api/alerts/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.alert.findUnique({ where: { id } });
  if (!existing || existing.creatorId !== user.id) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  await db.alert.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
