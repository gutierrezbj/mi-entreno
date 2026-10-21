import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, client } from "../../db";
import { users, sessions, templates } from "../../db/schema";
import {
  saveSession,
  saveTemplate,
  getData,
  Conflict,
  deleteTemplate,
} from "../../lib/repository";
import { startSession, finishSession } from "../../lib/model";
import { initialTemplate } from "../../lib/seed";
if (!process.env.DATABASE_URL?.endsWith("/mi_entreno_test"))
  throw new Error(
    "Integration tests require isolated mi_entreno_test database",
  );
after(async () => {
  await client.end();
});
test("PostgreSQL persistence, concurrent idempotency, ownership, optimistic versions and immutable history", async () => {
  const userId = randomUUID(),
    other = randomUUID();
  await db.insert(users).values([
    { id: userId, username: userId },
    { id: other, username: other },
  ]);
  const t = { ...structuredClone(initialTemplate), id: randomUUID() };
  try {
    await saveTemplate(userId, t, true);
    const draft = startSession(t);
    draft.session.results[0].actual = 100;
    draft.session.results[0].status = "partial";
    const saved = finishSession(draft);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => saveSession(userId, saved)),
    );
    assert.equal(results.filter((r) => !r.duplicate).length, 1);
    assert.equal((await getData(userId)).sessions.length, 1);
    assert.equal((await getData(other)).sessions.length, 0);
    assert.equal((await getData(userId)).sessions[0].results[0].actual, 100);
    await assert.rejects(
      saveSession(userId, { ...saved, notes: "changed" }),
      Conflict,
    );
    await assert.rejects(saveSession(other, saved), Conflict);
    const next = await saveTemplate(userId, { ...t, name: "Edited" }, false);
    assert.equal(next.version, 2);
    await assert.rejects(saveTemplate(userId, t, false), Conflict);
    await assert.rejects(saveTemplate(other, next, false), Conflict);
    assert.equal((await getData(userId)).sessions[0].template.name, t.name);
    await deleteTemplate(other, t.id);
    assert.equal((await getData(userId)).templates.length, 1);
    await deleteTemplate(userId, t.id);
    assert.equal((await getData(userId)).sessions.length, 1);
  } finally {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    await db.delete(templates).where(eq(templates.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, other));
  }
});
