import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const SETTING_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_from",
  "smtp_secure",
  "slack_webhook_url",
];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

// GET /api/admin/settings - Get all settings
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.setting.findMany({
    where: { key: { in: SETTING_KEYS } },
  });

  const result: Record<string, string> = {};
  for (const s of settings) {
    // Mask password
    result[s.key] = s.key === "smtp_pass" && s.value ? "••••••••" : s.value;
  }

  return NextResponse.json(result);
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, string>;

  for (const [key, value] of Object.entries(body)) {
    if (!SETTING_KEYS.includes(key)) continue;
    // Skip masked password
    if (key === "smtp_pass" && value === "••••••••") continue;

    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ success: true });
}
