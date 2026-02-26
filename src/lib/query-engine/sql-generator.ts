import {
  AbstractQuery,
  DBEngine,
  FilterCondition,
  FilterGroup,
  FilterOperator,
  AggregateColumn,
  SortClause,
  JoinClause,
} from "./types";

interface GeneratedSQL {
  sql: string;
  params: (string | number | boolean | null)[];
}

// Identifier quoting per dialect
function quoteIdent(name: string, engine: DBEngine): string {
  switch (engine) {
    case "MYSQL":
      return `\`${name.replace(/`/g, "``")}\``;
    case "POSTGRESQL":
    case "SQLITE":
    case "MSSQL":
    default:
      return `"${name.replace(/"/g, '""')}"`;
  }
}

function qualifiedColumn(
  col: { table?: string; column: string },
  engine: DBEngine
): string {
  if (col.table) {
    return `${quoteIdent(col.table, engine)}.${quoteIdent(col.column, engine)}`;
  }
  return quoteIdent(col.column, engine);
}

function paramPlaceholder(index: number, engine: DBEngine): string {
  if (engine === "POSTGRESQL") return `$${index}`;
  return "?";
}

// ─── Filter → WHERE clause ─────────────────────────────────────────
function buildFilterCondition(
  cond: FilterCondition,
  engine: DBEngine,
  params: (string | number | boolean | null)[]
): string {
  const col = qualifiedColumn(cond, engine);
  const op = cond.operator;

  const pushParam = (v: string | number | boolean | null): string => {
    params.push(v);
    return paramPlaceholder(params.length, engine);
  };

  switch (op) {
    case "=":
    case "!=":
    case ">":
    case "<":
    case ">=":
    case "<=": {
      const ph = pushParam(cond.value ?? null);
      return `${col} ${op} ${ph}`;
    }
    case "contains": {
      const ph = pushParam(`%${cond.value}%`);
      return `${col} LIKE ${ph}`;
    }
    case "not_contains": {
      const ph = pushParam(`%${cond.value}%`);
      return `${col} NOT LIKE ${ph}`;
    }
    case "starts_with": {
      const ph = pushParam(`${cond.value}%`);
      return `${col} LIKE ${ph}`;
    }
    case "ends_with": {
      const ph = pushParam(`%${cond.value}`);
      return `${col} LIKE ${ph}`;
    }
    case "is_null":
      return `${col} IS NULL`;
    case "is_not_null":
      return `${col} IS NOT NULL`;
    case "between": {
      const ph1 = pushParam(cond.value as string | number);
      const ph2 = pushParam(cond.value2 as string | number);
      return `${col} BETWEEN ${ph1} AND ${ph2}`;
    }
    case "in": {
      // value is expected to be a comma-separated string or already an array
      const items =
        typeof cond.value === "string"
          ? cond.value.split(",").map((s) => s.trim())
          : [cond.value];
      const placeholders = items.map((item) => pushParam(item as string | number));
      return `${col} IN (${placeholders.join(", ")})`;
    }
    default: {
      const _exhaustive: never = op;
      throw new Error(`Unsupported filter operator: ${_exhaustive}`);
    }
  }
}

function buildFilterGroup(
  group: FilterGroup,
  engine: DBEngine,
  params: (string | number | boolean | null)[]
): string {
  const parts = group.conditions.map((cond) => {
    if ("logic" in cond) {
      return `(${buildFilterGroup(cond as FilterGroup, engine, params)})`;
    }
    return buildFilterCondition(cond as FilterCondition, engine, params);
  });

  return parts.join(` ${group.logic} `);
}

// ─── Main Generator ─────────────────────────────────────────────────
export function generateSQL(
  query: AbstractQuery,
  engine: DBEngine
): GeneratedSQL {
  const params: (string | number | boolean | null)[] = [];
  const parts: string[] = [];

  // SELECT
  const selectItems: string[] = [];

  // Regular columns
  for (const col of query.columns) {
    const expr = qualifiedColumn(col, engine);
    selectItems.push(col.alias ? `${expr} AS ${quoteIdent(col.alias, engine)}` : expr);
  }

  // Aggregations
  for (const agg of query.aggregations) {
    const aggExpr = buildAggregate(agg, engine);
    const alias = agg.alias || `${agg.fn}_${agg.column}`;
    selectItems.push(`${aggExpr} AS ${quoteIdent(alias, engine)}`);
  }

  if (selectItems.length === 0) {
    selectItems.push("*");
  }

  parts.push(`SELECT ${selectItems.join(", ")}`);

  // FROM
  const fromTable = query.sourceSchema
    ? `${quoteIdent(query.sourceSchema, engine)}.${quoteIdent(query.sourceTable, engine)}`
    : quoteIdent(query.sourceTable, engine);
  parts.push(`FROM ${fromTable}`);

  // JOINs
  for (const join of query.joins) {
    parts.push(buildJoin(join, query.sourceTable, engine));
  }

  // WHERE
  if (query.filters && query.filters.conditions.length > 0) {
    const whereClause = buildFilterGroup(query.filters, engine, params);
    parts.push(`WHERE ${whereClause}`);
  }

  // GROUP BY
  if (query.groupBy.length > 0) {
    const groupCols = query.groupBy.map((g) => qualifiedColumn(g, engine));
    parts.push(`GROUP BY ${groupCols.join(", ")}`);
  }

  // ORDER BY
  if (query.orderBy.length > 0) {
    const orderCols = query.orderBy.map(
      (s) => `${qualifiedColumn(s, engine)} ${s.direction}`
    );
    parts.push(`ORDER BY ${orderCols.join(", ")}`);
  }

  // LIMIT & OFFSET
  if (query.limit !== undefined) {
    parts.push(`LIMIT ${query.limit}`);
  }
  if (query.offset !== undefined) {
    parts.push(`OFFSET ${query.offset}`);
  }

  return { sql: parts.join("\n"), params };
}

// ─── Helpers ────────────────────────────────────────────────────────
function buildAggregate(agg: AggregateColumn, engine: DBEngine): string {
  const col = qualifiedColumn(agg, engine);
  switch (agg.fn) {
    case "count":
      return `COUNT(${col})`;
    case "count_distinct":
      return `COUNT(DISTINCT ${col})`;
    case "sum":
      return `SUM(${col})`;
    case "avg":
      return `AVG(${col})`;
    case "min":
      return `MIN(${col})`;
    case "max":
      return `MAX(${col})`;
    default:
      throw new Error(`Unsupported aggregate: ${agg.fn}`);
  }
}

function buildJoin(
  join: JoinClause,
  sourceTable: string,
  engine: DBEngine
): string {
  const joinType = join.type.toUpperCase();
  const target = quoteIdent(join.table, engine);
  const onSource = `${quoteIdent(sourceTable, engine)}.${quoteIdent(join.on.sourceColumn, engine)}`;
  const onTarget = `${quoteIdent(join.table, engine)}.${quoteIdent(join.on.targetColumn, engine)}`;
  return `${joinType} JOIN ${target} ON ${onSource} = ${onTarget}`;
}

// Re-export for convenience
export type { GeneratedSQL, FilterOperator };
