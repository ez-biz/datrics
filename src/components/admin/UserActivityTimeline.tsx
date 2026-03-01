"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FileQuestion,
  LayoutDashboard,
  Play,
  Edit2,
  Trash2,
  UserPlus,
  Shield,
  UserX,
  UserCheck,
  Database,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  target: {
    id: string;
    name?: string;
    email?: string;
  } | null;
}

interface UserActivityTimelineProps {
  userId: string;
}

const actionIcons: Record<string, typeof FileQuestion> = {
  created_question: FileQuestion,
  updated_question: Edit2,
  deleted_question: Trash2,
  ran_query: Play,
  created_dashboard: LayoutDashboard,
  updated_dashboard: Edit2,
  deleted_dashboard: Trash2,
  created_user: UserPlus,
  changed_user_role: Shield,
  deactivated_user: UserX,
  reactivated_user: UserCheck,
  deleted_user: Trash2,
  granted_database_access: Database,
  revoked_database_access: Database,
};

const actionLabels: Record<string, string> = {
  created_question: "Created a question",
  updated_question: "Updated a question",
  deleted_question: "Deleted a question",
  ran_query: "Ran a query",
  created_dashboard: "Created a dashboard",
  updated_dashboard: "Updated a dashboard",
  deleted_dashboard: "Deleted a dashboard",
  created_user: "Created a user",
  changed_user_role: "Changed user role",
  deactivated_user: "Deactivated a user",
  reactivated_user: "Reactivated a user",
  deleted_user: "Deleted a user",
  granted_database_access: "Granted database access",
  revoked_database_access: "Revoked database access",
};

export function UserActivityTimeline({ userId }: UserActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 20;

  const fetchActivities = useCallback(
    async (loadMore = false) => {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const currentOffset = loadMore ? offset : 0;
        const res = await fetch(
          `/api/admin/users/${userId}/activity?limit=${limit}&offset=${currentOffset}`
        );

        if (res.ok) {
          const data = await res.json();
          if (loadMore) {
            setActivities((prev) => [...prev, ...data.activities]);
          } else {
            setActivities(data.activities);
          }
          setTotal(data.total);
          setOffset(currentOffset + data.activities.length);
        }
      } catch (error) {
        console.error("Failed to fetch activities", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, offset]
  );

  useEffect(() => {
    fetchActivities();
  }, [userId]); // Only fetch on mount or userId change

  const getActivityDescription = (activity: ActivityItem): string => {
    const label = actionLabels[activity.action] || activity.action;

    if (activity.target?.name) {
      return `${label}: ${activity.target.name}`;
    }

    if (activity.metadata) {
      const meta = activity.metadata;
      if (meta.questionName) return `${label}: ${meta.questionName}`;
      if (meta.dashboardName) return `${label}: ${meta.dashboardName}`;
      if (meta.userName) return `${label}: ${meta.userName}`;
    }

    return label;
  };

  const getExtraInfo = (activity: ActivityItem): string | null => {
    if (!activity.metadata) return null;

    const meta = activity.metadata;

    if (activity.action === "changed_user_role") {
      return `${meta.previousRole} → ${meta.newRole}`;
    }

    if (activity.action === "granted_database_access" && meta.databases) {
      const dbs = meta.databases as Array<{ name: string; accessLevel: string }>;
      return dbs.map((d) => `${d.name} (${d.accessLevel})`).join(", ");
    }

    if (activity.action === "revoked_database_access" && meta.databases) {
      const dbs = meta.databases as string[];
      return dbs.join(", ");
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = actionIcons[activity.action] || FileQuestion;
            const extraInfo = getExtraInfo(activity);

            return (
              <div key={activity.id} className="flex items-start gap-3 relative">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{getActivityDescription(activity)}</p>
                  {extraInfo && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {extraInfo}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activities.length < total && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities(true)}
            disabled={loadingMore}
          >
            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load More ({total - activities.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
