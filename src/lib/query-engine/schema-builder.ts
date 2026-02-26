import { DBEngine, SchemaGraph, SchemaTable, SchemaColumn } from "./types";
import { Pool as PgPool } from "pg";
import { createConnection as createMysqlConnection } from "mysql2/promise";
import BetterSqlite3 from "better-sqlite3";

export interface IntrospectionConfig {
  engine: DBEngine | string;
  host: string;
  port: number;
  databaseName: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export async function introspectSchema(config: IntrospectionConfig): Promise<SchemaGraph> {
  const engine = config.engine as DBEngine;
  let tables: SchemaTable[] = [];

  try {
    switch (engine) {
      case "POSTGRESQL":
        tables = await introspectPostgres(config);
        break;
      case "MYSQL":
        tables = await introspectMysql(config);
        break;
      case "SQLITE":
        tables = await introspectSqlite(config);
        break;
      default:
        throw new Error(`Unsupported database engine: ${config.engine}`);
    }

    return {
      tables,
      engine,
      databaseName: config.databaseName,
      introspectedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to introspect ${engine} schema:`, error);
    throw new Error(`Failed to read database schema: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function mapToStandardType(rawType: string): SchemaColumn["type"] {
  const type = rawType.toLowerCase();
  
  // Numeric types
  if (
    type.includes("int") ||
    type.includes("float") ||
    type.includes("double") ||
    type.includes("decimal") ||
    type.includes("numeric") ||
    type.includes("real") ||
    type.includes("serial")
  ) {
    return "number";
  }

  // Date/Time types
  if (
    type.includes("date") ||
    type.includes("time") ||
    type.includes("year")
  ) {
    return "date";
  }

  // Boolean types
  if (type.includes("bool") || type.includes("bit")) {
    return "boolean";
  }

  // Default to string for text, varchar, char, uuid, json, enum, etc.
  return "string";
}

async function introspectPostgres(config: IntrospectionConfig): Promise<SchemaTable[]> {
  const pool = new PgPool({
    host: config.host,
    port: config.port,
    database: config.databaseName,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: 1,
  });

  try {
    const client = await pool.connect();

    // Query tables and columns
    const columnsQuery = `
      SELECT 
        c.table_schema,
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        (
          SELECT COUNT(*) > 0
          FROM information_schema.key_column_usage kcu
          JOIN information_schema.table_constraints tc 
            ON kcu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND kcu.table_schema = c.table_schema
            AND kcu.table_name = c.table_name
            AND kcu.column_name = c.column_name
        ) as is_primary_key
      FROM information_schema.columns c
      WHERE c.table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY c.table_schema, c.table_name, c.ordinal_position;
    `;

    const result = await client.query(columnsQuery);
    
    // Process results into SchemaTable array
    const tablesMap = new Map<string, SchemaTable>();

    for (const row of result.rows) {
      const tableKey = `${row.table_schema}.${row.table_name}`;
      
      if (!tablesMap.has(tableKey)) {
        tablesMap.set(tableKey, {
          name: row.table_name,
          schema: row.table_schema === 'public' ? undefined : row.table_schema,
          columns: [],
          primaryKeys: [],
          foreignKeys: [], // Note: FKs would need a separate query, keeping simple for MVP
        });
      }

      const table = tablesMap.get(tableKey)!;
      const columnName = row.column_name;
      const isPk = row.is_primary_key;

      table.columns.push({
        name: columnName,
        type: mapToStandardType(row.data_type),
        rawType: row.data_type,
        nullable: row.is_nullable === 'YES',
        isPrimaryKey: isPk,
        defaultValue: row.column_default,
      });

      if (isPk) {
        table.primaryKeys.push(columnName);
      }
    }

    client.release();
    return Array.from(tablesMap.values());
  } finally {
    await pool.end();
  }
}

async function introspectMysql(config: IntrospectionConfig): Promise<SchemaTable[]> {
  const connection = await createMysqlConnection({
    host: config.host,
    port: config.port,
    database: config.databaseName,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const [rows]: any = await connection.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT, 
        COLUMN_KEY 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION;
    `, [config.databaseName]);

    const tablesMap = new Map<string, SchemaTable>();

    for (const row of rows) {
      const tableName = row.TABLE_NAME;
      
      if (!tablesMap.has(tableName)) {
        tablesMap.set(tableName, {
          name: tableName,
          columns: [],
          primaryKeys: [],
          foreignKeys: [],
        });
      }

      const table = tablesMap.get(tableName)!;
      const columnName = row.COLUMN_NAME;
      const isPk = row.COLUMN_KEY === 'PRI';

      table.columns.push({
        name: columnName,
        type: mapToStandardType(row.DATA_TYPE),
        rawType: row.DATA_TYPE,
        nullable: row.IS_NULLABLE === 'YES',
        isPrimaryKey: isPk,
        defaultValue: row.COLUMN_DEFAULT,
      });

      if (isPk) {
        table.primaryKeys.push(columnName);
      }
    }

    return Array.from(tablesMap.values());
  } finally {
    await connection.end();
  }
}

async function introspectSqlite(config: IntrospectionConfig): Promise<SchemaTable[]> {
  const dbPath = config.databaseName || config.host;
  const db = new BetterSqlite3(dbPath, { readonly: true });

  try {
    // Get all tables
    const tablesInfo = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%';
    `).all() as { name: string }[];

    const tables: SchemaTable[] = [];

    for (const t of tablesInfo) {
      const tableName = t.name;
      
      // Get columns for this table using PRAGMA table_info
      const columnsInfo = db.prepare(`PRAGMA table_info("${tableName}")`).all() as any[];
      
      const schemaTable: SchemaTable = {
        name: tableName,
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
      };

      for (const col of columnsInfo) {
        const columnName = col.name;
        const rawType = col.type || 'TEXT';
        const isPk = col.pk > 0;

        schemaTable.columns.push({
          name: columnName,
          type: mapToStandardType(rawType),
          rawType: rawType,
          nullable: col.notnull === 0,
          isPrimaryKey: isPk,
          defaultValue: col.dflt_value,
        });

        if (isPk) {
          schemaTable.primaryKeys.push(columnName);
        }
      }

      tables.push(schemaTable);
    }

    return tables;
  } finally {
    db.close();
  }
}
