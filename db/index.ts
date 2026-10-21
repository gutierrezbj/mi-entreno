import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
const globalDb = globalThis as unknown as {
  sqlClient?: ReturnType<typeof postgres>;
};
export const client =
  globalDb.sqlClient ??
  postgres(
    process.env.DATABASE_URL ??
      "postgres://invalid:invalid@localhost:5432/unconfigured",
    { max: 5, onnotice: () => {} },
  );
if (process.env.NODE_ENV !== "production") globalDb.sqlClient = client;
export const db = drizzle(client, { schema });
