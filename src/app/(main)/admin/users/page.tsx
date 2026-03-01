"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Shield,
  Edit2,
  UserX,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserForm } from "@/components/admin/UserForm";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastActiveAt: string | null;
  questionsCount: number;
  dashboardsCount: number;
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

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(
          newStatus === "DEACTIVATED" ? "User deactivated" : "User reactivated"
        );
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Failed to update user status", error);
      toast.error("Failed to update user");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        toast.success("User role updated");
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Failed to update user role", error);
      toast.error("Failed to update user");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts, roles, and permissions.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. They will receive login credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <UserForm
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchUsers();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="EDITOR">Editor</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground ml-auto">
          {total} user{total !== 1 ? "s" : ""}
        </div>
      </div>

      {loading ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : users.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium">No users found</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto mb-6">
            {searchQuery || roleFilter !== "all" || statusFilter !== "all"
              ? "No users match your search criteria."
              : "Get started by adding your first user."}
          </p>
          {!searchQuery && roleFilter === "all" && statusFilter === "all" && (
            <Button onClick={() => setDialogOpen(true)}>Add User</Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name || "Unnamed User"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={roleColors[user.role] || ""}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[user.status] || ""}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {user.questionsCount} questions, {user.dashboardsCount} dashboards
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {user.lastActiveAt
                        ? formatDistanceToNow(new Date(user.lastActiveAt), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.id, "ADMIN")}
                          disabled={user.role === "ADMIN"}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.id, "EDITOR")}
                          disabled={user.role === "EDITOR"}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Make Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.id, "VIEWER")}
                          disabled={user.role === "VIEWER"}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === "ACTIVE" ? (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(user.id, "DEACTIVATED")}
                            className="text-destructive"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(user.id, "ACTIVE")}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
