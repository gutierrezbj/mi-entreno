import { createHash } from "node:crypto";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db";
import { templates, sessions, exercises } from "../db/schema";
import {
  templateSchema,
  sessionSchema,
  type WorkoutTemplate,
  type WorkoutSession,
} from "./model";
export class Conflict extends Error {}
export async function getData(userId: string) {
  const [ts, ss, es] = await Promise.all([
    db
      .select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(desc(templates.updatedAt)),
    db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt)),
    db.select().from(exercises).where(eq(exercises.userId, userId)),
  ]);
  return {
    templates: ts.map((t) => t.data),
    sessions: ss.map((s) => s.data),
    exercises: es.map((e) => e.data),
  };
}
export async function saveTemplate(
  userId: string,
  input: WorkoutTemplate,
  isNew: boolean,
) {
  const data = templateSchema.parse(input);
  if (isNew) {
    if (data.version !== 1)
      throw new Conflict("La nueva rutina debe comenzar en versión 1");
    const rows = await db
      .insert(templates)
      .values({ id: data.id, userId, version: 1, data })
      .onConflictDoNothing()
      .returning();
    if (!rows.length) throw new Conflict("La rutina ya existe");
    return data;
  }
  const next = { ...data, version: data.version + 1 };
  const rows = await db
    .update(templates)
    .set({ version: next.version, data: next, updatedAt: new Date() })
    .where(
      and(
        eq(templates.id, data.id),
        eq(templates.userId, userId),
        eq(templates.version, data.version),
      ),
    )
    .returning();
  if (!rows.length)
    throw new Conflict(
      "La rutina cambió en otro dispositivo. Recarga antes de editar.",
    );
  return next;
}
export async function deleteTemplate(userId: string, id: string) {
  await db
    .delete(templates)
    .where(and(eq(templates.id, id), eq(templates.userId, userId)));
}
export async function saveSession(userId: string, input: WorkoutSession) {
  const data = sessionSchema.parse(input);
  // Canonical parsed schema order makes retries independent of JSON object key order.
  const digest = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
  const inserted = await db
    .insert(sessions)
    .values({ id: data.id, userId, data, digest })
    .onConflictDoNothing()
    .returning({ id: sessions.id });
  if (inserted.length) return { id: data.id, duplicate: false };
  const [existing] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, data.id), eq(sessions.userId, userId)));
  if (!existing || existing.digest !== digest)
    throw new Conflict(
      "Identificador de sesión ya utilizado con otro contenido. Se conserva el registro local.",
    );
  return { id: data.id, duplicate: true };
}
