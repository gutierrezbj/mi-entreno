"use client";
import { useState } from "react";
import {
  units,
  templateSchema,
  type WorkoutTemplate,
  type PrescribedExercise,
} from "@/lib/model";
const blankExercise = (): PrescribedExercise => ({
  id: crypto.randomUUID(),
  exerciseId: crypto.randomUUID(),
  name: "Nuevo ejercicio",
  unit: "reps",
  target: 1,
  loadKg: null,
  restSeconds: 0,
  uncertain: false,
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
  const [value, setValue] = useState(() => structuredClone(initial));
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
          {b.exercises.map((ex, ei) => (
            <div className="editor-exercise" key={ex.id}>
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
                        unit: e.target.value as PrescribedExercise["unit"],
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
                          e.target.value === "" ? null : Number(e.target.value),
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
                      exercise(bi, ei, { restSeconds: Number(e.target.value) })
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
                  disabled={ei === 0}
                  onClick={() =>
                    block(bi, { exercises: move(b.exercises, ei, ei - 1) })
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${ex.name}`}
                  disabled={ei === b.exercises.length - 1}
                  onClick={() =>
                    block(bi, { exercises: move(b.exercises, ei, ei + 1) })
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
                      exercises: b.exercises.filter((x) => x.id !== ex.id),
                    })
                  }
                >
                  Quitar ejercicio
                </button>
              </div>
            </div>
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
