import pg from "pg";
import { loadEnv } from "../config/env.js";

let pool: pg.Pool | null = null;

export function getPool() {
  const env = loadEnv();
  if (!env.DATABASE_URL) return null;
  pool ??= new pg.Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL_MODE === "require" ? { rejectUnauthorized: false } : undefined,
    max: 4,
  });
  return pool;
}

export async function query<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []) {
  const client = getPool();
  if (!client) return null;
  return client.query<T>(sql, params);
}
