"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Question {
  id: string;
  name: string;
  databaseId: string;
}

interface AlertData {
  id?: string;
  name: string;
  questionId: string;
  valueSource: string;
  operator: string;
  threshold: number;
  enabled?: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  question?: Question;
}

interface AlertFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert?: AlertData | null;
  onSuccess: () => void;
}

const operators = [
  { value: "gt", label: "Greater than (>)" },
  { value: "gte", label: "Greater or equal (>=)" },
  { value: "lt", label: "Less than (<)" },
  { value: "lte", label: "Less or equal (<=)" },
  { value: "eq", label: "Equal to (=)" },
  { value: "neq", label: "Not equal to (!=)" },
];

const valueSources = [
  { value: "first_row_first_col", label: "First row, first column" },
  { value: "row_count", label: "Row count" },
];

export function AlertForm({
  open,
  onOpenChange,
  alert,
  onSuccess,
}: AlertFormProps) {
  const isEditing = !!alert?.id;

  const [name, setName] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [valueSource, setValueSource] = useState("first_row_first_col");
  const [operator, setOperator] = useState("lt");
  const [threshold, setThreshold] = useState(0);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/questions?limit=200")
        .then((r) => r.json())
        .then((data) => setQuestions(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (alert) {
      setName(alert.name);
      setQuestionId(alert.questionId);
      setValueSource(alert.valueSource);
      setOperator(alert.operator);
      setThreshold(alert.threshold);
      setNotifyInApp(alert.notifyInApp);
      setNotifyEmail(alert.notifyEmail);
    } else {
      setName("");
      setQuestionId("");
      setValueSource("first_row_first_col");
      setOperator("lt");
      setThreshold(0);
      setNotifyInApp(true);
      setNotifyEmail(false);
    }
  }, [alert, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name,
        questionId,
        valueSource,
        operator,
        threshold,
        notifyInApp,
        notifyEmail,
      };

      const res = isEditing
        ? await fetch(`/api/alerts/${alert!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save alert");
      }

      toast.success(isEditing ? "Alert updated" : "Alert created");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save alert"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Alert" : "Create Alert"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-name">Name</Label>
            <Input
              id="alert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Revenue below threshold"
              required
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Select value={questionId} onValueChange={setQuestionId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a question" />
                </SelectTrigger>
                <SelectContent>
                  {questions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Value source</Label>
            <Select value={valueSource} onValueChange={setValueSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {valueSources.map((vs) => (
                  <SelectItem key={vs.value} value={vs.value}>
                    {vs.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold</Label>
              <Input
                id="threshold"
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-inapp">In-app notification</Label>
              <Switch
                id="notify-inapp"
                checked={notifyInApp}
                onCheckedChange={setNotifyInApp}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-email">Email notification</Label>
              <Switch
                id="notify-email"
                checked={notifyEmail}
                onCheckedChange={setNotifyEmail}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || (!isEditing && !questionId)}>
              {saving ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
