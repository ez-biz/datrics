"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatabaseForm } from "@/components/admin/DatabaseForm";
import {
  CheckCircle2,
  Database,
  Loader2,
  Rocket,
  ArrowRight,
  PlusCircle,
  Terminal,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  { label: "Welcome", icon: Sparkles },
  { label: "Connect", icon: Database },
  { label: "Sync", icon: Loader2 },
  { label: "Ready", icon: Rocket },
];

export function OnboardingWizard({ open, onClose }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [createdDbId, setCreatedDbId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const markCompleted = useCallback(async () => {
    try {
      await fetch("/api/onboarding", { method: "PUT" });
    } catch {
      // Non-critical — wizard just won't be suppressed next time
    }
  }, []);

  const handleDismiss = useCallback(async () => {
    await markCompleted();
    onClose();
  }, [markCompleted, onClose]);

  // Step 2: auto-sync when advancing
  useEffect(() => {
    if (step === 2 && createdDbId && !syncing && !syncDone) {
      setSyncing(true);
      setSyncError(null);

      fetch(`/api/databases/${createdDbId}/sync`, { method: "POST" })
        .then((res) => {
          if (!res.ok) throw new Error("Sync failed");
          setSyncDone(true);
        })
        .catch((err) => {
          setSyncError(err.message || "Failed to sync schema");
        })
        .finally(() => setSyncing(false));
    }
  }, [step, createdDbId, syncing, syncDone]);

  const handleDbCreated = (db?: { id: string }) => {
    if (db?.id) {
      setCreatedDbId(db.id);
      setStep(2);
    }
  };

  const handleFinish = async () => {
    await markCompleted();
    onClose();
    router.push("/question/new");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleDismiss()}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        {/* Header with dismiss */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <DialogHeader className="text-left space-y-0">
            <DialogTitle className="text-lg">
              {STEPS[step].label}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-1 px-6 pb-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors shrink-0",
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1.5 rounded transition-colors",
                    i < step ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 pb-6">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && <ConnectStep onDbCreated={handleDbCreated} />}
          {step === 2 && (
            <SyncStep
              syncing={syncing}
              syncDone={syncDone}
              syncError={syncError}
              onNext={() => setStep(3)}
              onRetry={() => {
                setSyncDone(false);
                setSyncing(false);
                setSyncError(null);
              }}
            />
          )}
          {step === 3 && <ReadyStep onFinish={handleFinish} onDismiss={handleDismiss} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Logo size={48} />
        <span className="text-3xl font-bold tracking-tight">Datrics</span>
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-semibold">Welcome to Datrics!</h2>
        <p className="text-muted-foreground text-sm">
          Let&apos;s get you set up in just a few steps. You&apos;ll connect your first
          database and be ready to explore your data in minutes.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-md text-center">
        <div className="p-3 rounded-lg border bg-card">
          <Database className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
          <p className="text-xs font-medium">Connect</p>
          <p className="text-[10px] text-muted-foreground">Your database</p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <PlusCircle className="h-5 w-5 mx-auto mb-2 text-blue-500" />
          <p className="text-xs font-medium">Build</p>
          <p className="text-[10px] text-muted-foreground">Visual queries</p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <Terminal className="h-5 w-5 mx-auto mb-2 text-orange-500" />
          <p className="text-xs font-medium">Write</p>
          <p className="text-[10px] text-muted-foreground">Raw SQL</p>
        </div>
      </div>

      <Button onClick={onNext} className="gap-2">
        Let&apos;s get started <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ConnectStep({
  onDbCreated,
}: {
  onDbCreated: (db?: { id: string }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1 pb-2">
        <h2 className="text-base font-semibold">Connect your database</h2>
        <p className="text-sm text-muted-foreground">
          PostgreSQL, MySQL, or SQLite — we&apos;ll auto-detect the schema.
        </p>
      </div>
      <div className="max-h-[400px] overflow-y-auto pr-1">
        <DatabaseForm onSuccess={onDbCreated} />
      </div>
    </div>
  );
}

function SyncStep({
  syncing,
  syncDone,
  syncError,
  onNext,
  onRetry,
}: {
  syncing: boolean;
  syncDone: boolean;
  syncError: string | null;
  onNext: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 space-y-6">
      {syncing && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Syncing schema...</h2>
            <p className="text-sm text-muted-foreground">
              Discovering tables and columns in your database.
            </p>
          </div>
        </>
      )}

      {syncDone && (
        <>
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Schema synced!</h2>
            <p className="text-sm text-muted-foreground">
              Your database tables and columns are ready to explore.
            </p>
          </div>
          <Button onClick={onNext} className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {syncError && (
        <>
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Sync failed</h2>
            <p className="text-sm text-muted-foreground">{syncError}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
            <Button onClick={onNext}>Skip</Button>
          </div>
        </>
      )}
    </div>
  );
}

function ReadyStep({
  onFinish,
  onDismiss,
}: {
  onFinish: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 space-y-6">
      <Rocket className="h-12 w-12 text-primary" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">You&apos;re all set!</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your database is connected and ready. Start exploring your data
          by creating your first question.
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={onFinish} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Create a Question
        </Button>
        <Button variant="outline" onClick={onDismiss}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
