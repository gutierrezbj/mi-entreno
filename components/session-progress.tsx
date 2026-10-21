"use client";
import type { WorkoutSession } from "@/lib/model";
import { completion, nextExercise } from "@/lib/tracking";
export default function SessionProgress({
  session,
  onNext,
}: {
  session: WorkoutSession;
  onNext: (blockIndex: number, resultId: string) => void;
}) {
  const total = session.template.blocks.reduce(
    (n, b) => n + b.rounds * b.exercises.length,
    0,
  );
  const stats = completion(session.results, total);
  const next = nextExercise(session);
  return (
    <section className="session-progress" aria-label="Tu avance">
      <div className="completion-label">
        <span className="eyebrow">TU AVANCE</span>
        <strong aria-live="polite">
          {stats.done}
          <span> / {total} ejercicios</span>
        </strong>
      </div>
      <progress
        max={Math.max(1, total)}
        value={stats.done}
        aria-label="Avance de la sesión"
        aria-valuetext={`${stats.done} de ${total} ejercicios completados, ${stats.percent} por ciento`}
      />
      <div className="progress-summary">
        <span>{stats.percent}% completado</span>
        <span>
          {stats.partial} parciales · {stats.skipped} omitidos
        </span>
      </div>
      {next ? (
        <button
          className="next-exercise"
          onClick={() => onNext(next.blockIndex, next.result.id)}
        >
          <span>
            <small>
              Siguiente pendiente · {next.block.name} · Ronda {next.round} ·{" "}
              {next.group.paired ? "Superset" : "Ejercicio"}{" "}
              {next.groupIndex + 1}
            </small>
            <strong>{next.exercise.name}</strong>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      ) : (
        <p className="small">
          {stats.done === total
            ? "Todo marcado. Puedes finalizar la sesión."
            : "No quedan ejercicios pendientes. Puedes guardar tu sesión parcial."}
        </p>
      )}
    </section>
  );
}
