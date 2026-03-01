"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function GlobalKeyboardHandler() {
  const router = useRouter();
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      // Skip if modifier keys are pressed (except for specific shortcuts)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const now = Date.now();
      const key = e.key.toLowerCase();

      // Check for two-key sequences (G + letter)
      if (lastKeyRef.current === "g" && now - lastKeyTimeRef.current < 500) {
        switch (key) {
          case "h":
            e.preventDefault();
            router.push("/");
            break;
          case "q":
            e.preventDefault();
            router.push("/questions");
            break;
          case "d":
            e.preventDefault();
            router.push("/dashboards");
            break;
          case "c":
            e.preventDefault();
            router.push("/collections");
            break;
          case "s":
            e.preventDefault();
            router.push("/sql");
            break;
          case "n":
            e.preventDefault();
            router.push("/question/new");
            break;
        }
        lastKeyRef.current = null;
        return;
      }

      // Store the current key for sequence detection
      lastKeyRef.current = key;
      lastKeyTimeRef.current = now;
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // This component doesn't render anything
  return null;
}
