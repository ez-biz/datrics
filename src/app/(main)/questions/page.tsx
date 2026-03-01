"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Plus,
  FileQuestion,
  MoreHorizontal,
  Trash2,
  Archive,
  Clock,
  Database,
  User,
  BarChart3,
  Table,
  LineChart,
  PieChart,
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
import { Skeleton } from "@/components/ui/skeleton";

interface Question {
  id: string;
  name: string;
  description: string | null;
  type: "QUERY_BUILDER" | "NATIVE_SQL";
  vizSettings: { chartType: string } | null;
  databaseId: string;
  creator: { id: string; name: string | null; email: string };
  collection: { id: string; name: string } | null;
  verified: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

const CHART_ICONS: Record<string, typeof BarChart3> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  table: Table,
};

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch("/api/questions");
      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted");
    } catch (error) {
      toast.error("Failed to delete question");
    }
  };

  const archiveQuestion = async (id: string, archived: boolean) => {
    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, archived } : q))
      );
      toast.success(archived ? "Question archived" : "Question restored");
    } catch (error) {
      toast.error("Failed to update question");
    }
  };

  const filteredQuestions = questions.filter(
    (q) =>
      !q.archived &&
      (q.name.toLowerCase().includes(search.toLowerCase()) ||
        q.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const getChartIcon = (vizSettings: { chartType: string } | null) => {
    const type = vizSettings?.chartType || "table";
    return CHART_ICONS[type] || Table;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your saved queries
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/question/new">
            <Plus className="h-4 w-4" />
            New Question
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-sm"
        />
      </div>

      {/* Questions Grid */}
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
      ) : filteredQuestions.length === 0 ? (
        <Card className="py-12">
          <div className="text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No questions yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search
                ? "No questions match your search"
                : "Create your first question to get started"}
            </p>
            {!search && (
              <Button asChild>
                <Link href="/question/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Question
                </Link>
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuestions.map((question) => {
            const ChartIcon = getChartIcon(question.vizSettings);
            return (
              <Card
                key={question.id}
                className="group hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => router.push(`/question/${question.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <ChartIcon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                        {question.name}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveQuestion(question.id, true);
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteQuestion(question.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {question.description && (
                    <CardDescription className="line-clamp-2 text-xs">
                      {question.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(question.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {question.creator.name || question.creator.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {question.type === "NATIVE_SQL" ? "SQL" : "Builder"}
                    </Badge>
                    {question.verified && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-green-500/10 text-green-600"
                      >
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
