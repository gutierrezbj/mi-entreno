"use client";
import { useState } from "react";
import { formatDuration, type WorkoutSession } from "@/lib/model";
import { sessionInsights } from "@/lib/insights";
import Icon from "../icon";
export default function Insights({ sessions }: { sessions: WorkoutSession[] }) {
  const [tab, setTab] = useState<"summary" | "exercises">("summary");
  const stats = sessionInsights(sessions);
  const measured = [...sessions]
    .filter((s) => s.durationMs !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8);
  const metrics = sessions.flatMap((s) =>
    s.results
      .filter(
        (r) => r.actual !== null && ["done", "partial"].includes(r.status),
      )
      .map((r) => ({
        result: r,
        session: s,
        exercise: s.template.blocks
          .flatMap((b) => b.exercises)
          .find((ex) => ex.id === r.prescribedId)!,
      })),
  );
  const max = Math.max(1, ...measured.map((s) => s.durationMs!));
  return (
    <>
      <div className="screen-title">
        <h1>Progreso</h1>
        <span className="muted small">Tus datos registrados</span>
      </div>
      <div className="segmented">
        <button
          aria-pressed={tab === "summary"}
          onClick={() => setTab("summary")}
        >
          Resumen
        </button>
        <button
          aria-pressed={tab === "exercises"}
          onClick={() => setTab("exercises")}
        >
          Ejercicios
        </button>
      </div>
      {tab === "summary" ? (
        <>
          <div className="metric-grid insights-grid">
            <div className="card metric-card">
              <span>
                <Icon name="progress" size={18} />
                Sesiones
              </span>
              <strong>{stats.count}</strong>
              <small>{stats.partial} parciales</small>
            </div>
            <div className="card metric-card">
              <span>
                <Icon name="timer" size={18} />
                Tiempo medio
              </span>
              <strong
                className={stats.averageMs === null ? "no-measurement" : ""}
              >
                {formatDuration(stats.averageMs)}
              </strong>
              <small>{stats.measured} con duración medida</small>
            </div>
            <div className="card metric-card">
              <span>
                <Icon name="check" size={18} />
                Ejercicios hechos
              </span>
              <strong>{stats.completedExercises}</strong>
              <small>Confirmados por ti</small>
            </div>
            <div className="card metric-card">
              <span>
                <Icon name="history" size={18} />
                Registros parciales
              </span>
              <strong>{stats.partial}</strong>
              <small>También cuentan como sesiones</small>
            </div>
          </div>
          <section className="card">
            <h2>Tiempo por sesión</h2>
            {measured.length ? (
              <div
                className="session-chart"
                aria-label="Duraciones registradas"
              >
                {measured.map((s) => (
                  <div className="chart-column" key={s.id}>
                    <span>{formatDuration(s.durationMs)}</span>
                    <div
                      className="chart-bar"
                      style={{
                        height: Math.max(3, (s.durationMs! / max) * 100),
                      }}
                    />
                    <small>
                      {new Date(s.date + "T12:00:00").toLocaleDateString(
                        "es-ES",
                        { day: "numeric", month: "short" },
                      )}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-copy">
                Todavía no hay duraciones medidas. Aparecerán aquí después de
                guardar un entrenamiento con cronómetro.
              </p>
            )}
          </section>
        </>
      ) : (
        <section className="card">
          <h2>Resultados por ejercicio</h2>
          {metrics.length ? (
            metrics.map(({ result: r, session: s, exercise: ex }) => (
              <div className="history-row" key={`${s.id}-${r.id}`}>
                <div>
                  <strong>{ex.name}</strong>
                  <p className="muted small">
                    {new Date(s.date + "T12:00:00").toLocaleDateString("es-ES")}{" "}
                    · Ronda {r.round}
                  </p>
                </div>
                <div>
                  <strong>
                    {r.actual} {ex.unit}
                  </strong>
                  {r.loadKg !== null && (
                    <p className="muted small">{r.loadKg} kg</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-copy">
              Aún no hay métricas por ejercicio. Tus próximos resultados se
              mostrarán con su unidad original.
            </p>
          )}
        </section>
      )}
    </>
  );
}
