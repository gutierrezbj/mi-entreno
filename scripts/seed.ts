import { randomUUID, createHash } from "node:crypto";
import { db, client } from "../db";
import { users, exercises, templates, sessions } from "../db/schema";
import { sessionSchema } from "../lib/model";
import { initialExercises, initialTemplate, initialSession } from "../lib/seed";
const username = process.env.AUTH_USERNAME;
if (!username) throw new Error("Configura AUTH_USERNAME");
try {
  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({ id: randomUUID(), username })
      .onConflictDoNothing();
    const [user] = await tx.select().from(users);
    if (user.username !== username)
      throw new Error("La instancia ya tiene otro propietario");
    for (const ex of initialExercises)
      await tx
        .insert(exercises)
        .values({ id: ex.id, userId: user.id, data: ex })
        .onConflictDoNothing();
    await tx
      .insert(templates)
      .values({
        id: initialTemplate.id,
        userId: user.id,
        version: 1,
        data: initialTemplate,
      })
      .onConflictDoNothing();
    await tx
      .insert(sessions)
      .values({
        id: initialSession.id,
        userId: user.id,
        data: initialSession,
        digest: createHash("sha256")
          .update(JSON.stringify(sessionSchema.parse(initialSession)))
          .digest("hex"),
      })
      .onConflictDoNothing();
  });
  console.log("Datos iniciales preparados sin sobrescribir registros.");
} finally {
  await client.end();
}
