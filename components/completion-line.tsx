import type { ExerciseResult } from "@/lib/model";
import { completion } from "@/lib/tracking";
export default function CompletionLine({
  results,
  total,
  label,
}: {
  results: ExerciseResult[];
  total: number;
  label: string;
}) {
  const stats = completion(results, total);
  return (
    <div className="completion-line">
      <div className="completion-label">
        <span>{label}</span>
        <strong>
          {stats.done}/{stats.total} <small>completados</small>
        </strong>
      </div>
      <progress
        max={Math.max(1, total)}
        value={stats.done}
        aria-label={label}
        aria-valuetext={`${stats.done} de ${stats.total} ejercicios completados`}
      />
    </div>
  );
}
