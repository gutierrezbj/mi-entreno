import type {
  ExerciseResult,
  PrescribedExercise,
  WorkoutSession,
} from "./model";
import { exerciseGroups } from "./structure";

// Each exercise/round is one item. Never add metres, reps or time into a shared volume.
export function completion(results: ExerciseResult[], total: number) {
  const done = results.filter(
    (r) => r.status === "done" && r.actual !== null,
  ).length;
  return {
    done,
    total,
    percent: total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0,
    partial: results.filter((r) => r.status === "partial").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };
}
export function targetProgress(
  exercise: PrescribedExercise,
  result: ExerciseResult,
): number | null {
  if (
    exercise.target <= 0 ||
    result.actual === null ||
    result.status === "pending" ||
    result.status === "skipped"
  )
    return null;
  return Math.min(
    100,
    Math.max(0, Math.floor((result.actual / exercise.target) * 100)),
  );
}
export function toggleDone(
  exercise: PrescribedExercise,
  result: ExerciseResult,
): ExerciseResult {
  // The empty-value action must explicitly say "He hecho [target] [unit]" in the UI.
  // This is a user confirmation of that quantity, never a silent prefill or a guessed load.
  return result.status === "done"
    ? { ...result, status: result.actual === null ? "pending" : "partial" }
    : { ...result, actual: result.actual ?? exercise.target, status: "done" };
}
export function workoutSequence(session: WorkoutSession) {
  const entries = [];
  for (const [blockIndex, block] of session.template.blocks.entries()) {
    for (let round = 1; round <= block.rounds; round++) {
      for (const [groupIndex, group] of exerciseGroups(
        block.exercises,
      ).entries()) {
        for (const exercise of group.exercises) {
          const result = session.results.find(
            (r) =>
              r.blockId === block.id &&
              r.round === round &&
              r.prescribedId === exercise.id,
          );
          if (result)
            entries.push({
              blockIndex,
              block,
              round,
              groupIndex,
              group,
              exercise,
              result,
            });
        }
      }
    }
  }
  return entries;
}
export function nextExercise(session: WorkoutSession) {
  return (
    workoutSequence(session).find(
      (entry) =>
        entry.result.status !== "done" && entry.result.status !== "skipped",
    ) ?? null
  );
}
