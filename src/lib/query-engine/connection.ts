import { DBEngine } from "./types";
import { Pool as PgPool } from "pg";
import { createConnection as createMysqlConnection } from "mysql2/promise";
import BetterSqlite3 from "better-sqlite3";

export interface ConnectionConfig {
  engine: DBEngine | string;
  host: string;
  port: number;
  databaseName: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export async function testConnection(config: ConnectionConfig): Promise<boolean> {
  switch (config.engine) {
    case "POSTGRESQL":
      return await testPostgres(config);
    case "MYSQL":
      return await testMysql(config);
    case "SQLITE":
      return await testSqlite(config);
    default:
      throw new Error(`Unsupported database engine: ${config.engine}`);
  }
}

async function testPostgres(config: ConnectionConfig): Promise<boolean> {
  const pool = new PgPool({
    host: config.host,
    port: config.port,
    database: config.databaseName,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: 1, // Only need 1 connection for test
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } finally {
    await pool.end();
  }
}

async function testMysql(config: ConnectionConfig): Promise<boolean> {
  const connection = await createMysqlConnection({
    host: config.host,
    port: config.port,
    database: config.databaseName,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 5000,
  });

  try {
    await connection.query("SELECT 1");
    return true;
  } finally {
    await connection.end();
  }
}

async function testSqlite(config: ConnectionConfig): Promise<boolean> {
  try {
    // For SQLite, host/databaseName can just map to the file path. Typically databaseName is used.
    const dbPath = config.databaseName || config.host;
    const db = new BetterSqlite3(dbPath, { readonly: true, timeout: 5000 });
    db.prepare("SELECT 1").get();
    db.close();
    return true;
  } catch (error) {
    console.error("SQLite connection test failed:", error);
    throw error;
  }
}
