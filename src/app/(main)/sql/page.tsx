"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function SqlRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", "sql");
    const edit = searchParams.get("edit");
    if (edit) params.set("edit", edit);
    router.replace(`/question/new?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function SqlPage() {
  return (
    <Suspense>
      <SqlRedirect />
    </Suspense>
  );
}
