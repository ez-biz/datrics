"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  FileQuestion,
  LayoutDashboard,
  Activity,
  Database,
  Shield,
  Mail,
  Calendar,
  Clock,
  Trash2,
  UserX,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DatabasePermissionsEditor } from "@/components/admin/DatabasePermissionsEditor";
import { UserActivityTimeline } from "@/components/admin/UserActivityTimeline";
import { toast } from "sonner";

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  questionsCount: number;
  dashboardsCount: number;
  lastActiveAt: string | null;
  lastAction: string | null;
  databasePermissions: Array<{
    databaseId: string;
    accessLevel: string;
    database: {
      id: string;
      name: string;
      engine: string;
    };
  }>;
  recentQuestions: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  recentDashboards: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
}

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  EDITOR: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  VIEWER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  DEACTIVATED: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 404) {
        toast.error("User not found");
        router.push("/admin/users");
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
      toast.error("Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleRoleChange = async (newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        toast.success("User role updated");
        fetchUser();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update role", error);
      toast.error("Failed to update role");
    }
  };

  const handleStatusChange = async () => {
    if (!user) return;
    const newStatus = user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(
          newStatus === "DEACTIVATED" ? "User deactivated" : "User reactivated"
        );
        fetchUser();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("User deleted");
        router.push("/admin/users");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user", error);
      toast.error("Failed to delete user");
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-start gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin/users")}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Users
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{user.name || "Unnamed User"}</h1>
              <Badge
                variant="secondary"
                className={roleColors[user.role] || ""}
              >
                {user.role}
              </Badge>
              <Badge
                variant="secondary"
                className={statusColors[user.status] || ""}
              >
                {user.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={user.role} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="EDITOR">Editor</SelectItem>
              <SelectItem value="VIEWER">Viewer</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleStatusChange}
          >
            {user.status === "ACTIVE" ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Reactivate
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this user? This action cannot be
                  undone. All content created by this user will be preserved but
                  unassigned.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete User
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="databases">Database Access</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{user.questionsCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Dashboards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{user.dashboardsCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-lg font-medium">
                    {user.lastActiveAt
                      ? formatDistanceToNow(new Date(user.lastActiveAt), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Database Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">
                    {user.role === "ADMIN" ? "All" : user.databasePermissions.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <Badge variant="secondary" className={roleColors[user.role]}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary" className={statusColors[user.status]}>
                    {user.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Database Access
                  </span>
                  <span className="text-sm">
                    {user.role === "ADMIN"
                      ? "Full access (Admin)"
                      : `${user.databasePermissions.length} database(s)`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Updated</span>
                  <span className="text-sm">
                    {format(new Date(user.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Activity</span>
                  <span className="text-sm">
                    {user.lastActiveAt
                      ? formatDistanceToNow(new Date(user.lastActiveAt), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="databases">
          <Card>
            <CardHeader>
              <CardTitle>Database Access</CardTitle>
              <CardDescription>
                {user.role === "ADMIN"
                  ? "As an admin, this user has full access to all databases."
                  : "Control which databases this user can access and their permission level."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DatabasePermissionsEditor
                userId={user.id}
                userRole={user.role}
                onUpdate={fetchUser}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                View this user&apos;s recent actions and activity history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserActivityTimeline userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileQuestion className="h-4 w-4" />
                  Recent Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.recentQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No questions created yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {user.recentQuestions.map((q) => (
                      <li
                        key={q.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <button
                          onClick={() => router.push(`/question/${q.id}`)}
                          className="text-primary hover:underline truncate max-w-[200px]"
                        >
                          {q.name}
                        </button>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(q.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Recent Dashboards
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.recentDashboards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No dashboards created yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {user.recentDashboards.map((d) => (
                      <li
                        key={d.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <button
                          onClick={() => router.push(`/dashboard/${d.id}`)}
                          className="text-primary hover:underline truncate max-w-[200px]"
                        >
                          {d.name}
                        </button>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(d.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
