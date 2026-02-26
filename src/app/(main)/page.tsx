import { auth } from "@/lib/auth";
import { BarChart3, PlusCircle, Terminal, Database } from "lucide-react";
import Link from "next/link";

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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/question/new"
          className="group flex flex-col gap-3 p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              New Question
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Build a query with the visual builder
            </p>
          </div>
        </Link>

        <Link
          href="/sql"
          className="group flex flex-col gap-3 p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              SQL Editor
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Write and execute raw SQL queries
            </p>
          </div>
        </Link>

        {isAdmin && (
          <Link
            href="/admin/databases"
            className="group flex flex-col gap-3 p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                Connect Database
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add a new database connection
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Empty state for recently viewed */}
      <div className="rounded-xl border bg-card p-12 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          No recent activity yet
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-md mx-auto">
          Your recently viewed questions and dashboards will appear here. Start
          by creating a new question or connecting a database.
        </p>
      </div>
    </div>
  );
}
