import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

let poolInstance: any = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

export const getPool = () => {
  if (!poolInstance) {
    const host = process.env.SQL_HOST;
    const user = process.env.SQL_USER;
    const password = process.env.SQL_PASSWORD;
    const database = process.env.SQL_DB_NAME;

    if (!host || !user || !password || !database) {
      console.warn("⚠️ Warning: SQL connection credentials incomplete in environment.");
    }

    const PoolClass = pg?.Pool || (pg as any)?.default?.Pool || pg;
    if (typeof PoolClass !== "function") {
      throw new Error("Cannot load pg.Pool class for database connection.");
    }

    poolInstance = new PoolClass({
      host: host || "localhost",
      user: user || "postgres",
      password: password || "",
      database: database || "postgres",
      connectionTimeoutMillis: 10000,
    });

    poolInstance.on("error", (err: any) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return poolInstance;
};

export const getDb = () => {
  if (!drizzleInstance) {
    drizzleInstance = drizzle(getPool(), { schema });
  }
  return drizzleInstance;
};

// Export db proxy so top-level imports don't trigger pool creation
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});


