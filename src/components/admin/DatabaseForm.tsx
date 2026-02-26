"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  engine: z.enum(["POSTGRESQL", "MYSQL", "SQLITE"]),
  host: z.string().min(1, "Host is required."),
  port: z.number().min(0, "Port must be a valid number."),
  databaseName: z.string().min(1, "Database name or path is required."),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean(),
});

type DatabaseFormValues = z.infer<typeof formSchema>;

interface DatabaseFormProps {
  onSuccess?: () => void;
}

export function DatabaseForm({ onSuccess }: DatabaseFormProps) {
  const router = useRouter();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  const form = useForm<DatabaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      engine: "POSTGRESQL",
      host: "localhost",
      port: 5432,
      databaseName: "",
      username: "",
      password: "",
      ssl: false,
    },
  });

  const engine = form.watch("engine");

  // Adjust default ports based on engine
  const handleEngineChange = (val: string) => {
    const nextEngine = val as "POSTGRESQL" | "MYSQL" | "SQLITE";
    form.setValue("engine", nextEngine);
    if (nextEngine === "POSTGRESQL") form.setValue("port", 5432);
    if (nextEngine === "MYSQL") form.setValue("port", 3306);
    if (nextEngine === "SQLITE") {
      form.setValue("host", "localhost");
      form.setValue("port", 0);
      form.setValue("username", "sqlite");
      form.setValue("password", "sqlite");
    }
  };

  const handleTestConnection = async () => {
    const values = form.getValues();
    // Basic validation before testing
    if (
      !values.engine ||
      !values.host ||
      !values.databaseName ||
      !values.username ||
      !values.password
    ) {
      toast.error("Please fill in all required fields to test the connection.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/databases/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({ success: true, message: "Connection successful!" });
        toast.success("Connection successful!");
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection failed",
        });
        toast.error(data.error || "Connection failed");
      }
    } catch (_err) {
      setTestResult({ success: false, message: "Network error occurred." });
      toast.error("Network error occurred.");
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (values: DatabaseFormValues) => {
    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save database");
      }

      toast.success("Database connection saved!");
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Production Analytics DB" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="engine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Database Engine</FormLabel>
                <Select
                  onValueChange={handleEngineChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an engine" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="POSTGRESQL">PostgreSQL</SelectItem>
                    <SelectItem value="MYSQL">MySQL / MariaDB</SelectItem>
                    <SelectItem value="SQLITE">SQLite</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="databaseName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {engine === "SQLITE" ? "File Path" : "Database Name"}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      engine === "SQLITE"
                        ? "/path/to/database.db"
                        : "e.g. postgres"
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {engine !== "SQLITE" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host</FormLabel>
                  <FormControl>
                    <Input placeholder="localhost or cluster URL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {engine !== "SQLITE" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. postgres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {engine !== "SQLITE" && (
          <FormField
            control={form.control}
            name="ssl"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Use SSL</FormLabel>
                  <FormDescription>
                    Connect using an encrypted SSL connection
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {testResult && (
          <div
            className={`p-3 rounded-md flex items-start gap-3 text-sm border ${
              testResult.success
                ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0" />
            )}
            <div className="whitespace-pre-wrap font-mono text-xs mt-0.5">
              {testResult.message}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Test Connection
          </Button>

          <Button
            type="submit"
            disabled={form.formState.isSubmitting || isTesting}
          >
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Database
          </Button>
        </div>
      </form>
    </Form>
  );
}
