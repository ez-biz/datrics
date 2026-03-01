import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendTestEmail } from "@/lib/email";

// POST /api/admin/settings/test-email - Send a test email
export async function POST(request: NextRequest) {
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

  const body = (await request.json()) as { to?: string };
  const to = body.to || user.email;

  const success = await sendTestEmail(to);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to send test email. Check your SMTP settings." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
