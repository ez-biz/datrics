"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PlusCircle, Terminal, Database } from "lucide-react";
import { Logo } from "@/components/ui/logo";

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

export function AnimatedDashboard({ isAdmin }: { isAdmin: boolean }) {
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

      {/* Empty state for recently viewed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="rounded-xl border bg-card p-12 text-center"
      >
        <div className="flex justify-center mb-6">
          <Logo
            size={48}
            className="text-muted-foreground/30 grayscale opacity-50"
          />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground">
          No recent activity yet
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-md mx-auto">
          Your recently viewed questions and dashboards will appear here. Start
          by creating a new question or connecting a database.
        </p>
      </motion.div>
    </>
  );
}
