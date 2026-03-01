import { create } from "zustand";
import { SchemaGraph, SchemaColumn, SchemaTable } from "@/lib/query-engine/types";

interface SchemaStoreState {
  schemas: Record<string, SchemaGraph>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;

  fetchSchema: (databaseId: string) => Promise<SchemaGraph | null>;
  getSchema: (databaseId: string) => SchemaGraph | null;
  getTable: (databaseId: string, tableName: string) => SchemaTable | null;
  getTableColumns: (databaseId: string, tableName: string) => SchemaColumn[];
  invalidate: (databaseId: string) => void;
  isLoading: (databaseId: string) => boolean;
}

export const useSchemaStore = create<SchemaStoreState>((set, get) => ({
  schemas: {},
  loading: {},
  errors: {},

  fetchSchema: async (databaseId: string) => {
    const state = get();

    // Return cached if available
    if (state.schemas[databaseId]) {
      return state.schemas[databaseId];
    }

    // Already fetching
    if (state.loading[databaseId]) {
      // Wait for existing fetch
      return new Promise((resolve) => {
        const checkLoading = setInterval(() => {
          const currentState = get();
          if (!currentState.loading[databaseId]) {
            clearInterval(checkLoading);
            resolve(currentState.schemas[databaseId] || null);
          }
        }, 50);
      });
    }

    // Start loading
    set((s) => ({
      loading: { ...s.loading, [databaseId]: true },
      errors: { ...s.errors, [databaseId]: "" },
    }));

    try {
      const response = await fetch(`/api/databases/${databaseId}`);
      const data = await response.json();

      if (data.schemaCache) {
        const parsed: SchemaGraph = JSON.parse(data.schemaCache);
        set((s) => ({
          schemas: { ...s.schemas, [databaseId]: parsed },
          loading: { ...s.loading, [databaseId]: false },
        }));
        return parsed;
      }

      set((s) => ({
        loading: { ...s.loading, [databaseId]: false },
        errors: { ...s.errors, [databaseId]: "No schema cache available" },
      }));
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch schema";
      set((s) => ({
        loading: { ...s.loading, [databaseId]: false },
        errors: { ...s.errors, [databaseId]: message },
      }));
      return null;
    }
  },

  getSchema: (databaseId: string) => {
    return get().schemas[databaseId] || null;
  },

  getTable: (databaseId: string, tableName: string) => {
    const schema = get().schemas[databaseId];
    if (!schema) return null;
    return schema.tables.find((t) => t.name === tableName) || null;
  },

  getTableColumns: (databaseId: string, tableName: string) => {
    const table = get().getTable(databaseId, tableName);
    return table?.columns || [];
  },

  invalidate: (databaseId: string) => {
    set((s) => {
      const { [databaseId]: _, ...rest } = s.schemas;
      return { schemas: rest };
    });
  },

  isLoading: (databaseId: string) => {
    return get().loading[databaseId] || false;
  },
}));
