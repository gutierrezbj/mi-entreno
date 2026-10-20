import type {
  WorkoutTemplate,
  WorkoutSession,
  ExerciseDefinition,
} from "./model";
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
const names = [
  "Air Bike",
  "Burpees",
  "Remo",
  "Sentadillas",
  "Cinta",
  "Lunges",
  "Ski",
  "Sit-ups",
  "Thrusters",
];
export const initialExercises: ExerciseDefinition[] = names.map((name, i) => ({
  id: uuid(i + 1),
  name,
  category: "Funcional",
  instructions: "",
  defaultUnit: [0, 2, 4, 6].includes(i) ? "m" : "reps",
  media: [],
}));
export const initialTemplate: WorkoutTemplate = {
  id: uuid(100),
  version: 1,
  name: "Vuelta al entrenamiento",
  targetMinutes: 45,
  blocks: [0, 1, 2].map((b) => ({
    id: uuid(200 + b),
    name: `Bloque ${b + 1}`,
    rounds: 1,
    exercises: [
      400 + 200 * b,
      [5, 10, 15][b],
      200 + 100 * b,
      [5, 15, 25][b],
      250 + 50 * b,
      20 + 10 * b,
      200 + 100 * b,
      b === 2 ? 300 : 20,
    ].map((target, i) => {
      const ex = initialExercises[i === 7 ? (b === 2 ? 4 : 7 + b) : i];
      return {
        id: uuid(300 + b * 10 + i),
        exerciseId: ex.id,
        name: ex.name,
        unit: ex.defaultUnit,
        target,
        loadKg: null,
        restSeconds: 0,
        uncertain: i === 7,
      };
    }),
  })),
};
export const initialSession: WorkoutSession = {
  id: uuid(500),
  template: initialTemplate,
  date: "2026-10-20",
  startedAt: null,
  finishedAt: null,
  durationMs: null,
  status: "partial",
  results: [],
  extras: [],
  source: "manual",
  notes:
    "Una ronda de cada bloque. Esfuerzo intenso, mucha sudoración; vuelta tras un periodo largo. Sin métricas por ejercicio ni tiempo medido. Cuerda no registrada.",
  reportedRounds: initialTemplate.blocks.map((b) => ({
    blockId: b.id,
    rounds: 1,
  })),
};
