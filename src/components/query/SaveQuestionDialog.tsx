"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VizSettings } from "./QueryChart";

interface SaveQuestionDialogProps {
  databaseId: string;
  queryDefinition: unknown;
  type: "QUERY_BUILDER" | "NATIVE_SQL";
  vizSettings?: VizSettings;
  disabled?: boolean;
  collectionId?: string | null;
  onSaved?: (questionId: string) => void;
}

export function SaveQuestionDialog({
  databaseId,
  queryDefinition,
  type,
  vizSettings,
  disabled,
  collectionId,
  onSaved,
}: SaveQuestionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for your question");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          queryDefinition,
          vizSettings: vizSettings || { chartType: "table" },
          databaseId,
          collectionId: collectionId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save question");
      }

      const question = await response.json();

      toast.success("Question saved successfully");
      setOpen(false);
      setName("");
      setDescription("");

      onSaved?.(question.id);

      // Navigate to the saved question
      router.push(`/question/${question.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save question"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          disabled={disabled}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Question</DialogTitle>
          <DialogDescription>
            Save this query so you can access it later or add it to a dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly revenue by region"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of what this query shows..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Question
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
