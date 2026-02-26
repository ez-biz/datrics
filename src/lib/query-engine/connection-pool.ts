import { Pool as PgPool, PoolClient } from "pg";
import mysql from "mysql2/promise";
import BetterSqlite3 from "better-sqlite3";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

// ─── Types ──────────────────────────────────────────────────────────
interface PoolEntry {
  engine: string;
  pgPool?: PgPool;
  mysqlPool?: mysql.Pool;
  sqliteDb?: BetterSqlite3.Database;
  lastUsed: number;
  disposeTimer?: ReturnType<typeof setTimeout>;
}

interface QueryableConnection {
  engine: string;
  query: (sql: string, params?: unknown[]) => Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;
  release: () => void;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const pools = new Map<string, PoolEntry>();

// ─── Get or Create Pool ─────────────────────────────────────────────
export async function getConnection(databaseId: string): Promise<QueryableConnection> {
  let entry = pools.get(databaseId);

  if (!entry) {
    entry = await createPool(databaseId);
    pools.set(databaseId, entry);
  }

  // Reset idle timer
  if (entry.disposeTimer) clearTimeout(entry.disposeTimer);
  entry.lastUsed = Date.now();
  entry.disposeTimer = setTimeout(() => disposePool(databaseId), IDLE_TIMEOUT_MS);

  return acquireConnection(entry);
}

// ─── Create Pool ────────────────────────────────────────────────────
async function createPool(databaseId: string): Promise<PoolEntry> {
  const dbConfig = await prisma.databaseConnection.findUnique({
    where: { id: databaseId },
  });

  if (!dbConfig) throw new Error(`Database connection ${databaseId} not found`);

  const password = decrypt(dbConfig.passwordEnc);
  const engine = dbConfig.engine;

  switch (engine) {
    case "POSTGRESQL": {
      const pgPool = new PgPool({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.databaseName,
        user: dbConfig.username,
        password,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      return { engine, pgPool, lastUsed: Date.now() };
    }

    case "MYSQL": {
      const mysqlPool = mysql.createPool({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.databaseName,
        user: dbConfig.username,
        password,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
        connectionLimit: 5,
        connectTimeout: 10000,
      });
      return { engine, mysqlPool, lastUsed: Date.now() };
    }

    case "SQLITE": {
      const dbPath = dbConfig.databaseName || dbConfig.host;
      const sqliteDb = new BetterSqlite3(dbPath, { readonly: true, timeout: 10000 });
      return { engine, sqliteDb, lastUsed: Date.now() };
    }

    default:
      throw new Error(`Unsupported engine: ${engine}`);
  }
}

// ─── Acquire a Queryable Connection ─────────────────────────────────
function acquireConnection(entry: PoolEntry): Promise<QueryableConnection> {
  switch (entry.engine) {
    case "POSTGRESQL":
      return acquirePostgres(entry);
    case "MYSQL":
      return acquireMysql(entry);
    case "SQLITE":
      return acquireSqlite(entry);
    default:
      throw new Error(`Unsupported engine: ${entry.engine}`);
  }
}

async function acquirePostgres(entry: PoolEntry): Promise<QueryableConnection> {
  const pool = entry.pgPool!;
  const client: PoolClient = await pool.connect();

  return {
    engine: "POSTGRESQL",
    query: async (sql: string, params?: unknown[]) => {
      const result = await client.query(sql, params);
      const columns = result.fields.map((f) => f.name);
      return { columns, rows: result.rows as Record<string, unknown>[] };
    },
    release: () => client.release(),
  };
}

async function acquireMysql(entry: PoolEntry): Promise<QueryableConnection> {
  const pool = entry.mysqlPool!;
  const conn = await pool.getConnection();

  return {
    engine: "MYSQL",
    query: async (sql: string, params?: unknown[]) => {
      const [rows, fields] = await conn.query(sql, params);
      const columns = (fields as mysql.FieldPacket[]).map((f) => f.name);
      return { columns, rows: rows as Record<string, unknown>[] };
    },
    release: () => conn.release(),
  };
}

async function acquireSqlite(entry: PoolEntry): Promise<QueryableConnection> {
  const db = entry.sqliteDb!;

  return {
    engine: "SQLITE",
    query: async (sql: string, params: unknown[] = []) => {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as Record<string, unknown>[];
      const columns = stmt.columns().map((c) => c.name);
      return { columns, rows };
    },
    release: () => {
      /* noop for SQLite — file-level access, no per-query release */
    },
  };
}

// ─── Dispose Pool ───────────────────────────────────────────────────
export async function disposePool(databaseId: string): Promise<void> {
  const entry = pools.get(databaseId);
  if (!entry) return;

  if (entry.disposeTimer) clearTimeout(entry.disposeTimer);

  try {
    if (entry.pgPool) await entry.pgPool.end();
    if (entry.mysqlPool) await entry.mysqlPool.end();
    if (entry.sqliteDb) entry.sqliteDb.close();
  } catch (err) {
    console.error(`Error disposing pool for ${databaseId}:`, err);
  }

  pools.delete(databaseId);
}

// ─── Dispose All (for graceful shutdown) ────────────────────────────
export async function disposeAllPools(): Promise<void> {
  const ids = Array.from(pools.keys());
  await Promise.all(ids.map(disposePool));
}
