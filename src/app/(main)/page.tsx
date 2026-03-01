import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AnimatedDashboard } from "@/components/dashboard/animated-dashboard";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { initPlaygroundDatabase } from "@/lib/init-playground";

export default async function HomePage() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email || "there";
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  let showOnboarding = false;
  if (isAdmin) {
    const [dbCount, onboardingSetting] = await Promise.all([
      prisma.databaseConnection.count(),
      prisma.setting.findUnique({ where: { key: "onboarding_completed" } }),
    ]);

    // Auto-register the playground database on first visit if no databases exist
    if (dbCount === 0) {
      await initPlaygroundDatabase();
    }

    showOnboarding = dbCount === 0 && onboardingSetting?.value !== "true";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Explore your data, build queries, and create dashboards.
        </p>
      </div>

      <AnimatedDashboard isAdmin={isAdmin} />
      <OnboardingProvider shouldShow={showOnboarding} />
    </div>
  );
}
