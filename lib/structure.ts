import type { PrescribedExercise, WorkoutTemplate } from "./model";

export const equipmentLabels = {
  machine: "Máquina",
  bodyweight: "Peso corporal",
  weighted: "Con carga",
  unspecified: "Sin clasificar",
} as const;
export type Equipment = keyof typeof equipmentLabels;
export type ExerciseGroup = {
  id: string;
  paired: boolean;
  exercises: PrescribedExercise[];
};

const seedId = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
const seedEquipment: Record<string, Equipment> = Object.fromEntries(
  [
    [1, "machine"],
    [2, "bodyweight"],
    [3, "machine"],
    [4, "bodyweight"],
    [5, "machine"],
    [6, "bodyweight"],
    [7, "machine"],
    [8, "bodyweight"],
    [9, "weighted"],
  ].map(([n, kind]) => [seedId(Number(n)), kind as Equipment]),
);

// Compatibility for the original seeded plan only. Never guess equipment from a unit,
// arbitrary exercise name, or list position. New/edited plans store the metadata explicitly.
export function exerciseStructure(
  exercise: PrescribedExercise,
): PrescribedExercise {
  if (exercise.equipment !== undefined || exercise.supersetId !== undefined)
    return exercise;
  const slot = Number(exercise.id.slice(-12));
  const block = Math.floor((slot - 300) / 10);
  const index = (slot - 300) % 10;
  const expectedDefinition =
    index === 7 ? (block === 2 ? 5 : 8 + block) : index + 1;
  if (
    block < 0 ||
    block > 2 ||
    index < 0 ||
    index > 7 ||
    exercise.id !== seedId(slot) ||
    exercise.exerciseId !== seedId(expectedDefinition)
  )
    return exercise;
  return {
    ...exercise,
    supersetId: seedId(600 + block * 10 + Math.floor(index / 2)),
    equipment: seedEquipment[exercise.exerciseId],
  };
}

export function exerciseGroups(
  exercises: PrescribedExercise[],
): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  for (const original of exercises) {
    const exercise = exerciseStructure(original);
    const id = exercise.supersetId ?? exercise.id;
    let group = groups.find((g) => g.id === id);
    if (!group) {
      group = { id, paired: exercise.supersetId != null, exercises: [] };
      groups.push(group);
    }
    group.exercises.push(exercise);
  }
  return groups;
}
export function withStructure(template: WorkoutTemplate): WorkoutTemplate {
  return {
    ...template,
    blocks: template.blocks.map((b) => ({
      ...b,
      exercises: b.exercises.map(exerciseStructure),
    })),
  };
}
export function groupSummary(exercises: PrescribedExercise[]) {
  const groups = exerciseGroups(exercises);
  const pairs = groups.filter((g) => g.paired).length;
  const singles = groups.filter((g) => !g.paired).length;
  return [
    pairs ? `${pairs} ${pairs === 1 ? "superset" : "supersets"}` : "",
    singles
      ? `${singles} ${singles === 1 ? "individual" : "individuales"}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
