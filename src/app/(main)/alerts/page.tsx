"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertForm } from "@/components/alerts/AlertForm";
import { toast } from "sonner";

interface Alert {
  id: string;
  name: string;
  questionId: string;
  valueSource: string;
  operator: string;
  threshold: number;
  enabled: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifySlack: boolean;
  lastCheckedAt: string | null;
  lastTriggeredAt: string | null;
  lastValue: number | null;
  question: { id: string; name: string; databaseId: string };
  createdAt: string;
}

const operatorLabels: Record<string, string> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "=",
  neq: "!=",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, enabled } : a))
        );
        toast.success(enabled ? "Alert enabled" : "Alert disabled");
      }
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/alerts/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== deleteId));
        toast.success("Alert deleted");
      }
    } catch {
      toast.error("Failed to delete alert");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Get notified when your data meets certain conditions
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAlert(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Alert
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No alerts yet</p>
            <p className="text-muted-foreground mt-1">
              Create an alert to get notified when your data changes
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setEditingAlert(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{alert.name}</CardTitle>
                    <Badge variant={alert.enabled ? "default" : "secondary"}>
                      {alert.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={(checked) =>
                        toggleEnabled(alert.id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingAlert(alert);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  On &quot;{alert.question.name}&quot; &mdash;{" "}
                  {alert.valueSource} {operatorLabels[alert.operator] || alert.operator}{" "}
                  {alert.threshold}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>
                    Last value:{" "}
                    {alert.lastValue !== null ? alert.lastValue : "—"}
                  </span>
                  <span>
                    Last checked:{" "}
                    {alert.lastCheckedAt
                      ? formatDistanceToNow(new Date(alert.lastCheckedAt), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </span>
                  <span>
                    Last triggered:{" "}
                    {alert.lastTriggeredAt
                      ? formatDistanceToNow(new Date(alert.lastTriggeredAt), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </span>
                  <span className="flex gap-2">
                    {alert.notifyInApp && <Badge variant="outline">In-app</Badge>}
                    {alert.notifyEmail && <Badge variant="outline">Email</Badge>}
                    {alert.notifySlack && <Badge variant="outline">Slack</Badge>}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertForm
        open={formOpen}
        onOpenChange={setFormOpen}
        alert={editingAlert}
        onSuccess={fetchAlerts}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
