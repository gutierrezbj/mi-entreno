"use client";
import { useState } from "react";
import {
  units,
  templateSchema,
  type WorkoutTemplate,
  type PrescribedExercise,
} from "@/lib/model";
import {
  exerciseGroups,
  withStructure,
  equipmentLabels,
  type Equipment,
} from "@/lib/structure";
import EquipmentTag from "./equipment-tag";
const blankExercise = (
  supersetId: string | null = null,
): PrescribedExercise => ({
  id: crypto.randomUUID(),
  exerciseId: crypto.randomUUID(),
  name: "Nuevo ejercicio",
  unit: "reps",
  target: 1,
  loadKg: null,
  restSeconds: 0,
  uncertain: false,
  equipment: "unspecified",
  supersetId,
});
function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
export default function Editor({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: WorkoutTemplate;
  isNew: boolean;
  onSave: (t: WorkoutTemplate, isNew: boolean) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(() =>
    withStructure(structuredClone(initial)),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function block(
    index: number,
    change: Partial<WorkoutTemplate["blocks"][number]>,
  ) {
    setValue((v) => ({
      ...v,
      blocks: v.blocks.map((b, i) => (i === index ? { ...b, ...change } : b)),
    }));
  }
  function exercise(
    bi: number,
    ei: number,
    change: Partial<PrescribedExercise>,
  ) {
    block(bi, {
      exercises: value.blocks[bi].exercises.map((e, i) =>
        i === ei ? { ...e, ...change } : e,
      ),
    });
  }
  function regroup(bi: number, exerciseId: string, supersetId: string | null) {
    const exercises = value.blocks[bi].exercises.map((ex) =>
      ex.id === exerciseId ? { ...ex, supersetId } : ex,
    );
    block(bi, {
      exercises: exerciseGroups(exercises).flatMap((g) => g.exercises),
    });
  }
  function moveGroup(bi: number, from: number, to: number) {
    block(bi, {
      exercises: move(
        exerciseGroups(value.blocks[bi].exercises),
        from,
        to,
      ).flatMap((g) => g.exercises),
    });
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const parsed = templateSchema.safeParse(value);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        setBusy(true);
        try {
          await onSave(parsed.data, isNew);
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo guardar");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONSTRUCTOR · V{value.version}</p>
          <h1>{isNew ? "Nueva rutina" : "Hazla tuya"}</h1>
        </div>
        <button type="button" className="quiet" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      <p className="muted">
        Los cambios se aplican a futuras sesiones. Tu histórico conserva el plan
        original.
      </p>
      <div className="card fields">
        <label>
          Nombre de la rutina
          <input
            value={value.name}
            maxLength={120}
            required
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label>
          Referencia del circuito (min)
          <input
            type="number"
            min="1"
            max="1000000"
            value={value.targetMinutes}
            onChange={(e) =>
              setValue({ ...value, targetMinutes: Number(e.target.value) })
            }
          />
        </label>
      </div>
      {value.blocks.map((b, bi) => (
        <section className="card editor-block" key={b.id}>
          <div className="section-heading">
            <span className="eyebrow">BLOQUE {bi + 1}</span>
            <div className="actions">
              <button
                type="button"
                aria-label={`Subir bloque ${bi + 1}`}
                disabled={bi === 0}
                onClick={() =>
                  setValue({ ...value, blocks: move(value.blocks, bi, bi - 1) })
                }
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Bajar bloque ${bi + 1}`}
                disabled={bi === value.blocks.length - 1}
                onClick={() =>
                  setValue({ ...value, blocks: move(value.blocks, bi, bi + 1) })
                }
              >
                ↓
              </button>
              <button
                type="button"
                className="danger"
                disabled={value.blocks.length === 1}
                onClick={() =>
                  setValue({
                    ...value,
                    blocks: value.blocks.filter((x) => x.id !== b.id),
                  })
                }
              >
                Quitar bloque
              </button>
            </div>
          </div>
          <div className="fields">
            <label>
              Nombre del bloque
              <input
                value={b.name}
                required
                maxLength={120}
                onChange={(e) => block(bi, { name: e.target.value })}
              />
            </label>
            <label>
              Rondas
              <input
                type="number"
                min="1"
                max="20"
                value={b.rounds}
                onChange={(e) => block(bi, { rounds: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="muted small">
            Agrupa los ejercicios que van juntos y distingue el material de cada
            uno.
          </p>
          {exerciseGroups(b.exercises).map((group, gi, groups) => (
            <section className="editor-superset" key={group.id}>
              <div className="superset-heading">
                <span className="superset-index">
                  {String(gi + 1).padStart(2, "0")}
                </span>
                <h3>
                  {group.paired ? `Superset ${gi + 1}` : "Ejercicio individual"}
                </h3>
                <div className="actions">
                  <button
                    type="button"
                    aria-label={`Subir grupo ${bi + 1}.${gi + 1}`}
                    disabled={gi === 0}
                    onClick={() => moveGroup(bi, gi, gi - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar grupo ${bi + 1}.${gi + 1}`}
                    disabled={gi === groups.length - 1}
                    onClick={() => moveGroup(bi, gi, gi + 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
              {group.exercises.map((ex, withinGroup) => {
                const ei = b.exercises.findIndex((e) => e.id === ex.id);
                return (
                  <div className="editor-exercise" key={ex.id}>
                    <EquipmentTag kind={ex.equipment} />
                    <div className="metrics">
                      <label>
                        Tipo de ejercicio
                        <select
                          aria-label={`Tipo ${bi + 1}.${ei + 1}`}
                          value={ex.equipment ?? "unspecified"}
                          onChange={(e) =>
                            exercise(bi, ei, {
                              equipment: e.target.value as Equipment,
                            })
                          }
                        >
                          {Object.entries(equipmentLabels).map(
                            ([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Agrupación
                        <select
                          aria-label={`Agrupación ${bi + 1}.${ei + 1}`}
                          value={ex.supersetId ?? ""}
                          onChange={(e) =>
                            regroup(
                              bi,
                              ex.id,
                              e.target.value === "new"
                                ? crypto.randomUUID()
                                : e.target.value || null,
                            )
                          }
                        >
                          <option value="">Individual</option>
                          {groups.map((g, j) =>
                            g.paired ? (
                              <option key={g.id} value={g.id}>
                                Superset {j + 1}
                              </option>
                            ) : null,
                          )}
                          <option value="new">+ Nuevo superset</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      Ejercicio {ei + 1}
                      <input
                        aria-label={`Nombre ejercicio ${bi + 1}.${ei + 1}`}
                        required
                        maxLength={120}
                        value={ex.name}
                        onChange={(e) =>
                          exercise(bi, ei, {
                            name: e.target.value,
                            exerciseId: crypto.randomUUID(),
                          })
                        }
                      />
                    </label>
                    <div className="metrics">
                      <label>
                        Objetivo
                        <input
                          aria-label={`Objetivo ${bi + 1}.${ei + 1}`}
                          type="number"
                          step="any"
                          min="0"
                          max="1000000"
                          required
                          value={ex.target}
                          onChange={(e) =>
                            exercise(bi, ei, { target: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Unidad
                        <select
                          value={ex.unit}
                          onChange={(e) =>
                            exercise(bi, ei, {
                              unit: e.target
                                .value as PrescribedExercise["unit"],
                            })
                          }
                        >
                          {units.map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Carga (kg)
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="1000000"
                          value={ex.loadKg ?? ""}
                          placeholder="Sin definir"
                          onChange={(e) =>
                            exercise(bi, ei, {
                              loadKg:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Descanso (s)
                        <input
                          type="number"
                          min="0"
                          max="1000000"
                          value={ex.restSeconds}
                          onChange={(e) =>
                            exercise(bi, ei, {
                              restSeconds: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={ex.uncertain}
                        onChange={(e) =>
                          exercise(bi, ei, { uncertain: e.target.checked })
                        }
                      />{" "}
                      Transcripción por confirmar
                    </label>
                    <div className="actions">
                      <button
                        type="button"
                        aria-label={`Subir ${ex.name}`}
                        disabled={withinGroup === 0}
                        onClick={() =>
                          block(bi, {
                            exercises: move(b.exercises, ei, ei - 1),
                          })
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar ${ex.name}`}
                        disabled={withinGroup === group.exercises.length - 1}
                        onClick={() =>
                          block(bi, {
                            exercises: move(b.exercises, ei, ei + 1),
                          })
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="quiet danger"
                        disabled={b.exercises.length === 1}
                        onClick={() =>
                          block(bi, {
                            exercises: b.exercises.filter(
                              (x) => x.id !== ex.id,
                            ),
                          })
                        }
                      >
                        Quitar ejercicio
                      </button>
                    </div>
                  </div>
                );
              })}
              {group.paired && (
                <button
                  type="button"
                  className="outline"
                  onClick={() =>
                    block(bi, {
                      exercises: exerciseGroups([
                        ...b.exercises,
                        blankExercise(group.id),
                      ]).flatMap((g) => g.exercises),
                    })
                  }
                >
                  + Añadir a este superset
                </button>
              )}
            </section>
          ))}
          <button
            type="button"
            className="outline"
            onClick={() =>
              block(bi, { exercises: [...b.exercises, blankExercise()] })
            }
          >
            + Añadir ejercicio
          </button>
          <button
            type="button"
            className="outline"
            onClick={() => {
              const id = crypto.randomUUID();
              block(bi, {
                exercises: [
                  ...b.exercises,
                  blankExercise(id),
                  blankExercise(id),
                ],
              });
            }}
          >
            + Añadir superset
          </button>
        </section>
      ))}
      <button
        type="button"
        className="outline"
        onClick={() =>
          setValue({
            ...value,
            blocks: [
              ...value.blocks,
              {
                id: crypto.randomUUID(),
                name: `Bloque ${value.blocks.length + 1}`,
                rounds: 1,
                exercises: [blankExercise()],
              },
            ],
          })
        }
      >
        + Añadir bloque
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="save-bar">
        <button className="primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar rutina"}
        </button>
      </div>
    </form>
  );
}
