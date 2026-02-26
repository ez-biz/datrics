export type DBEngine = "POSTGRESQL" | "MYSQL" | "SQLITE" | "MSSQL";

export type ColumnType = "string" | "number" | "boolean" | "date" | "unknown";

export interface SchemaColumn {
  name: string;
  type: string;
  rawType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface SchemaTable {
  name: string;
  schema?: string;
  columns: SchemaColumn[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  rowCount?: number;
}

export interface SchemaGraph {
  tables: SchemaTable[];
  engine: DBEngine;
  databaseName: string;
  introspectedAt: string;
}

// Abstract Query Representation (AQR)
export type FilterOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_null"
  | "is_not_null"
  | "between"
  | "in";

export interface FilterCondition {
  column: string;
  table?: string;
  operator: FilterOperator;
  value?: string | number | boolean | null;
  value2?: string | number;  // for "between"
}

export interface FilterGroup {
  logic: "AND" | "OR";
  conditions: (FilterCondition | FilterGroup)[];
}

export type AggregateFunction = "count" | "sum" | "avg" | "min" | "max" | "count_distinct";

export interface AggregateColumn {
  column: string;
  table?: string;
  fn: AggregateFunction;
  alias?: string;
}

export interface SortClause {
  column: string;
  table?: string;
  direction: "ASC" | "DESC";
}

export interface JoinClause {
  table: string;
  type: "inner" | "left" | "right";
  on: {
    sourceColumn: string;
    targetColumn: string;
  };
}

export interface AbstractQuery {
  sourceTable: string;
  sourceSchema?: string;
  columns: { table?: string; column: string; alias?: string }[];
  joins: JoinClause[];
  filters?: FilterGroup;
  aggregations: AggregateColumn[];
  groupBy: { table?: string; column: string }[];
  orderBy: SortClause[];
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  columns: { name: string; type: ColumnType }[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
  sql?: string;
}
