import Image from "next/image";
import type { Draft, WorkoutTemplate, WorkoutSession } from "@/lib/model";
import { formatDuration } from "@/lib/model";
import { weekActivity } from "@/lib/insights";
import Icon from "../icon";
const shortDate = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
export default function Home({
  sessions,
  templates,
  draft,
  onStart,
  onRoutines,
  onRoutine,
  onHistory,
  ready,
}: {
  sessions: WorkoutSession[];
  templates: WorkoutTemplate[];
  draft: Draft | null;
  onStart: () => void;
  onRoutines: () => void;
  onRoutine: (id: string) => void;
  onHistory: () => void;
  ready: boolean;
}) {
  const week = weekActivity(sessions);
  const latest = [...sessions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.startedAt ?? "").localeCompare(a.startedAt ?? ""),
  )[0];
  return (
    <div className="home-screen">
      <section className="card week-card">
        <div className="section-heading">
          <h2>Esta semana</h2>
          <span className="muted small">
            {week.count} {week.count === 1 ? "sesión" : "sesiones"}
          </span>
        </div>
        <p className="muted small">
          {shortDate(week.start)} — {shortDate(week.end)}
        </p>
        <div className="week-track" aria-label="Días con sesiones registradas">
          {week.days.map((day) => (
            <span key={day.date} className={day.count ? "recorded" : ""} />
          ))}
        </div>
        <div className="week-days">
          {week.days.map((day) => (
            <span
              key={day.date}
              aria-label={`${day.date}: ${day.count} sesiones`}
              className={`${day.count ? "recorded" : ""} ${day.isToday ? "today" : ""}`}
            >
              {day.label}
            </span>
          ))}
        </div>
      </section>
      <section className="home-hero">
        <Image
          src="/images/training-hero.webp"
          alt="Entrenamiento funcional en gimnasio con empuje de trineo"
          fill
          sizes="(max-width: 520px) 100vw, 480px"
          priority
        />
        <div className="hero-shade" />
        <div className="hero-caption">
          <span>MI ENTRENO</span>
          <h1>
            Tu entrenamiento.
            <br />A tu ritmo.
          </h1>
          <p>Cada sesión cuenta.</p>
        </div>
        <button
          className="primary"
          disabled={!ready || (!draft && !templates.length)}
          onClick={onStart}
        >
          <Icon name="play" size={17} />
          {draft ? "Retomar sesión" : "Comenzar sesión"}
        </button>
      </section>
      <div className="metric-grid">
        <div className="card metric-card">
          <span>Última sesión</span>
          <strong
            className={latest?.durationMs == null ? "no-measurement" : ""}
          >
            {latest ? formatDuration(latest.durationMs) : "—"}
          </strong>
          <small>
            {latest ? shortDate(latest.date) : "Tu primer registro te espera"}
          </small>
        </div>
        <div className="card metric-card">
          <span>Mis rutinas</span>
          <strong>{templates.length}</strong>
          <small>
            {templates.length === 1
              ? "Rutina disponible"
              : "Rutinas disponibles"}
          </small>
        </div>
      </div>
      <div className="section-heading">
        <h2>Mis rutinas</h2>
        <button className="quiet" onClick={onRoutines}>
          Ver todas <Icon name="arrow" size={14} />
        </button>
      </div>
      {templates[0] ? (
        <button
          className="routine-list-card"
          onClick={() => onRoutine(templates[0].id)}
          aria-label={`Ver rutina ${templates[0].name}`}
        >
          <span className="routine-symbol blue">
            <Icon name="dumbbell" size={26} />
          </span>
          <span className="routine-list-copy">
            <strong>{templates[0].name}</strong>
            <small>
              {templates[0].blocks.length} bloques · Ref.{" "}
              {templates[0].targetMinutes} min
            </small>
            <span className="current-tag">Rutina actual</span>
          </span>
          <Icon name="arrow" size={17} />
        </button>
      ) : (
        <p className="card muted">Crea tu primera rutina para comenzar.</p>
      )}
      <button className="home-history-link" onClick={onHistory}>
        <Icon name="history" size={18} />
        <span>Ver mi historial</span>
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}
