"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useRef, useCallback } from "react";

// Dynamically import Monaco to avoid SSR issues (adds ~2 MB to client)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg border border-dashed">
      <div className="text-muted-foreground text-sm">Loading SQL Editor…</div>
    </div>
  ),
});

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  height?: string;
}

export function SqlEditor({
  value,
  onChange,
  onRun,
  height = "300px",
}: SqlEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<unknown>(null);

  const handleMount = useCallback(
    (editor: unknown) => {
      editorRef.current = editor;

      // Register Ctrl+Enter / Cmd+Enter keyboard shortcut
      const monacoEditor = editor as {
        addCommand: (keybinding: number, handler: () => void) => void;
        focus: () => void;
      };
      // KeyMod.CtrlCmd | KeyCode.Enter = 2048 + 3 = 2051
      monacoEditor.addCommand(2051, () => {
        onRun();
      });

      monacoEditor.focus();
    },
    [onRun],
  );

  return (
    <div className="rounded-lg border overflow-hidden">
      <MonacoEditor
        height={height}
        language="sql"
        theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
        value={value}
        onChange={(val) => onChange(val || "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "line",
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
        }}
      />
    </div>
  );
}
