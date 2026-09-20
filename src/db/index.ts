import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "alannuarii",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_autohira",
});

export const db = drizzle(pool, { schema });
