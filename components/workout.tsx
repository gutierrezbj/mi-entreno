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
import { exerciseGroups } from "@/lib/structure";
import EquipmentTag from "./equipment-tag";
import CompletionLine from "./completion-line";
import NumberStepper from "./number-stepper";
import ExerciseArt from "./exercise-art";
import Icon from "./icon";
import ExerciseCompletion from "./exercise-completion";
import SessionProgress from "./session-progress";
import { completion, nextExercise, workoutSequence } from "@/lib/tracking";
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
  const sequence = workoutSequence(draft.session);
  const [mode, setMode] = useState<"exercise" | "circuit">("exercise");
  const [focusedId, setFocusedId] = useState(
    () => nextExercise(draft.session)?.result.id ?? sequence[0]?.result.id,
  );
  const current =
    sequence.find((entry) => entry.result.id === focusedId) ?? sequence[0];
  const currentIndex = sequence.findIndex(
    (entry) => entry.result.id === current?.result.id,
  );
  function selectExercise(index: number) {
    const entry = sequence[index];
    if (!entry) return;
    setFocusedId(entry.result.id);
    setTab(entry.blockIndex);
    setFocusResult({ id: entry.result.id });
  }

  const [tab, setTab] = useState(
    () => nextExercise(draft.session)?.blockIndex ?? 0,
  );
  const [focusResult, setFocusResult] = useState<{ id: string } | null>(null);
  useEffect(() => {
    if (!focusResult) return;
    const element = document.getElementById(`exercise-${focusResult.id}`);
    element?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    element?.focus({ preventScroll: true });
  }, [focusResult, tab]);
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
    <div className={`workout-view ${mode === "exercise" ? "is-focused" : ""}`}>
      <div className="workout-title">
        <div>
          <p className="eyebrow">ENTRENAMIENTO</p>
          <h1>{session.template.name}</h1>
        </div>
        <span className="pill">
          Bloque {tab + 1} de {session.template.blocks.length}
        </span>
      </div>
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
      <SessionProgress
        session={session}
        onNext={(blockIndex, resultId) => {
          setTab(blockIndex);
          setFocusedId(resultId);
          setFocusResult({ id: resultId });
        }}
      />
      <div className="segmented workout-mode">
        <button
          aria-pressed={mode === "exercise"}
          onClick={() => setMode("exercise")}
        >
          Ejercicio
        </button>
        <button
          aria-pressed={mode === "circuit"}
          onClick={() => setMode("circuit")}
        >
          Circuito completo
        </button>
      </div>
      <div className="block-tabs" aria-label="Bloques">
        {session.template.blocks.map((block, i) => (
          <button
            aria-pressed={tab === i}
            key={block.id}
            onClick={() => {
              setFocusResult(null);
              setTab(i);
              const entry =
                sequence.find(
                  (e) =>
                    e.blockIndex === i &&
                    e.result.status !== "done" &&
                    e.result.status !== "skipped",
                ) ?? sequence.find((e) => e.blockIndex === i);
              if (entry) setFocusedId(entry.result.id);
            }}
          >
            {block.name}
            <small>
              {
                completion(
                  session.results.filter((r) => r.blockId === block.id),
                  block.exercises.length * block.rounds,
                ).done
              }
              /{block.exercises.length * block.rounds}
            </small>
          </button>
        ))}
      </div>
      {Array.from({ length: b.rounds }, (_, round) => (
        <section
          key={round}
          hidden={
            mode === "exercise" &&
            (current?.block.id !== b.id || current?.round !== round + 1)
          }
        >
          <div className="section-heading">
            <h2>{b.name}</h2>
            <span className="pill">
              Ronda {round + 1} / {b.rounds}
            </span>
          </div>
          <CompletionLine
            label={`${b.name} · Ronda ${round + 1}`}
            results={session.results.filter(
              (r) => r.blockId === b.id && r.round === round + 1,
            )}
            total={b.exercises.length}
          />
          {exerciseGroups(b.exercises).map((group, groupIndex) => (
            <section
              className="workout-superset"
              key={group.id}
              hidden={
                mode === "exercise" &&
                !group.exercises.some((ex) => ex.id === current?.exercise.id)
              }
              aria-label={`${group.paired ? "Superset" : "Ejercicio individual"} ${groupIndex + 1} ronda ${round + 1}`}
            >
              <div className="superset-heading">
                <span className="superset-index">
                  {String(groupIndex + 1).padStart(2, "0")}
                </span>
                <h3>
                  {group.paired
                    ? `Superset ${groupIndex + 1}`
                    : "Ejercicio individual"}
                </h3>
                <span className="superset-completion">
                  {
                    completion(
                      session.results.filter(
                        (r) =>
                          r.blockId === b.id &&
                          r.round === round + 1 &&
                          group.exercises.some(
                            (ex) => ex.id === r.prescribedId,
                          ),
                      ),
                      group.exercises.length,
                    ).done
                  }
                  /{group.exercises.length} hechos
                </span>
              </div>
              {group.exercises.map((ex) => {
                const r = session.results.find(
                  (r) => r.prescribedId === ex.id && r.round === round + 1,
                )!;
                const previous = previousResult(
                  history,
                  ex.exerciseId,
                  ex.unit,
                );
                return (
                  <article
                    className={`card result ${r.status}`}
                    key={r.id}
                    id={`exercise-${r.id}`}
                    tabIndex={-1}
                    hidden={mode === "exercise" && r.id !== current?.result.id}
                  >
                    <EquipmentTag kind={ex.equipment} />
                    <div className="section-heading">
                      <h3>{ex.name}</h3>
                      <span className="target">
                        {ex.target} <small>{ex.unit}</small>
                      </span>
                    </div>
                    {ex.uncertain && (
                      <span className="badge">Por confirmar</span>
                    )}
                    <p className="muted small">
                      Objetivo{ex.loadKg !== null ? ` · ${ex.loadKg} kg` : ""}
                      {ex.restSeconds ? ` · Descanso ${ex.restSeconds} s` : ""}
                    </p>
                    <ExerciseArt exercise={ex} />
                    {previous && (
                      <p className="previous">
                        Anterior: {previous.actual} {ex.unit}
                        {previous.loadKg !== null
                          ? ` · ${previous.loadKg} kg`
                          : ""}{" "}
                        ·{" "}
                        {new Date(
                          previous.date + "T12:00:00",
                        ).toLocaleDateString("es-ES")}
                      </p>
                    )}
                    <div className="metrics">
                      <NumberStepper
                        label={`Real (${ex.unit})`}
                        name={`Real ${ex.name} ronda ${round + 1}`}
                        value={r.actual}
                        onChange={(actual) =>
                          result(r.id, { actual, status: "partial" })
                        }
                      />
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
                    <ExerciseCompletion
                      exercise={ex}
                      result={r}
                      onChange={(updated) => result(r.id, updated)}
                    />
                    <label className="small">
                      Estado
                      <select
                        aria-label={`Estado ${ex.name} ronda ${round + 1}`}
                        value={r.status}
                        onChange={(e) => {
                          const status = e.target
                            .value as ExerciseResult["status"];
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
                        onChange={(e) =>
                          result(r.id, { notes: e.target.value })
                        }
                        aria-label={`Notas ${ex.name}`}
                      />
                    </details>
                  </article>
                );
              })}
            </section>
          ))}
        </section>
      ))}
      {mode === "exercise" && current && (
        <div className="exercise-navigation">
          <button
            className="quiet"
            disabled={currentIndex === 0}
            onClick={() => selectExercise(currentIndex - 1)}
          >
            <Icon name="back" size={16} />
            Anterior
          </button>
          <span>
            {currentIndex + 1} / {sequence.length}
          </span>
          {sequence[currentIndex + 1] ? (
            <button
              className="secondary"
              onClick={() => selectExercise(currentIndex + 1)}
            >
              Siguiente: {sequence[currentIndex + 1].exercise.name}
              <Icon name="arrow" size={15} />
            </button>
          ) : (
            <button className="secondary" onClick={() => setMode("circuit")}>
              Ver circuito
            </button>
          )}
        </div>
      )}
      <details className="card extras-panel">
        <summary>Extras opcionales</summary>
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
      </details>
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
    </div>
  );
}
