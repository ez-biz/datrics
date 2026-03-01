import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET: Check if onboarding should be shown
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ showOnboarding: false });
  }

  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") {
    return NextResponse.json({ showOnboarding: false });
  }

  const [dbCount, onboardingSetting] = await Promise.all([
    prisma.databaseConnection.count(),
    prisma.setting.findUnique({ where: { key: "onboarding_completed" } }),
  ]);

  const showOnboarding =
    dbCount === 0 && onboardingSetting?.value !== "true";

  return NextResponse.json({ showOnboarding, databaseCount: dbCount });
}

// PUT: Mark onboarding as completed
export async function PUT() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.setting.upsert({
    where: { key: "onboarding_completed" },
    update: { value: "true" },
    create: { key: "onboarding_completed", value: "true" },
  });

  return NextResponse.json({ success: true });
}
