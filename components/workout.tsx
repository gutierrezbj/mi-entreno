"use client";
import { useEffect, useState } from "react";
import {
  elapsed,
  pause,
  resume,
  formatDuration,
  progress,
  previousResult,
  type Draft,
  type ExerciseResult,
  type WorkoutSession,
  units,
} from "@/lib/model";
export default function Workout({
  draft,
  history,
  onChange,
  onFinish,
}: {
  draft: Draft;
  history: WorkoutSession[];
  onChange: (d: Draft) => void;
  onFinish: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const { session, timer } = draft;
  const b = session.template.blocks[tab] ?? session.template.blocks[0];
  const stats = progress(session);
  function result(id: string, change: Partial<ExerciseResult>) {
    onChange({
      ...draft,
      session: {
        ...session,
        results: session.results.map((r) =>
          r.id === id ? { ...r, ...change } : r,
        ),
      },
    });
  }
  return (
    <>
      <p className="eyebrow">SESIÓN EN CURSO</p>
      <h1>A tu ritmo.</h1>
      <div className="timer card">
        <div>
          <span className="eyebrow">TIEMPO ACTIVO</span>
          <strong data-testid="timer">
            {formatDuration(elapsed(timer, now))}
          </strong>
          <span className="muted">
            Referencia {session.template.targetMinutes} min · Sin corte
            automático
          </span>
        </div>
        <button
          className={timer.runningSince === null ? "primary" : "outline"}
          onClick={() => {
            const current = Date.now();
            setNow(current);
            onChange({
              ...draft,
              timer:
                timer.runningSince === null
                  ? resume(timer, current)
                  : pause(timer, current),
            });
          }}
        >
          {timer.runningSince === null ? "Reanudar" : "Pausar"}
        </button>
      </div>
      <p className="small muted">
        {timer.runningSince === null ? "En pausa" : "Cronómetro activo"} ·
        Guardado en este dispositivo · {stats.recorded} de {stats.total}{" "}
        registros anotados
      </p>
      <div className="block-tabs" aria-label="Bloques">
        {session.template.blocks.map((block, i) => (
          <button
            aria-pressed={tab === i}
            key={block.id}
            onClick={() => setTab(i)}
          >
            {block.name}
          </button>
        ))}
      </div>
      {Array.from({ length: b.rounds }, (_, round) => (
        <section key={round}>
          <div className="section-heading">
            <h2>{b.name}</h2>
            <span className="pill">
              Ronda {round + 1} / {b.rounds}
            </span>
          </div>
          {b.exercises.map((ex) => {
            const r = session.results.find(
              (r) => r.prescribedId === ex.id && r.round === round + 1,
            )!;
            const previous = previousResult(history, ex.exerciseId, ex.unit);
            return (
              <article className={`card result ${r.status}`} key={r.id}>
                <div className="section-heading">
                  <h3>{ex.name}</h3>
                  <span className="target">
                    {ex.target} <small>{ex.unit}</small>
                  </span>
                </div>
                {ex.uncertain && <span className="badge">Por confirmar</span>}
                <p className="muted small">
                  Objetivo{ex.loadKg !== null ? ` · ${ex.loadKg} kg` : ""}
                  {ex.restSeconds ? ` · Descanso ${ex.restSeconds} s` : ""}
                </p>
                {previous && (
                  <p className="previous">
                    Anterior: {previous.actual} {ex.unit}
                    {previous.loadKg !== null
                      ? ` · ${previous.loadKg} kg`
                      : ""}{" "}
                    ·{" "}
                    {new Date(previous.date + "T12:00:00").toLocaleDateString(
                      "es-ES",
                    )}
                  </p>
                )}
                <div className="metrics">
                  <label>
                    Real ({ex.unit})
                    <input
                      aria-label={`Real ${ex.name} ronda ${round + 1}`}
                      inputMode="decimal"
                      type="number"
                      min="0"
                      max="1000000"
                      step="any"
                      placeholder="Sin registrar"
                      value={r.actual ?? ""}
                      onChange={(e) =>
                        result(r.id, {
                          actual:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          status: "partial",
                        })
                      }
                    />
                  </label>
                  <label>
                    Carga real (kg)
                    <input
                      aria-label={`Carga ${ex.name} ronda ${round + 1}`}
                      inputMode="decimal"
                      type="number"
                      min="0"
                      max="1000000"
                      step="any"
                      placeholder="Sin registrar"
                      value={r.loadKg ?? ""}
                      onChange={(e) =>
                        result(r.id, {
                          loadKg:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          status: "partial",
                        })
                      }
                    />
                  </label>
                </div>
                <label className="small">
                  Estado
                  <select
                    aria-label={`Estado ${ex.name} ronda ${round + 1}`}
                    value={r.status}
                    onChange={(e) => {
                      const status = e.target.value as ExerciseResult["status"];
                      result(r.id, {
                        status,
                        ...(["pending", "skipped"].includes(status)
                          ? { actual: null, loadKg: null }
                          : {}),
                      });
                    }}
                  >
                    <option value="pending">Sin registrar</option>
                    <option value="partial">Parcial</option>
                    <option value="done" disabled={r.actual === null}>
                      Completado
                    </option>
                    <option value="skipped">Omitido</option>
                  </select>
                </label>
                <details>
                  <summary>Notas del ejercicio</summary>
                  <textarea
                    maxLength={2000}
                    value={r.notes}
                    onChange={(e) => result(r.id, { notes: e.target.value })}
                    aria-label={`Notas ${ex.name}`}
                  />
                </details>
              </article>
            );
          })}
        </section>
      ))}
      <section className="card">
        <h2>Algo más, si te apetece</h2>
        <p className="muted">
          Extras independientes del circuito. La cuerda es opcional; hasta 25
          min es una aspiración futura.
        </p>
        {session.extras.map((extra, i) => (
          <div className="editor-exercise" key={extra.id}>
            <label>
              Actividad
              <input
                value={extra.name}
                maxLength={120}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    session: {
                      ...session,
                      extras: session.extras.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    },
                  })
                }
              />
            </label>
            <div className="metrics">
              <label>
                Real
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="any"
                  value={extra.value}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      session: {
                        ...session,
                        extras: session.extras.map((x, j) =>
                          j === i ? { ...x, value: Number(e.target.value) } : x,
                        ),
                      },
                    })
                  }
                />
              </label>
              <label>
                Unidad
                <select
                  value={extra.unit}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      session: {
                        ...session,
                        extras: session.extras.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                unit: e.target.value as typeof extra.unit,
                              }
                            : x,
                        ),
                      },
                    })
                  }
                >
                  {units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="quiet danger"
              onClick={() =>
                onChange({
                  ...draft,
                  session: {
                    ...session,
                    extras: session.extras.filter((x) => x.id !== extra.id),
                  },
                })
              }
            >
              Quitar extra
            </button>
          </div>
        ))}
        <button
          className="outline"
          onClick={() =>
            onChange({
              ...draft,
              session: {
                ...session,
                extras: [
                  ...session.extras,
                  {
                    id: crypto.randomUUID(),
                    name: "Cuerda",
                    value: 0,
                    unit: "min",
                    notes: "",
                  },
                ],
              },
            })
          }
        >
          + Registrar extra
        </button>
      </section>
      <label>
        Cómo ha ido
        <textarea
          value={session.notes}
          maxLength={2000}
          placeholder="Sensaciones, adaptaciones…"
          onChange={(e) =>
            onChange({
              ...draft,
              session: { ...session, notes: e.target.value },
            })
          }
        />
      </label>
      <div className="save-bar">
        <p className="small muted">
          Lo que has hecho cuenta. Puedes guardar aunque queden ejercicios.
        </p>
        <button className="primary" onClick={onFinish}>
          Finalizar y guardar{stats.done === stats.total ? "" : " parcial"} →
        </button>
      </div>
    </>
  );
}
