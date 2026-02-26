"use client";

import { useState, useEffect } from "react";
import { Database, Plus, Server, Activity, Search } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DatabaseForm } from "@/components/admin/DatabaseForm";
import { Skeleton } from "@/components/ui/skeleton";

interface DatabaseConnection {
  id: string;
  name: string;
  engine: string;
  host: string;
  databaseName: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export default function AdminDatabasesPage() {
  const router = useRouter();
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDatabases = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/databases");
      if (res.ok) {
        const data = await res.json();
        setDatabases(data);
      }
    } catch (error) {
      console.error("Failed to fetch databases", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const filteredDatabases = databases.filter((db) =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Databases</h1>
          <p className="text-muted-foreground mt-1">
            Manage your database connections and schema syncing.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Database
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add a Database Connection</DialogTitle>
              <DialogDescription>
                Connect to a new data source to start analyzing its data.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <DatabaseForm
                onSuccess={() => {
                  setOpen(false);
                  fetchDatabases();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 w-full md:max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground absolute ml-3 pointer-events-none" />
        <Input
          placeholder="Filter databases..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Database className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium">No databases found</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto mb-6">
            {searchQuery
              ? "No databases match your search query."
              : "You haven't connected any databases yet. Add your first connection to start analyzing data."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setOpen(true)}>Add Database</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatabases.map((db) => (
            <Card
              key={db.id}
              className="group hover:border-primary/50 transition-all cursor-pointer flex flex-col"
              onClick={() => router.push(`/admin/databases/${db.id}`)}
            >
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    {db.name}
                  </CardTitle>
                  <CardDescription className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {db.engine}
                    </Badge>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Server className="h-4 w-4" />
                    <span className="truncate">
                      {db.engine === "SQLITE" ? db.databaseName : `${db.host}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      {db.lastSyncedAt
                        ? `Synced ${formatDistanceToNow(new Date(db.lastSyncedAt), {
                            addSuffix: true,
                          })}`
                        : "Never synced"}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Schema
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
