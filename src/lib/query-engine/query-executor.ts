import { AbstractQuery, DBEngine, QueryResult, ColumnType } from "./types";
import { generateSQL } from "./sql-generator";
import { getConnection } from "./connection-pool";
import { prisma } from "@/lib/db";

const MAX_ROWS = 2000;

// ─── Execute AQR ────────────────────────────────────────────────────
export async function executeAQR(
  databaseId: string,
  query: AbstractQuery
): Promise<QueryResult> {
  const dbConfig = await prisma.databaseConnection.findUnique({
    where: { id: databaseId },
    select: { engine: true },
  });

  if (!dbConfig) throw new Error("Database not found");

  const engine = dbConfig.engine as DBEngine;

  // Enforce a limit to avoid runaway queries
  const limitedQuery: AbstractQuery = {
    ...query,
    limit: query.limit ? Math.min(query.limit, MAX_ROWS + 1) : MAX_ROWS + 1,
  };

  const { sql, params } = generateSQL(limitedQuery, engine);

  return executeSQL(databaseId, sql, params, engine);
}

// ─── Execute Raw SQL ────────────────────────────────────────────────
export async function executeRawSQL(
  databaseId: string,
  sql: string
): Promise<QueryResult> {
  const dbConfig = await prisma.databaseConnection.findUnique({
    where: { id: databaseId },
    select: { engine: true },
  });

  if (!dbConfig) throw new Error("Database not found");

  const engine = dbConfig.engine as DBEngine;

  // Wrap with LIMIT if not already present (basic safety)
  const normalizedSQL = sql.trim().replace(/;$/, "");
  const hasLimit = /\bLIMIT\b/i.test(normalizedSQL);
  const safeSql = hasLimit ? normalizedSQL : `${normalizedSQL} LIMIT ${MAX_ROWS + 1}`;

  return executeSQL(databaseId, safeSql, [], engine);
}

// ─── Core Execution Logic ───────────────────────────────────────────
async function executeSQL(
  databaseId: string,
  sql: string,
  params: unknown[],
  engine: DBEngine
): Promise<QueryResult> {
  const conn = await getConnection(databaseId);
  const startTime = performance.now();

  try {
    const result = await conn.query(sql, params);
    const executionTimeMs = Math.round(performance.now() - startTime);

    // Check if truncated (we fetched MAX_ROWS + 1)
    const truncated = result.rows.length > MAX_ROWS;
    const rows = truncated ? result.rows.slice(0, MAX_ROWS) : result.rows;

    // Infer column types from the first row
    const columns = result.columns.map((name) => ({
      name,
      type: inferColumnType(rows[0]?.[name]),
    }));

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs,
      truncated,
      sql,
    };
  } finally {
    conn.release();
  }
}

// ─── Type Inference ─────────────────────────────────────────────────
function inferColumnType(value: unknown): ColumnType {
  if (value === null || value === undefined) return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "date";
  if (typeof value === "string") {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  }
  return "string";
}
