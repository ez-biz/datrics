import { auth } from "@/lib/auth";
import { AnimatedDashboard } from "@/components/dashboard/animated-dashboard";

export default async function HomePage() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email || "there";
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

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
    </div>
  );
}
