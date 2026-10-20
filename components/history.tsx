import { formatDuration, progress, type WorkoutSession } from "@/lib/model";
const date = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export default function History({
  sessions,
  pending,
}: {
  sessions: WorkoutSession[];
  pending: Set<string>;
}) {
  return (
    <>
      <p className="eyebrow">TU RECORRIDO</p>
      <h1>Cada sesión cuenta.</h1>
      <p className="muted">
        Tus registros, tal como fueron. Sin penalizar lo parcial.
      </p>
      {sessions.length === 0 && (
        <div className="card">Tu primera sesión te espera.</div>
      )}
      {[...sessions]
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            (b.startedAt ?? "").localeCompare(a.startedAt ?? ""),
        )
        .map((s) => {
          const p = progress(s);
          return (
            <details className="card history" key={s.id}>
              <summary>
                <span className="eyebrow">{date(s.date)}</span>
                <h2>{s.template.name}</h2>
                <div className="history-meta">
                  <span className="pill">
                    {s.status === "partial" ? "Registro parcial" : "Completada"}
                  </span>
                  <span>{formatDuration(s.durationMs)}</span>
                  {pending.has(s.id) && (
                    <span className="badge">Pendiente de sincronizar</span>
                  )}
                </div>
                <p className="muted small">
                  {s.results.length
                    ? `${p.recorded} ${p.recorded === 1 ? "registro anotado" : "registros anotados"} · ${p.done} completados`
                    : "Sin métricas por ejercicio"}{" "}
                  · Ver detalle ↓
                </p>
              </summary>
              <p className="small muted">
                Plan guardado · versión {s.template.version} · Referencia{" "}
                {s.template.targetMinutes} min
              </p>
              {s.reportedRounds.length > 0 && (
                <p>
                  Declarado:{" "}
                  {s.reportedRounds
                    .map(
                      (r) =>
                        `${r.rounds} ronda de ${s.template.blocks.find((b) => b.id === r.blockId)?.name}`,
                    )
                    .join(", ")}
                  . No equivale a resultados individuales medidos.
                </p>
              )}
              {s.template.blocks.map((b) => (
                <div key={b.id}>
                  <h3>{b.name}</h3>
                  {s.results
                    .filter((r) => r.blockId === b.id && r.status !== "pending")
                    .map((r) => {
                      const ex = b.exercises.find(
                        (e) => e.id === r.prescribedId,
                      )!;
                      return (
                        <div className="history-row" key={r.id}>
                          <div>
                            <strong>{ex.name}</strong>
                            <p className="muted small">
                              Ronda {r.round} · Objetivo {ex.target} {ex.unit}
                              {ex.uncertain ? " · Por confirmar" : ""}
                            </p>
                            {r.notes && <p>{r.notes}</p>}
                          </div>
                          <div>
                            <strong>
                              {r.actual === null
                                ? "Sin valor"
                                : `${r.actual} ${ex.unit}`}
                            </strong>
                            {r.loadKg !== null && <p>{r.loadKg} kg</p>}
                            <p className="muted small">
                              {
                                {
                                  done: "Completado",
                                  partial: "Parcial",
                                  skipped: "Omitido",
                                  pending: "Sin registrar",
                                }[r.status]
                              }
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
              {s.extras.length > 0 && (
                <>
                  <h3>Extras opcionales</h3>
                  {s.extras.map((e) => (
                    <p key={e.id}>
                      {e.name}: {e.value} {e.unit}
                    </p>
                  ))}
                </>
              )}
              {s.notes && <p className="note">{s.notes}</p>}
            </details>
          );
        })}
    </>
  );
}
