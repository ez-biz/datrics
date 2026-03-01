"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Terminal,
  Database,
  FileQuestion,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Logo } from "@/components/ui/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  name: string;
  description: string | null;
  type: "QUERY_BUILDER" | "NATIVE_SQL";
  vizSettings: { chartType: string } | null;
  updatedAt: string;
  creator: { name: string | null; email: string };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const CHART_ICONS: Record<string, typeof BarChart3> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  table: Table,
};

export function AnimatedDashboard({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentQuestions();
  }, []);

  const fetchRecentQuestions = async () => {
    try {
      const response = await fetch("/api/questions/recent?limit=6");
      if (response.ok) {
        const data = await response.json();
        setRecentQuestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch recent questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getChartIcon = (vizSettings: { chartType: string } | null) => {
    const type = vizSettings?.chartType || "table";
    return CHART_ICONS[type] || Table;
  };

  return (
    <>
      {/* Quick Actions */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <motion.div variants={item}>
          <Link
            href="/question/new"
            className="group flex flex-col gap-3 p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all h-full"
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
        </motion.div>

        <motion.div variants={item}>
          <Link
            href="/sql"
            className="group flex flex-col gap-3 p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all h-full"
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
        </motion.div>

        {isAdmin && (
          <motion.div variants={item}>
            <Link
              href="/admin/databases"
              className="group flex flex-col gap-3 p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all h-full"
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
          </motion.div>
        )}
      </motion.div>

      {/* Recent Questions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Questions</CardTitle>
              {recentQuestions.length > 0 && (
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link href="/questions">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentQuestions.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <Logo
                    size={40}
                    className="text-muted-foreground/30 grayscale opacity-50"
                  />
                </div>
                <h3 className="text-base font-semibold text-muted-foreground">
                  No questions yet
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-md mx-auto">
                  Your saved questions will appear here. Start by creating a new
                  question.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/question/new">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Question
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentQuestions.map((question) => {
                  const ChartIcon = getChartIcon(question.vizSettings);
                  return (
                    <div
                      key={question.id}
                      onClick={() => router.push(`/question/${question.id}`)}
                      className="group flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer"
                    >
                      <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                        <ChartIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {question.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-1">
                            {question.type === "NATIVE_SQL" ? "SQL" : "Builder"}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(question.updatedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
