import { z } from "zod";
const id = z.uuid();
const text = z.string().trim().max(2000);
const number = z.number().finite().min(0).max(1_000_000);
export const units = ["reps", "m", "s", "min"] as const;
export const exerciseSchema = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  category: z.string().max(80),
  instructions: text,
  defaultUnit: z.enum(units),
  media: z
    .array(z.object({ url: z.url(), license: z.string().min(1).max(200) }))
    .max(10),
});
export const prescribedSchema = z.object({
  id,
  exerciseId: id,
  name: z.string().trim().min(1).max(120),
  unit: z.enum(units),
  target: number,
  loadKg: number.nullable(),
  restSeconds: number,
  uncertain: z.boolean(),
  equipment: z
    .enum(["machine", "bodyweight", "weighted", "unspecified"])
    .optional(),
  supersetId: id.nullable().optional(),
});
export const blockSchema = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  rounds: z.number().int().min(1).max(20),
  exercises: z.array(prescribedSchema).min(1).max(50),
});
export const templateSchema = z
  .object({
    id,
    version: z.number().int().min(1),
    name: z.string().trim().min(1).max(120),
    targetMinutes: number.positive(),
    blocks: z.array(blockSchema).min(1).max(12),
  })
  .superRefine((t, ctx) => {
    const ids = [
      t.id,
      ...t.blocks.flatMap((b) => [b.id, ...b.exercises.map((e) => e.id)]),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Identificadores repetidos" });
    for (const b of t.blocks)
      for (const ex of b.exercises) {
        if (ex.supersetId && ids.includes(ex.supersetId))
          ctx.addIssue({
            code: "custom",
            message:
              "El identificador del superset debe ser independiente de los ejercicios",
          });
      }
    if (t.blocks.reduce((n, b) => n + b.rounds * b.exercises.length, 0) > 500)
      ctx.addIssue({
        code: "custom",
        message: "Máximo 500 registros por sesión",
      });
  });
export const resultSchema = z.object({
  id,
  prescribedId: id,
  blockId: id,
  round: z.number().int().min(1).max(20),
  exerciseId: id,
  actual: number.nullable(),
  loadKg: number.nullable(),
  status: z.enum(["pending", "done", "partial", "skipped"]),
  notes: text,
});
export const extraSchema = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  value: number,
  unit: z.enum(units),
  notes: text,
});
export const sessionSchema = z
  .object({
    id,
    template: templateSchema,
    date: z.iso.date(),
    startedAt: z.iso.datetime().nullable(),
    finishedAt: z.iso.datetime().nullable(),
    durationMs: z.number().int().min(0).max(604800000).nullable(),
    status: z.enum(["completed", "partial"]),
    results: z.array(resultSchema).max(500),
    extras: z.array(extraSchema).max(30),
    notes: text,
    reportedRounds: z
      .array(z.object({ blockId: id, rounds: z.number().int().min(0).max(20) }))
      .max(12),
    source: z.literal("manual"),
  })
  .superRefine((s, ctx) => {
    const seen = new Set<string>();
    for (const r of s.results) {
      const b = s.template.blocks.find((b) => b.id === r.blockId);
      const e = b?.exercises.find((e) => e.id === r.prescribedId);
      const key = `${r.blockId}/${r.prescribedId}/${r.round}`;
      if (
        !b ||
        !e ||
        e.exerciseId !== r.exerciseId ||
        r.round > b.rounds ||
        seen.has(key)
      )
        ctx.addIssue({
          code: "custom",
          message: "Resultado incompatible con el plan",
        });
      seen.add(key);
      if (r.status === "done" && r.actual === null)
        ctx.addIssue({
          code: "custom",
          message: "Introduce el valor realizado antes de marcar completado",
        });
      if (
        (r.status === "pending" || r.status === "skipped") &&
        (r.actual !== null || r.loadKg !== null)
      )
        ctx.addIssue({
          code: "custom",
          message: "Un registro pendiente u omitido no puede tener métricas",
        });
    }
    if (
      new Set([...s.results, ...s.extras].map((x) => x.id)).size !==
      s.results.length + s.extras.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Identificadores de resultado repetidos",
      });
    if (
      s.status === "completed" &&
      (s.results.length !==
        s.template.blocks.reduce(
          (n, b) => n + b.rounds * b.exercises.length,
          0,
        ) ||
        s.results.some((r) => r.status !== "done"))
    )
      ctx.addIssue({
        code: "custom",
        message: "Hay ejercicios sin completar; guarda como parcial",
      });
    if (s.startedAt && s.finishedAt && s.finishedAt < s.startedAt)
      ctx.addIssue({ code: "custom", message: "Fechas inconsistentes" });
    if (
      s.reportedRounds.some(
        (r) => !s.template.blocks.some((b) => b.id === r.blockId),
      )
    )
      ctx.addIssue({ code: "custom", message: "Bloque desconocido" });
  });
export type ExerciseDefinition = z.infer<typeof exerciseSchema>;
export type WorkoutTemplate = z.infer<typeof templateSchema>;
export type Block = z.infer<typeof blockSchema>;
export type PrescribedExercise = z.infer<typeof prescribedSchema>;
export type WorkoutSession = z.infer<typeof sessionSchema>;
export type ExerciseResult = z.infer<typeof resultSchema>;
export type ExtraActivity = z.infer<typeof extraSchema>;
export type Timer = { elapsedMs: number; runningSince: number | null };
export type Draft = { session: WorkoutSession; timer: Timer };
export function elapsed(timer: Timer, now: number) {
  return (
    timer.elapsedMs +
    (timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince))
  );
}
export function pause(timer: Timer, now: number): Timer {
  return { elapsedMs: elapsed(timer, now), runningSince: null };
}
export function resume(timer: Timer, now: number): Timer {
  return timer.runningSince === null ? { ...timer, runningSince: now } : timer;
}
export function localDate(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function startSession(
  template: WorkoutTemplate,
  now: Date = new Date(),
): Draft {
  return {
    timer: { elapsedMs: 0, runningSince: now.getTime() },
    session: {
      id: crypto.randomUUID(),
      template: structuredClone(template),
      date: localDate(now),
      startedAt: now.toISOString(),
      finishedAt: null,
      durationMs: 0,
      status: "partial",
      notes: "",
      extras: [],
      reportedRounds: [],
      source: "manual",
      results: template.blocks.flatMap((b) =>
        Array.from({ length: b.rounds }, (_, i) =>
          b.exercises.map((e) => ({
            id: crypto.randomUUID(),
            prescribedId: e.id,
            blockId: b.id,
            round: i + 1,
            exerciseId: e.exerciseId,
            actual: null,
            loadKg: null,
            status: "pending" as const,
            notes: "",
          })),
        ).flat(),
      ),
    },
  };
}
export function finishSession(
  draft: Draft,
  now: Date = new Date(),
): WorkoutSession {
  return sessionSchema.parse({
    ...draft.session,
    finishedAt: now.toISOString(),
    durationMs: elapsed(draft.timer, now.getTime()),
    status:
      draft.session.results.length > 0 &&
      draft.session.results.every((r) => r.status === "done")
        ? "completed"
        : "partial",
  });
}
export function progress(session: WorkoutSession) {
  return {
    recorded: session.results.filter((r) => r.status !== "pending").length,
    done: session.results.filter((r) => r.status === "done").length,
    total: session.template.blocks.reduce(
      (n, b) => n + b.rounds * b.exercises.length,
      0,
    ),
  };
}
export function formatDuration(ms: number | null) {
  if (ms === null) return "Sin tiempo medido";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
export function previousResult(
  sessions: WorkoutSession[],
  exerciseId: string,
  unit: string,
) {
  for (const s of [...sessions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.startedAt ?? "").localeCompare(a.startedAt ?? ""),
  )) {
    for (const r of s.results) {
      const e = s.template.blocks
        .flatMap((b) => b.exercises)
        .find((e) => e.id === r.prescribedId);
      if (
        r.exerciseId === exerciseId &&
        e?.unit === unit &&
        r.actual !== null &&
        ["done", "partial"].includes(r.status)
      )
        return { date: s.date, actual: r.actual, loadKg: r.loadKg };
    }
  }
  return null;
}
