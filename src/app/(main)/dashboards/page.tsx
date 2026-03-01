"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Plus,
  LayoutDashboard,
  MoreHorizontal,
  Trash2,
  Globe,
  Lock,
  Clock,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  publicSlug: string | null;
  creator: { id: string; name: string | null; email: string };
  _count: { cards: number };
  createdAt: string;
  updatedAt: string;
}

export default function DashboardsPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    try {
      const response = await fetch("/api/dashboards");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setDashboards(data);
    } catch (error) {
      toast.error("Failed to load dashboards");
    } finally {
      setLoading(false);
    }
  };

  const createDashboard = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to create");

      const dashboard = await response.json();
      toast.success("Dashboard created");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      router.push(`/dashboard/${dashboard.id}`);
    } catch (error) {
      toast.error("Failed to create dashboard");
    } finally {
      setCreating(false);
    }
  };

  const deleteDashboard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dashboard?")) return;

    try {
      const response = await fetch(`/api/dashboards/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setDashboards((prev) => prev.filter((d) => d.id !== id));
      toast.success("Dashboard deleted");
    } catch (error) {
      toast.error("Failed to delete dashboard");
    }
  };

  const filteredDashboards = dashboards.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboards</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your dashboards
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Dashboard</DialogTitle>
              <DialogDescription>
                Create a new dashboard to organize your questions and
                visualizations.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Sales Overview"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createDashboard} disabled={creating}>
                {creating ? "Creating..." : "Create Dashboard"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search dashboards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-sm"
        />
      </div>

      {/* Dashboards Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDashboards.length === 0 ? (
        <Card className="py-12">
          <div className="text-center">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No dashboards yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search
                ? "No dashboards match your search"
                : "Create your first dashboard to get started"}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Dashboard
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDashboards.map((dashboard) => (
            <Card
              key={dashboard.id}
              className="group hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => router.push(`/dashboard/${dashboard.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {dashboard.name}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDashboard(dashboard.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {dashboard.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {dashboard.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {dashboard.isPublic ? (
                      <>
                        <Globe className="h-3 w-3" /> Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" /> Private
                      </>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(dashboard.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">
                    {dashboard._count.cards} card
                    {dashboard._count.cards !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
