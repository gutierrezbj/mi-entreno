import { readFile } from "node:fs/promises";
import { client } from "../db";
try {
  await client.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(7461201)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const name = "0001_initial.sql";
    const existing =
      await tx`SELECT name FROM schema_migrations WHERE name=${name}`;
    if (!existing.length) {
      await tx.unsafe(
        await readFile(
          new URL("../db/migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
      await tx`INSERT INTO schema_migrations(name) VALUES (${name})`;
    }
  });
  console.log("Migraciones aplicadas.");
} finally {
  await client.end();
}
