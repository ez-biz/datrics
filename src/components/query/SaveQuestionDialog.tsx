"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VizSettings } from "./QueryChart";
import { isNumericType } from "./QueryChart";
import { ChartTypePicker } from "./ChartTypePicker";
import { QueryChart } from "./QueryChart";

interface SaveQuestionDialogProps {
  databaseId: string;
  queryDefinition: unknown;
  type: "QUERY_BUILDER" | "NATIVE_SQL";
  vizSettings?: VizSettings;
  disabled?: boolean;
  collectionId?: string | null;
  onSaved?: (questionId: string) => void;
  onVizSettingsChange?: (settings: VizSettings) => void;
  columns?: { name: string; type: string }[];
  rows?: Record<string, unknown>[];
  editMode?: {
    questionId: string;
    name: string;
    description: string;
  };
}

export function SaveQuestionDialog({
  databaseId,
  queryDefinition,
  type,
  vizSettings,
  disabled,
  collectionId,
  onSaved,
  onVizSettingsChange,
  columns,
  rows,
  editMode,
}: SaveQuestionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(editMode?.name || "");
  const [description, setDescription] = useState(editMode?.description || "");
  const [localViz, setLocalViz] = useState<VizSettings>(
    vizSettings || { chartType: "table" }
  );
  const [showVizSection, setShowVizSection] = useState(false);

  // Sync localViz when parent vizSettings changes
  useEffect(() => {
    if (vizSettings) {
      setLocalViz(vizSettings);
    }
  }, [vizSettings]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(editMode?.name || "");
      setDescription(editMode?.description || "");
      setLocalViz(vizSettings || { chartType: "table" });
      setShowVizSection(
        vizSettings ? vizSettings.chartType !== "table" : false
      );
    }
  }, [open, editMode, vizSettings]);

  const hasResults = columns && columns.length > 0 && rows && rows.length > 0;
  const numericColumns = columns?.filter((c) => isNumericType(c.type)) || [];

  const updateLocalViz = (updates: Partial<VizSettings>) => {
    const newSettings = { ...localViz, ...updates };
    setLocalViz(newSettings);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for your question");
      return;
    }

    setSaving(true);

    try {
      const isEdit = !!editMode;
      const url = isEdit
        ? `/api/questions/${editMode.questionId}`
        : "/api/questions";
      const method = isEdit ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        queryDefinition,
        vizSettings: localViz,
      };

      if (!isEdit) {
        body.type = type;
        body.databaseId = databaseId;
        body.collectionId = collectionId || undefined;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save question");
      }

      const question = await response.json();

      // Sync viz settings back to parent
      onVizSettingsChange?.(localViz);

      toast.success(
        isEdit ? "Question updated successfully" : "Question saved successfully"
      );
      setOpen(false);
      setName("");
      setDescription("");

      const questionId = isEdit ? editMode.questionId : question.id;
      onSaved?.(questionId);

      router.push(`/question/${questionId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save question"
      );
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!editMode;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          disabled={disabled}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          {isEdit ? "Update" : "Save"}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={
          hasResults && showVizSection
            ? "sm:max-w-[700px]"
            : "sm:max-w-[425px]"
        }
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Update Question" : "Save Question"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this query and its visualization settings."
              : "Save this query so you can access it later or add it to a dashboard."}
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
              rows={2}
            />
          </div>

          {/* Visualization Section */}
          {hasResults && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowVizSection(!showVizSection)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full"
              >
                {showVizSection ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Visualization
                {localViz.chartType !== "table" && (
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    ({localViz.chartType} chart)
                  </span>
                )}
              </button>

              {showVizSection && (
                <div className="space-y-3 border rounded-lg p-3">
                  {/* Chart Type Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Chart Type
                    </Label>
                    <ChartTypePicker
                      value={localViz.chartType}
                      onChange={(chartType) =>
                        updateLocalViz({
                          chartType: chartType as VizSettings["chartType"],
                        })
                      }
                      includeTable
                      size="sm"
                    />
                  </div>

                  {/* Axis Selectors */}
                  {localViz.chartType !== "table" &&
                    localViz.chartType !== "number" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            {localViz.chartType === "pie"
                              ? "Category"
                              : "X-Axis"}
                          </Label>
                          <Select
                            value={localViz.xAxis}
                            onValueChange={(value) =>
                              updateLocalViz({ xAxis: value })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {columns!.map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            {localViz.chartType === "pie" ? "Value" : "Y-Axis"}
                          </Label>
                          <Select
                            value={localViz.yAxis}
                            onValueChange={(value) =>
                              updateLocalViz({ yAxis: value })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {(numericColumns.length > 0
                                ? numericColumns
                                : columns!
                              ).map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                  {localViz.chartType === "number" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Value Column
                      </Label>
                      <Select
                        value={localViz.yAxis}
                        onValueChange={(value) =>
                          updateLocalViz({ yAxis: value })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {(numericColumns.length > 0
                            ? numericColumns
                            : columns!
                          ).map((col) => (
                            <SelectItem key={col.name} value={col.name}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Mini Chart Preview */}
                  {localViz.chartType !== "table" && (
                    <div className="border rounded-md overflow-hidden bg-background">
                      <div className="max-h-[200px]">
                        <QueryChart
                          columns={columns!}
                          rows={rows!.slice(0, 50)}
                          vizSettings={localViz}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
                {isEdit ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? "Update Question" : "Save Question"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
