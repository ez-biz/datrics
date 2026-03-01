import { create } from "zustand";
import {
  AbstractQuery,
  FilterCondition,
  FilterGroup,
  AggregateColumn,
  SortClause,
  JoinClause,
  HavingCondition,
} from "@/lib/query-engine/types";

interface QueryBuilderState {
  databaseId: string;
  sourceTable: string;
  sourceSchema?: string;
  columns: { table?: string; column: string; alias?: string }[];
  joins: JoinClause[];
  filters: FilterGroup;
  aggregations: AggregateColumn[];
  groupBy: { table?: string; column: string }[];
  having: HavingCondition[];
  orderBy: SortClause[];
  limit?: number;

  // Actions
  setDatabaseId: (id: string) => void;
  setSourceTable: (table: string, schema?: string) => void;
  toggleColumn: (column: string, table?: string) => void;
  selectAllColumns: (columns: string[], table?: string) => void;
  clearColumns: () => void;

  setFilters: (filters: FilterGroup) => void;
  addFilter: (condition: FilterCondition) => void;
  removeFilter: (index: number) => void;
  updateFilter: (index: number, condition: FilterCondition) => void;
  toggleFilterLogic: () => void;
  addFilterGroup: () => void;
  updateFilterAt: (path: number[], item: FilterCondition | FilterGroup) => void;
  removeFilterAt: (path: number[]) => void;

  setAggregations: (aggregations: AggregateColumn[]) => void;
  addAggregation: (aggregation: AggregateColumn) => void;
  removeAggregation: (index: number) => void;

  setGroupBy: (groupBy: { table?: string; column: string }[]) => void;
  addGroupBy: (group: { table?: string; column: string }) => void;
  removeGroupBy: (index: number) => void;

  addHaving: (condition: HavingCondition) => void;
  removeHaving: (index: number) => void;
  updateHaving: (index: number, condition: HavingCondition) => void;

  setOrderBy: (orderBy: SortClause[]) => void;
  addOrderBy: (sort: SortClause) => void;
  removeOrderBy: (index: number) => void;

  setLimit: (limit: number | undefined) => void;

  reset: () => void;
  toAbstractQuery: () => AbstractQuery;
}

const initialState = {
  databaseId: "",
  sourceTable: "",
  sourceSchema: undefined,
  columns: [],
  joins: [],
  filters: { logic: "AND" as const, conditions: [] },
  aggregations: [],
  groupBy: [],
  having: [] as HavingCondition[],
  orderBy: [],
  limit: 2000,
};

// Helper to update nested filter at a path
function updateAtPath(
  group: FilterGroup,
  path: number[],
  updater: (items: (FilterCondition | FilterGroup)[]) => (FilterCondition | FilterGroup)[]
): FilterGroup {
  if (path.length === 0) {
    return { ...group, conditions: updater(group.conditions) };
  }

  const [head, ...rest] = path;
  const newConditions = [...group.conditions];
  const target = newConditions[head];

  if ("logic" in target) {
    newConditions[head] = updateAtPath(target as FilterGroup, rest, updater);
  }

  return { ...group, conditions: newConditions };
}

export const useQueryBuilderStore = create<QueryBuilderState>((set, get) => ({
  ...initialState,

  setDatabaseId: (id) =>
    set({
      ...initialState, // Reset everything when DB changes
      databaseId: id,
    }),

  setSourceTable: (table, schema) =>
    set({
      sourceTable: table,
      sourceSchema: schema,
      columns: [],
      filters: { logic: "AND", conditions: [] },
      aggregations: [],
      groupBy: [],
      having: [],
      orderBy: [],
    }),

  toggleColumn: (column, table) =>
    set((state) => {
      const exists = state.columns.find(
        (c) => c.column === column && c.table === table
      );
      if (exists) {
        return {
          columns: state.columns.filter((c) => c !== exists),
        };
      }
      return {
        columns: [...state.columns, { column, table }],
      };
    }),

  selectAllColumns: (columns, table) =>
    set(() => ({
      columns: columns.map((column) => ({ column, table })),
    })),

  clearColumns: () => set({ columns: [] }),

  setFilters: (filters) => set({ filters }),

  addFilter: (condition) =>
    set((state) => ({
      filters: {
        ...state.filters,
        conditions: [...state.filters.conditions, condition],
      },
    })),

  removeFilter: (index) =>
    set((state) => {
      const newConditions = [...state.filters.conditions];
      newConditions.splice(index, 1);
      return { filters: { ...state.filters, conditions: newConditions } };
    }),

  updateFilter: (index, condition) =>
    set((state) => {
      const newConditions = [...state.filters.conditions];
      newConditions[index] = condition;
      return { filters: { ...state.filters, conditions: newConditions } };
    }),

  toggleFilterLogic: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        logic: state.filters.logic === "AND" ? "OR" : "AND",
      },
    })),

  addFilterGroup: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        conditions: [
          ...state.filters.conditions,
          { logic: "AND" as const, conditions: [] },
        ],
      },
    })),

  updateFilterAt: (path, item) =>
    set((state) => {
      if (path.length === 0) return state;
      const parentPath = path.slice(0, -1);
      const index = path[path.length - 1];
      return {
        filters: updateAtPath(state.filters, parentPath, (items) => {
          const newItems = [...items];
          newItems[index] = item;
          return newItems;
        }),
      };
    }),

  removeFilterAt: (path) =>
    set((state) => {
      if (path.length === 0) return state;
      const parentPath = path.slice(0, -1);
      const index = path[path.length - 1];
      return {
        filters: updateAtPath(state.filters, parentPath, (items) => {
          const newItems = [...items];
          newItems.splice(index, 1);
          return newItems;
        }),
      };
    }),

  setAggregations: (aggregations) => set({ aggregations }),

  addAggregation: (aggregation) =>
    set((state) => ({ aggregations: [...state.aggregations, aggregation] })),

  removeAggregation: (index) =>
    set((state) => {
      const newAggs = [...state.aggregations];
      newAggs.splice(index, 1);
      return { aggregations: newAggs };
    }),

  setGroupBy: (groupBy) => set({ groupBy }),

  addGroupBy: (group) =>
    set((state) => ({ groupBy: [...state.groupBy, group] })),

  removeGroupBy: (index) =>
    set((state) => {
      const newGroups = [...state.groupBy];
      newGroups.splice(index, 1);
      return { groupBy: newGroups };
    }),

  addHaving: (condition) =>
    set((state) => ({ having: [...state.having, condition] })),

  removeHaving: (index) =>
    set((state) => {
      const newHaving = [...state.having];
      newHaving.splice(index, 1);
      return { having: newHaving };
    }),

  updateHaving: (index, condition) =>
    set((state) => {
      const newHaving = [...state.having];
      newHaving[index] = condition;
      return { having: newHaving };
    }),

  setOrderBy: (orderBy) => set({ orderBy }),

  addOrderBy: (sort) =>
    set((state) => ({ orderBy: [...state.orderBy, sort] })),

  removeOrderBy: (index) =>
    set((state) => {
      const newSorts = [...state.orderBy];
      newSorts.splice(index, 1);
      return { orderBy: newSorts };
    }),

  setLimit: (limit) => set({ limit }),

  reset: () => set(initialState),

  toAbstractQuery: () => {
    const state = get();
    return {
      sourceTable: state.sourceTable,
      sourceSchema: state.sourceSchema,
      columns: state.columns,
      joins: state.joins,
      filters: state.filters.conditions.length > 0 ? state.filters : undefined,
      aggregations: state.aggregations,
      groupBy: state.groupBy,
      having: state.having.length > 0 ? state.having : undefined,
      orderBy: state.orderBy,
      limit: state.limit,
    };
  },
}));
