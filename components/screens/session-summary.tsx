import { formatDuration, progress, type WorkoutSession } from "@/lib/model";
import Icon from "../icon";
export default function SessionSummary({
  session,
  pending,
  onHistory,
}: {
  session: WorkoutSession;
  pending: boolean;
  onHistory: () => void;
}) {
  const stats = progress(session);
  return (
    <section className="session-summary">
      <div className="summary-check">
        <Icon name="check" size={42} />
      </div>
      <h1>
        {session.status === "completed"
          ? "¡Entrenamiento completado!"
          : "Sesión parcial guardada"}
      </h1>
      <p>{session.template.name}</p>
      <p className="muted small">
        {new Date(session.date + "T12:00:00").toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <div className="metric-grid">
        <div className="card metric-card">
          <span>Tiempo activo</span>
          <strong>{formatDuration(session.durationMs)}</strong>
        </div>
        <div className="card metric-card">
          <span>Ejercicios hechos</span>
          <strong>
            {stats.done} / {stats.total}
          </strong>
        </div>
      </div>
      {pending && <span className="badge">Pendiente de sincronizar</span>}
      {session.notes && (
        <div className="card summary-notes">
          <h2>Tus notas</h2>
          <p>{session.notes}</p>
        </div>
      )}
      <p className="muted small">
        Lo que has hecho cuenta. Tu registro conserva también los parciales y
        los omitidos.
      </p>
      <button className="primary" onClick={onHistory}>
        Ver historial <Icon name="arrow" size={17} />
      </button>
    </section>
  );
}
