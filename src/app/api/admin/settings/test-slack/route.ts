import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendTestSlackNotification } from "@/lib/slack";

// POST /api/admin/settings/test-slack - Send a test Slack message
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const success = await sendTestSlackNotification();

  if (!success) {
    return NextResponse.json(
      { error: "Failed to send Slack message. Check your webhook URL." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
