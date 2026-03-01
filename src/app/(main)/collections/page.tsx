"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Folder,
  FolderPlus,
  FileQuestion,
  LayoutDashboard,
  MoreHorizontal,
  ChevronRight,
  Home,
  Pencil,
  Trash2,
  FolderInput,
  Search,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { MoveToCollectionDialog } from "@/components/collections/MoveToCollectionDialog";
import { toast } from "sonner";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  questionsCount: number;
  dashboardsCount: number;
  childrenCount: number;
  createdAt: string;
}

interface Question {
  id: string;
  name: string;
  description: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string | null };
}

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string | null };
  cardsCount: number;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export default function CollectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parent");

  const [collections, setCollections] = useState<Collection[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [moveItem, setMoveItem] = useState<{
    type: "question" | "dashboard";
    id: string;
    name: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = parentId
        ? `/api/collections?parentId=${parentId}`
        : "/api/collections";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections);
        setQuestions(data.questions);
        setDashboards(data.dashboards);
        setBreadcrumbs(data.breadcrumbs || []);
      }
    } catch (error) {
      console.error("Failed to fetch collections", error);
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteCollection = async (collection: Collection) => {
    if (
      !confirm(
        `Delete "${collection.name}"? Contents will be moved to the parent folder.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Collection deleted");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete collection");
      }
    } catch (error) {
      console.error("Failed to delete collection", error);
      toast.error("Failed to delete collection");
    }
  };

  const navigateToCollection = (collectionId: string | null) => {
    if (collectionId) {
      router.push(`/collections?parent=${collectionId}`);
    } else {
      router.push("/collections");
    }
  };

  // Filter items by search
  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredQuestions = questions.filter((q) =>
    q.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDashboards = dashboards.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems =
    filteredCollections.length +
    filteredQuestions.length +
    filteredDashboards.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1">
            Organize your questions and dashboards into folders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Collection
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const url = parentId
                    ? `/question/new?collectionId=${parentId}`
                    : "/question/new";
                  router.push(url);
                }}
              >
                <FileQuestion className="mr-2 h-4 w-4" />
                New Question
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const url = parentId
                    ? `/dashboards?new=true&collectionId=${parentId}`
                    : "/dashboards?new=true";
                  router.push(url);
                }}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                New Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
              <DialogDescription>
                Create a new folder to organize your content.
              </DialogDescription>
            </DialogHeader>
            <CollectionForm
              parentId={parentId}
              onSuccess={() => {
                setCreateDialogOpen(false);
                fetchData();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/collections"
              onClick={(e) => {
                e.preventDefault();
                navigateToCollection(null);
              }}
              className="flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              Root
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={crumb.id}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={`/collections?parent=${crumb.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToCollection(crumb.id);
                    }}
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter items..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : totalItems === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center">
          <Folder className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">
            {searchQuery ? "No items match your search" : "This folder is empty"}
          </h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">
            {searchQuery
              ? "Try a different search term."
              : "Create a collection or move items here to get started."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Collection
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Collections */}
          {filteredCollections.map((collection) => (
            <div
              key={collection.id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
              onClick={() => navigateToCollection(collection.id)}
            >
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <Folder className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{collection.name}</p>
                <p className="text-sm text-muted-foreground">
                  {collection.childrenCount} folders, {collection.questionsCount}{" "}
                  questions, {collection.dashboardsCount} dashboards
                </p>
              </div>
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setEditingCollection(collection)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteCollection(collection)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {/* Questions */}
          {filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
              onClick={() => router.push(`/question/${question.id}`)}
            >
              <div className="h-10 w-10 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileQuestion className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{question.name}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {question.type === "NATIVE_SQL" ? "SQL" : "Builder"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(new Date(question.updatedAt), {
                    addSuffix: true,
                  })}
                  {question.creator?.name && ` by ${question.creator.name}`}
                </p>
              </div>
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setMoveItem({
                          type: "question",
                          id: question.id,
                          name: question.name,
                        })
                      }
                    >
                      <FolderInput className="mr-2 h-4 w-4" />
                      Move to...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {/* Dashboards */}
          {filteredDashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
              onClick={() => router.push(`/dashboard/${dashboard.id}`)}
            >
              <div className="h-10 w-10 rounded bg-purple-500/10 flex items-center justify-center shrink-0">
                <LayoutDashboard className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{dashboard.name}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {dashboard.cardsCount} cards
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(new Date(dashboard.updatedAt), {
                    addSuffix: true,
                  })}
                  {dashboard.creator?.name && ` by ${dashboard.creator.name}`}
                </p>
              </div>
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setMoveItem({
                          type: "dashboard",
                          id: dashboard.id,
                          name: dashboard.name,
                        })
                      }
                    >
                      <FolderInput className="mr-2 h-4 w-4" />
                      Move to...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Collection Dialog */}
      <Dialog
        open={!!editingCollection}
        onOpenChange={(open) => !open && setEditingCollection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Update the collection name and description.
            </DialogDescription>
          </DialogHeader>
          {editingCollection && (
            <CollectionForm
              collection={editingCollection}
              onSuccess={() => {
                setEditingCollection(null);
                fetchData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Move Item Dialog */}
      <MoveToCollectionDialog
        open={!!moveItem}
        onOpenChange={(open) => !open && setMoveItem(null)}
        itemType={moveItem?.type || "question"}
        itemId={moveItem?.id || ""}
        itemName={moveItem?.name || ""}
        onSuccess={() => {
          setMoveItem(null);
          fetchData();
        }}
      />
    </div>
  );
}
