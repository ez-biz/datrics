import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SqlEditorDraft {
  databaseId: string;
  sql: string;
  sidebarOpen: boolean;
}

interface SqlEditorState extends SqlEditorDraft {
  setDatabaseId: (id: string) => void;
  setSql: (sql: string) => void;
  setSidebarOpen: (open: boolean) => void;
  reset: () => void;
}

const initialState: SqlEditorDraft = {
  databaseId: "",
  sql: "SELECT 1;",
  sidebarOpen: true,
};

export const useSqlEditorStore = create<SqlEditorState>()(
  persist(
    (set) => ({
      ...initialState,

      setDatabaseId: (id) => set({ databaseId: id }),
      setSql: (sql) => set({ sql }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      reset: () => set(initialState),
    }),
    {
      name: "sql-editor-draft",
    }
  )
);
