"use client";

import { useState, useEffect } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  name: string;
  shortcuts: Shortcut[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open global search" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["G", "H"], description: "Go to Home" },
      { keys: ["G", "Q"], description: "Go to Questions" },
      { keys: ["G", "D"], description: "Go to Dashboards" },
      { keys: ["G", "C"], description: "Go to Collections" },
      { keys: ["G", "S"], description: "Go to SQL Editor" },
      { keys: ["G", "N"], description: "New Question" },
    ],
  },
  {
    name: "Query Builder",
    shortcuts: [
      { keys: ["⌘", "Enter"], description: "Run query" },
      { keys: ["⌘", "S"], description: "Save question" },
    ],
  },
  {
    name: "SQL Editor",
    shortcuts: [
      { keys: ["⌘", "Enter"], description: "Execute SQL" },
      { keys: ["⌘", "S"], description: "Save as question" },
      { keys: ["⌘", "/"], description: "Toggle comment" },
    ],
  },
  {
    name: "Dashboard",
    shortcuts: [
      { keys: ["E"], description: "Toggle edit mode" },
      { keys: ["Esc"], description: "Exit edit mode" },
    ],
  },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      // Open shortcuts dialog on "?"
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to navigate faster.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
            {shortcutGroups.map((group) => (
              <div key={group.name}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {group.name}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs font-medium"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Press <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">?</kbd> anywhere to show this dialog
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
