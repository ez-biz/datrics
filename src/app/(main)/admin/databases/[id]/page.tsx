"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { 
  Database, Server, RefreshCw, Key, Type, DatabaseZap, ListTree, ArrowLeft, Trash2 
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SchemaGraph, SchemaTable, SchemaColumn } from "@/lib/query-engine/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DbDetails {
  id: string;
  name: string;
  engine: string;
  host: string;
  port: number;
  databaseName: string;
  schemaCache: string | null;
  lastSyncedAt: string | null;
}

export default function DatabaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [db, setDb] = useState<DbDetails | null>(null);
  const [schema, setSchema] = useState<SchemaGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<SchemaTable | null>(null);

  const fetchDb = async () => {
    try {
      const res = await fetch(`/api/databases/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setDb(data);
        if (data.schemaCache) {
          try {
            const parsed = JSON.parse(data.schemaCache);
            setSchema(parsed);
            if (parsed.tables && parsed.tables.length > 0) {
              setSelectedTable(parsed.tables[0]);
            }
          } catch (e) {
            console.error("Failed to parse schema cache");
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDb();
  }, [params.id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/databases/${params.id}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success("Schema synced successfully!");
        await fetchDb(); // Refetch to get the updated schema
      } else {
        toast.error(data.error || "Failed to sync schema");
      }
    } catch (error) {
      toast.error("Network error during sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this connection? Questions and dashboards relying on it will break.")) return;
    
    try {
      const res = await fetch(`/api/databases/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Database removed");
        router.push("/admin/databases");
      }
    } catch (error) {
      toast.error("Failed to delete database");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="max-w-6xl mx-auto text-center py-24">
        <h2 className="text-2xl font-bold">Database not found</h2>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/databases">Back to Databases</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-8 w-8">
            <Link href="/admin/databases">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{db.name}</h1>
              <Badge variant="outline">{db.engine}</Badge>
            </div>
            <div className="flex items-center text-sm text-muted-foreground mt-1 gap-4">
              <span className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" />
                {db.engine === "SQLITE" ? db.databaseName : `${db.host}:${db.port}/${db.databaseName}`}
              </span>
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {db.lastSyncedAt 
                  ? `Synced ${formatDistanceToNow(new Date(db.lastSyncedAt), { addSuffix: true })}` 
                  : "Never synced"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Schema
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {!schema ? (
        <Card className="flex-1 flex flex-col items-center justify-center border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <DatabaseZap className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No schema available</h3>
            <p className="max-w-md mb-6">
              This database hasn&apos;t been synced yet. Sync the schema to introspect its tables and columns so you can build queries.
            </p>
            <Button onClick={handleSync} disabled={syncing} size="lg">
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync Schema Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          {/* Tables Sidebar */}
          <Card className="w-64 flex flex-col overflow-hidden shrink-0">
            <CardHeader className="py-3 px-4 border-b bg-muted/40 shrink-0">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ListTree className="h-4 w-4" />
                Tables ({schema.tables.length})
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {schema.tables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => setSelectedTable(table)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedTable?.name === table.name 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="truncate">{table.name}</span>
                      <span className={`text-[10px] ${selectedTable?.name === table.name ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {table.columns.length} cols
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Table Details */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {selectedTable ? (
              <>
                <CardHeader className="py-4 border-b shrink-0 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      {selectedTable.schema ? `${selectedTable.schema}.${selectedTable.name}` : selectedTable.name}
                    </CardTitle>
                    <CardDescription>
                      {selectedTable.columns.length} columns defined in schema
                    </CardDescription>
                  </div>
                </CardHeader>
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[200px]">Column</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Constraints</TableHead>
                        <TableHead className="text-right">Default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTable.columns.map((col) => (
                        <TableRow key={col.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {col.isPrimaryKey ? (
                                <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              ) : (
                                <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              {col.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {col.rawType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {col.isPrimaryKey && <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/30">PK</Badge>}
                              {!col.nullable && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/30">NOT NULL</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground font-mono text-xs">
                            {col.defaultValue ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <ListTree className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a table to view its schema</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
