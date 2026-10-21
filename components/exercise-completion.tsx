"use client";
import type { ExerciseResult, PrescribedExercise } from "@/lib/model";
import { targetProgress, toggleDone } from "@/lib/tracking";
export default function ExerciseCompletion({
  exercise,
  result,
  onChange,
}: {
  exercise: PrescribedExercise;
  result: ExerciseResult;
  onChange: (result: ExerciseResult) => void;
}) {
  const percent = targetProgress(exercise, result);
  const done = result.status === "done";
  const confirmTarget = result.actual === null;
  const name = done
    ? `Desmarcar ${exercise.name} ronda ${result.round}`
    : confirmTarget
      ? `Confirmar ${exercise.target} ${exercise.unit} realizados en ${exercise.name} ronda ${result.round}`
      : `Marcar ${exercise.name} ronda ${result.round} como hecho`;
  return (
    <div className="exercise-completion">
      <div className="exercise-progress-label">
        <span>
          {result.status === "skipped"
            ? "Omitido"
            : result.actual === null
              ? "Sin valor registrado"
              : `${result.actual} / ${exercise.target} ${exercise.unit}`}
        </span>
        {percent !== null && <strong>{percent}% del objetivo</strong>}
      </div>
      {exercise.target > 0 && (
        <progress
          max={100}
          value={percent ?? 0}
          aria-label={`Objetivo de ${exercise.name} ronda ${result.round}`}
          aria-valuetext={
            percent === null
              ? "Sin valor registrado"
              : `${result.actual} de ${exercise.target} ${exercise.unit}, ${percent} por ciento del objetivo`
          }
        />
      )}
      <button
        className={`done-toggle ${done ? "is-done" : ""}`}
        aria-label={name}
        aria-pressed={done}
        onClick={() => onChange(toggleDone(exercise, result))}
      >
        <span className="done-check" aria-hidden="true">
          {done ? "✓" : ""}
        </span>
        <span>
          {done
            ? "Hecho · Desmarcar"
            : confirmTarget
              ? `He hecho ${exercise.target} ${exercise.unit}`
              : "Marcar como hecho"}
        </span>
      </button>
      {confirmTarget && result.status !== "skipped" && (
        <p className="muted small">
          Si hiciste otra cantidad, introdúcela en «Real».
        </p>
      )}
    </div>
  );
}
