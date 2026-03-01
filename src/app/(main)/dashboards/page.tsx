"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  FileStack,
  Loader2,
  AlertCircle,
  ArrowLeft,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  cardCount: number;
}

interface Database {
  id: string;
  name: string;
}

export default function DashboardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenCreate = searchParams.get("new") === "true";
  const collectionId = searchParams.get("collectionId");

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(shouldOpenCreate);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Template dialog state
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DashboardTemplate | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [databasesLoading, setDatabasesLoading] = useState(false);
  const [databasesError, setDatabasesError] = useState<string | null>(null);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

  useEffect(() => {
    fetchDashboards();
  }, []);

  // Auto-open create dialog if new=true in URL
  useEffect(() => {
    if (shouldOpenCreate) {
      setCreateOpen(true);
      // Clear the URL params after opening
      router.replace("/dashboards");
    }
  }, [shouldOpenCreate, router]);

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
          collectionId: collectionId || undefined,
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

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const response = await fetch("/api/dashboards/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      setTemplatesError("Failed to load templates. Please try again.");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchDatabases = useCallback(async () => {
    setDatabasesLoading(true);
    setDatabasesError(null);
    try {
      const response = await fetch("/api/databases");
      if (!response.ok) throw new Error("Failed to fetch databases");
      const data = await response.json();
      setDatabases(data);
    } catch (error) {
      setDatabasesError("Failed to load databases. Please try again.");
    } finally {
      setDatabasesLoading(false);
    }
  }, []);

  const handleTemplateDialogOpen = (open: boolean) => {
    setTemplateOpen(open);
    if (open) {
      fetchTemplates();
    } else {
      // Reset state on close
      setSelectedTemplate(null);
      setSelectedDatabaseId("");
      setTemplatesError(null);
      setDatabasesError(null);
    }
  };

  const handleTemplateSelect = (template: DashboardTemplate) => {
    setSelectedTemplate(template);
    fetchDatabases();
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !selectedDatabaseId) return;

    setCreatingFromTemplate(true);
    try {
      const response = await fetch("/api/dashboards/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          databaseId: selectedDatabaseId,
        }),
      });

      if (!response.ok) throw new Error("Failed to create dashboard");

      const dashboard = await response.json();
      toast.success("Dashboard created from template");
      setTemplateOpen(false);
      router.push(`/dashboard/${dashboard.id}`);
    } catch (error) {
      toast.error("Failed to create dashboard from template");
    } finally {
      setCreatingFromTemplate(false);
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
        <div className="flex items-center gap-2">
          <Dialog
            open={templateOpen}
            onOpenChange={handleTemplateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileStack className="h-4 w-4" />
                From Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              {!selectedTemplate ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Create from Template</DialogTitle>
                    <DialogDescription>
                      Choose a template to quickly create a pre-built dashboard.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    {templatesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : templatesError ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-6 w-6" />
                        <p>{templatesError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchTemplates}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : templates.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        No templates available.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 max-h-[400px] overflow-y-auto pr-1">
                        {templates.map((template) => (
                          <Card
                            key={template.id}
                            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">
                                  {template.name}
                                </CardTitle>
                                <Badge variant="secondary" className="text-[10px]">
                                  {template.category}
                                </Badge>
                              </div>
                              <CardDescription className="text-xs line-clamp-2">
                                {template.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-xs text-muted-foreground">
                                {template.cardCount} card
                                {template.cardCount !== 1 ? "s" : ""}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setSelectedTemplate(null);
                          setSelectedDatabaseId("");
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      Select Database
                    </DialogTitle>
                    <DialogDescription>
                      Choose a database for the &quot;{selectedTemplate.name}&quot; template.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 grid gap-4">
                    {databasesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : databasesError ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-6 w-6" />
                        <p>{databasesError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchDatabases}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="database">Database</Label>
                          <Select
                            value={selectedDatabaseId}
                            onValueChange={setSelectedDatabaseId}
                          >
                            <SelectTrigger id="database">
                              <SelectValue placeholder="Select a database" />
                            </SelectTrigger>
                            <SelectContent>
                              {databases.map((db) => (
                                <SelectItem key={db.id} value={db.id}>
                                  {db.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setTemplateOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateFromTemplate}
                            disabled={!selectedDatabaseId || creatingFromTemplate}
                          >
                            {creatingFromTemplate ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create Dashboard"
                            )}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

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
