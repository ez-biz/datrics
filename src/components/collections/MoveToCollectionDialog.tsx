"use client";

import { useState, useEffect } from "react";
import { Folder, Home, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Collection {
  id: string;
  name: string;
  parentId: string | null;
  path: Array<{ id: string; name: string }>;
}

interface MoveToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "question" | "dashboard";
  itemId: string;
  itemName: string;
  currentCollectionId?: string | null;
  onSuccess?: () => void;
}

export function MoveToCollectionDialog({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  currentCollectionId,
  onSuccess,
}: MoveToCollectionDialogProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchCollections();
      setSelectedId(null);
    }
  }, [open]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collections?flat=true");
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (error) {
      console.error("Failed to fetch collections", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    setMoving(true);
    try {
      const endpoint =
        itemType === "question"
          ? `/api/questions/${itemId}`
          : `/api/dashboards/${itemId}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: selectedId }),
      });

      if (res.ok) {
        const targetName =
          selectedId === null
            ? "Root"
            : collections.find((c) => c.id === selectedId)?.name || "collection";
        toast.success(`Moved "${itemName}" to ${targetName}`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to move item");
      }
    } catch (error) {
      console.error("Failed to move item", error);
      toast.error("Failed to move item");
    } finally {
      setMoving(false);
    }
  };

  const getCollectionPath = (collection: Collection): string => {
    if (!collection.path || collection.path.length === 0) {
      return collection.name;
    }
    return collection.path.map((p) => p.name).join(" / ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move to Collection</DialogTitle>
          <DialogDescription>
            Choose a destination for &quot;{itemName}&quot;
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Root option */}
              <button
                onClick={() => setSelectedId(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                  selectedId === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                disabled={currentCollectionId === null}
              >
                <Home className="h-4 w-4 shrink-0" />
                <span className="font-medium">Root</span>
                {currentCollectionId === null && (
                  <span className="ml-auto text-xs opacity-70">(current)</span>
                )}
              </button>

              {/* Collections */}
              {collections.map((collection) => {
                const isCurrent = collection.id === currentCollectionId;
                const isSelected = collection.id === selectedId;

                return (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedId(collection.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                      isCurrent && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={isCurrent}
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{collection.name}</p>
                      {collection.path && collection.path.length > 1 && (
                        <p className="text-xs opacity-70 truncate flex items-center gap-1">
                          {collection.path.slice(0, -1).map((p, i) => (
                            <span key={p.id} className="flex items-center">
                              {i > 0 && (
                                <ChevronRight className="h-3 w-3 mx-0.5" />
                              )}
                              {p.name}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="text-xs opacity-70">(current)</span>
                    )}
                  </button>
                );
              })}

              {collections.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No collections yet. Create one first.
                </p>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={moving || (selectedId === currentCollectionId)}
          >
            {moving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
