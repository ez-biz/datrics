import { create } from "zustand";
import {
  AbstractQuery,
  FilterCondition,
  FilterGroup,
  AggregateColumn,
  SortClause,
  JoinClause,
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

  setAggregations: (aggregations: AggregateColumn[]) => void;
  addAggregation: (aggregation: AggregateColumn) => void;
  removeAggregation: (index: number) => void;

  setGroupBy: (groupBy: { table?: string; column: string }[]) => void;
  addGroupBy: (group: { table?: string; column: string }) => void;
  removeGroupBy: (index: number) => void;

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
  orderBy: [],
  limit: 2000,
};

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
      columns: [], // Clear columns when table changes
      filters: { logic: "AND", conditions: [] },
      aggregations: [],
      groupBy: [],
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
      orderBy: state.orderBy,
      limit: state.limit,
    };
  },
}));
