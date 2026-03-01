import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SqlHistoryEntry {
  id: string;
  sql: string;
  databaseId: string;
  databaseName: string;
  executedAt: string;
  executionTimeMs?: number;
  rowCount?: number;
  error?: string;
}

interface SqlHistoryState {
  history: SqlHistoryEntry[];
  maxEntries: number;

  addEntry: (entry: Omit<SqlHistoryEntry, "id" | "executedAt">) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  getRecentQueries: (databaseId?: string, limit?: number) => SqlHistoryEntry[];
}

export const useSqlHistoryStore = create<SqlHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      maxEntries: 100,

      addEntry: (entry) =>
        set((state) => {
          const newEntry: SqlHistoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
            executedAt: new Date().toISOString(),
          };

          // Remove duplicates (same SQL for same database)
          const filtered = state.history.filter(
            (h) => !(h.sql === entry.sql && h.databaseId === entry.databaseId)
          );

          // Add new entry at the beginning, trim to max
          const updated = [newEntry, ...filtered].slice(0, state.maxEntries);

          return { history: updated };
        }),

      removeEntry: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      getRecentQueries: (databaseId, limit = 20) => {
        const state = get();
        let entries = state.history;

        if (databaseId) {
          entries = entries.filter((h) => h.databaseId === databaseId);
        }

        return entries.slice(0, limit);
      },
    }),
    {
      name: "sql-history",
    }
  )
);
