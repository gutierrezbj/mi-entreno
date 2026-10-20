import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  ExerciseDefinition,
  WorkoutSession,
  WorkoutTemplate,
} from "../lib/model";
export const users = pgTable("users", {
  id: uuid().primaryKey(),
  username: text().notNull().unique(),
});
export const templates = pgTable("workout_templates", {
  id: uuid().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  version: integer().notNull(),
  data: jsonb().$type<WorkoutTemplate>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const exercises = pgTable("exercise_definitions", {
  id: uuid().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  data: jsonb().$type<ExerciseDefinition>().notNull(),
});
export const sessions = pgTable(
  "workout_sessions",
  {
    id: uuid().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    data: jsonb().$type<WorkoutSession>().notNull(),
    digest: text().notNull(),
    source: text().notNull().default("manual"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("session_external_source").on(t.userId, t.source, t.externalId),
  ],
);
export const authSessions = pgTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
