"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useRef, useCallback, useEffect } from "react";
import type { editor } from "monaco-editor";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg border border-dashed">
      <div className="text-muted-foreground text-sm">Loading SQL Editor...</div>
    </div>
  ),
});

export interface SchemaColumn {
  name: string;
  type: string;
  rawType?: string;
  isPrimaryKey?: boolean;
  nullable?: boolean;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  height?: string;
  schema?: SchemaTable[];
  databaseName?: string;
}

// SQL keywords for autocomplete
const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN",
  "IS", "NULL", "AS", "ORDER", "BY", "ASC", "DESC", "LIMIT", "OFFSET",
  "GROUP", "HAVING", "JOIN", "INNER", "LEFT", "RIGHT", "OUTER", "ON",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE",
  "TABLE", "INDEX", "DROP", "ALTER", "ADD", "COLUMN", "PRIMARY", "KEY",
  "FOREIGN", "REFERENCES", "UNIQUE", "DEFAULT", "CONSTRAINT", "CASCADE",
  "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX", "CASE", "WHEN", "THEN",
  "ELSE", "END", "UNION", "ALL", "EXISTS", "ANY", "COALESCE", "NULLIF",
  "CAST", "CONVERT", "DATE", "TIME", "TIMESTAMP", "INTERVAL", "EXTRACT",
  "WITH", "RECURSIVE", "OVER", "PARTITION", "ROW_NUMBER", "RANK",
  "DENSE_RANK", "LAG", "LEAD", "FIRST_VALUE", "LAST_VALUE",
  "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP",
];

const SQL_FUNCTIONS = [
  { name: "COUNT", signature: "COUNT(expression)", description: "Count rows" },
  { name: "SUM", signature: "SUM(expression)", description: "Sum of values" },
  { name: "AVG", signature: "AVG(expression)", description: "Average of values" },
  { name: "MIN", signature: "MIN(expression)", description: "Minimum value" },
  { name: "MAX", signature: "MAX(expression)", description: "Maximum value" },
  { name: "COALESCE", signature: "COALESCE(val1, val2, ...)", description: "Return first non-null value" },
  { name: "NULLIF", signature: "NULLIF(val1, val2)", description: "Return null if values are equal" },
  { name: "CAST", signature: "CAST(expression AS type)", description: "Convert to specified type" },
  { name: "CONCAT", signature: "CONCAT(str1, str2, ...)", description: "Concatenate strings" },
  { name: "SUBSTRING", signature: "SUBSTRING(str, start, length)", description: "Extract substring" },
  { name: "UPPER", signature: "UPPER(str)", description: "Convert to uppercase" },
  { name: "LOWER", signature: "LOWER(str)", description: "Convert to lowercase" },
  { name: "TRIM", signature: "TRIM(str)", description: "Remove leading/trailing spaces" },
  { name: "LENGTH", signature: "LENGTH(str)", description: "String length" },
  { name: "ROUND", signature: "ROUND(num, decimals)", description: "Round number" },
  { name: "ABS", signature: "ABS(num)", description: "Absolute value" },
  { name: "DATE", signature: "DATE(expression)", description: "Extract date" },
  { name: "NOW", signature: "NOW()", description: "Current timestamp" },
  { name: "DATE_TRUNC", signature: "DATE_TRUNC(unit, date)", description: "Truncate date to unit" },
];

export function SqlEditor({
  value,
  onChange,
  onRun,
  height = "300px",
  schema = [],
  databaseName,
}: SqlEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null);

  // Register custom completion provider when schema changes
  useEffect(() => {
    if (!monacoRef.current || !editorRef.current) return;

    const monaco = monacoRef.current;

    // Dispose previous provider
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }

    // Register new completion provider
    completionProviderRef.current = monaco.languages.registerCompletionItemProvider("sql", {
      triggerCharacters: [".", " ", "("],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const textBeforeCursor = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const suggestions: import("monaco-editor").languages.CompletionItem[] = [];

        // Check if after a table name (for column suggestions)
        const tableMatch = textBeforeCursor.match(/(\w+)\.\s*$/);
        if (tableMatch) {
          const tableName = tableMatch[1].toLowerCase();
          const table = schema.find((t) => t.name.toLowerCase() === tableName);
          if (table) {
            table.columns.forEach((col) => {
              suggestions.push({
                label: col.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                detail: col.type,
                documentation: `Column: ${col.name} (${col.type})`,
                range,
              });
            });
            return { suggestions };
          }
        }

        // Check if after FROM/JOIN for table suggestions
        const afterFromJoin = /(?:FROM|JOIN)\s+\w*$/i.test(textBeforeCursor);
        if (afterFromJoin || schema.length > 0) {
          schema.forEach((table) => {
            suggestions.push({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table.name,
              detail: `Table (${table.columns.length} columns)`,
              documentation: `Columns: ${table.columns.map((c) => c.name).join(", ")}`,
              range,
            });
          });
        }

        // Add SQL keywords
        SQL_KEYWORDS.forEach((keyword) => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          });
        });

        // Add SQL functions
        SQL_FUNCTIONS.forEach((fn) => {
          suggestions.push({
            label: fn.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: fn.name + "($0)",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: fn.signature,
            documentation: fn.description,
            range,
          });
        });

        // Add column suggestions from all tables (for SELECT)
        schema.forEach((table) => {
          table.columns.forEach((col) => {
            suggestions.push({
              label: `${table.name}.${col.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `${table.name}.${col.name}`,
              detail: col.type,
              documentation: `${table.name}.${col.name} (${col.type})`,
              range,
            });
          });
        });

        return { suggestions };
      },
    });

    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, [schema]);

  const handleMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Register Ctrl+Enter / Cmd+Enter keyboard shortcut
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRun();
      });

      // Register Ctrl+Shift+F / Cmd+Shift+F for format (will be handled externally)
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        () => {
          // Formatting will be triggered from parent
          const formatEvent = new CustomEvent("sql-format-requested");
          window.dispatchEvent(formatEvent);
        }
      );

      editor.focus();
    },
    [onRun]
  );

  // Method to format SQL - can be called from parent
  const formatSql = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument")?.run();
    }
  }, []);

  // Method to insert text at cursor
  const insertText = useCallback((text: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("insert", [
          {
            range: selection,
            text: text,
            forceMoveMarkers: true,
          },
        ]);
        editor.focus();
      }
    }
  }, []);

  // Expose methods via ref
  useEffect(() => {
    (window as unknown as { sqlEditorApi?: { formatSql: () => void; insertText: (text: string) => void } }).sqlEditorApi = {
      formatSql,
      insertText,
    };
    return () => {
      delete (window as unknown as { sqlEditorApi?: unknown }).sqlEditorApi;
    };
  }, [formatSql, insertText]);

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
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "line",
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
          suggest: {
            showKeywords: true,
            showFunctions: true,
            showFields: true,
            preview: true,
            filterGraceful: true,
          },
        }}
      />
    </div>
  );
}
