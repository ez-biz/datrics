"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface DatabasePermission {
  database: {
    id: string;
    name: string;
    engine: string;
  };
  accessLevel: string | null;
}

interface DatabasePermissionsEditorProps {
  userId: string;
  userRole: string;
  onUpdate?: () => void;
}

const accessLevelLabels: Record<string, string> = {
  VIEW: "View Only",
  QUERY: "Query",
  ADMIN: "Full Access",
};

const accessLevelDescriptions: Record<string, string> = {
  VIEW: "Can view schema and saved questions",
  QUERY: "Can run queries and create questions",
  ADMIN: "Full database administration",
};

export function DatabasePermissionsEditor({
  userId,
  userRole,
  onUpdate,
}: DatabasePermissionsEditorProps) {
  const [permissions, setPermissions] = useState<DatabasePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPermissions, setOriginalPermissions] = useState<
    Map<string, string | null>
  >(new Map());

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions);
        // Store original state
        const origMap = new Map<string, string | null>();
        data.permissions.forEach((p: DatabasePermission) => {
          origMap.set(p.database.id, p.accessLevel);
        });
        setOriginalPermissions(origMap);
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to fetch permissions", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleAccessLevelChange = (databaseId: string, accessLevel: string) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.database.id === databaseId
          ? { ...p, accessLevel: accessLevel === "none" ? null : accessLevel }
          : p
      )
    );

    // Check if there are changes
    const newValue = accessLevel === "none" ? null : accessLevel;
    const originalValue = originalPermissions.get(databaseId);

    // Compare all permissions to see if any differ from original
    const updatedPermissions = permissions.map((p) =>
      p.database.id === databaseId
        ? { ...p, accessLevel: newValue }
        : p
    );

    const hasAnyChange = updatedPermissions.some(
      (p) => p.accessLevel !== originalPermissions.get(p.database.id)
    );
    setHasChanges(hasAnyChange);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const permissionUpdates = permissions.map((p) => ({
        databaseId: p.database.id,
        accessLevel: p.accessLevel,
      }));

      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permissionUpdates }),
      });

      if (res.ok) {
        const data = await res.json();
        const changeCount = data.changes?.length || 0;
        toast.success(
          changeCount > 0
            ? `Updated ${changeCount} permission${changeCount > 1 ? "s" : ""}`
            : "Permissions saved"
        );

        // Update original permissions
        const newOrigMap = new Map<string, string | null>();
        permissions.forEach((p) => {
          newOrigMap.set(p.database.id, p.accessLevel);
        });
        setOriginalPermissions(newOrigMap);
        setHasChanges(false);

        if (onUpdate) onUpdate();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save permissions");
      }
    } catch (error) {
      console.error("Failed to save permissions", error);
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (userRole === "ADMIN") {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        <div>
          <Badge variant="secondary" className="mb-2 bg-purple-100 text-purple-800">
            Admin
          </Badge>
          <p className="text-muted-foreground">
            Admin users have full access to all databases by default.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No databases configured yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {permissions.map((perm) => (
          <div
            key={perm.database.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{perm.database.name}</p>
                <p className="text-xs text-muted-foreground">
                  {perm.database.engine}
                </p>
              </div>
            </div>

            <Select
              value={perm.accessLevel || "none"}
              onValueChange={(value) =>
                handleAccessLevelChange(perm.database.id, value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue>
                  {perm.accessLevel
                    ? accessLevelLabels[perm.accessLevel]
                    : "No Access"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex flex-col">
                    <span>No Access</span>
                    <span className="text-xs text-muted-foreground">
                      Cannot access this database
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="VIEW">
                  <div className="flex flex-col">
                    <span>{accessLevelLabels.VIEW}</span>
                    <span className="text-xs text-muted-foreground">
                      {accessLevelDescriptions.VIEW}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="QUERY">
                  <div className="flex flex-col">
                    <span>{accessLevelLabels.QUERY}</span>
                    <span className="text-xs text-muted-foreground">
                      {accessLevelDescriptions.QUERY}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="ADMIN">
                  <div className="flex flex-col">
                    <span>{accessLevelLabels.ADMIN}</span>
                    <span className="text-xs text-muted-foreground">
                      {accessLevelDescriptions.ADMIN}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {hasChanges && (
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
