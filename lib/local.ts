import { z } from "zod";
import {
  sessionSchema,
  extraSchema,
  type Draft,
  type WorkoutSession,
} from "./model";
export const draftSchema = z.object({
  session: sessionSchema.safeExtend({
    extras: z.array(extraSchema.extend({ name: z.string().max(120) })).max(30),
  }),
  timer: z.object({
    elapsedMs: z.number().int().nonnegative().max(604800000),
    runningSince: z.number().int().nonnegative().nullable(),
  }),
});
export const localSchema = z.object({
  version: z.literal(1),
  draft: draftSchema.nullable(),
  pending: z.array(sessionSchema).max(500),
});
export type LocalState = {
  version: 1;
  draft: Draft | null;
  pending: WorkoutSession[];
};
export const emptyLocal = (): LocalState => ({
  version: 1,
  draft: null,
  pending: [],
});
export function localKey(userId: string) {
  return `mi-entreno:v1:${userId}`;
}
export function readLocal(raw: string | null): LocalState {
  return raw ? localSchema.parse(JSON.parse(raw)) : emptyLocal();
}
export function enqueue(
  state: LocalState,
  session: WorkoutSession,
): LocalState {
  const existing = state.pending.find((s) => s.id === session.id);
  if (existing && JSON.stringify(existing) !== JSON.stringify(session))
    throw new Error("La sesión ya está pendiente con otro contenido");
  return {
    ...state,
    draft: null,
    pending: existing
      ? state.pending
      : [...state.pending, sessionSchema.parse(session)],
  };
}
