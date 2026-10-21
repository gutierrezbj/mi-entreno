"use client";
import { useState } from "react";
import type { WorkoutTemplate } from "@/lib/model";
import { groupSummary } from "@/lib/structure";
import PlanStructure from "../plan-structure";
import Icon from "../icon";
export default function Routines({
  templates,
  selected,
  detail,
  onSelect,
  onBack,
  onNew,
  onEdit,
  onDuplicate,
  onDelete,
  onStart,
  ready,
  active,
}: {
  templates: WorkoutTemplate[];
  selected: WorkoutTemplate | undefined;
  detail: boolean;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNew: () => void;
  onEdit: (t: WorkoutTemplate) => void;
  onDuplicate: (t: WorkoutTemplate) => void;
  onDelete: (id: string) => Promise<void>;
  onStart: () => void;
  ready: boolean;
  active: boolean;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (!detail || !selected)
    return (
      <>
        <div className="screen-title">
          <h1>Rutinas</h1>
          <button
            className="icon-button"
            aria-label="Nueva rutina"
            onClick={onNew}
          >
            <Icon name="plus" />
          </button>
        </div>
        <p className="muted screen-intro">Tus circuitos, a tu medida.</p>
        <div className="routine-list">
          {templates.map((t, i) => (
            <button
              className={`routine-list-card ${selected?.id === t.id ? "selected" : ""}`}
              key={t.id}
              aria-label={`Ver rutina ${t.name}`}
              onClick={() => onSelect(t.id)}
            >
              <span
                className={`routine-symbol ${["blue", "lime", "purple", "orange"][i % 4]}`}
              >
                <Icon name="dumbbell" size={27} />
              </span>
              <span className="routine-list-copy">
                <strong>{t.name}</strong>
                <small>
                  {t.blocks.length} bloques · Ref. {t.targetMinutes} min
                </small>
                {selected?.id === t.id && (
                  <span className="current-tag">Rutina actual</span>
                )}
              </span>
              <Icon name="arrow" size={16} />
            </button>
          ))}
        </div>
        {!templates.length && (
          <p className="card empty-copy">
            Crea tu primera rutina para empezar a entrenar.
          </p>
        )}
        <button className="secondary wide" onClick={onNew}>
          <Icon name="plus" size={18} />
          Nueva rutina
        </button>
      </>
    );
  return (
    <>
      <div className="routine-detail-title">
        <button
          className="icon-button"
          aria-label="Volver a mis rutinas"
          onClick={onBack}
        >
          <Icon name="back" />
        </button>
        <span className="routine-symbol blue">
          <Icon name="dumbbell" size={24} />
        </span>
        <div>
          <h1>{selected.name}</h1>
          <p>
            {selected.blocks.length} bloques · Ref. {selected.targetMinutes} min
          </p>
        </div>
        <button
          className="round-play"
          aria-label="Empezar entrenamiento"
          disabled={!ready}
          onClick={onStart}
        >
          <Icon name="play" size={20} />
        </button>
      </div>
      <div className="routine-toolbar">
        <button className="quiet" onClick={() => onEdit(selected)}>
          Editar rutina
        </button>
        <button className="quiet" onClick={() => onDuplicate(selected)}>
          Duplicar
        </button>
        <button
          className="quiet danger"
          onClick={() => setDeleteId(selected.id)}
        >
          Eliminar
        </button>
      </div>
      {deleteId === selected.id && (
        <div className="notice" role="alert">
          ¿Eliminar esta plantilla? Las sesiones guardadas se conservan.
          <div className="actions">
            <button
              className="danger"
              onClick={async () => {
                try {
                  await onDelete(selected.id);
                  setDeleteId(null);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "No se pudo eliminar",
                  );
                }
              }}
            >
              Sí, eliminar
            </button>
            <button onClick={() => setDeleteId(null)}>Cancelar</button>
          </div>
          {error && <p>{error}</p>}
        </div>
      )}
      <div className="section-heading compact-heading">
        <h2>Tu plan de hoy</h2>
        <span className="muted small">Editable, siempre</span>
      </div>
      {selected.blocks.map((b, i) => (
        <details
          className={`card plan-block block-color-${i % 3}`}
          key={b.id}
          open={i === 0}
        >
          <summary>
            <span className="block-dot" />
            <span>
              <strong>{b.name}</strong>
              <span className="muted small">
                {groupSummary(b.exercises)} · {b.rounds}{" "}
                {b.rounds === 1 ? "ronda" : "rondas"}
              </span>
            </span>
            <span className="expand">+</span>
          </summary>
          <PlanStructure exercises={b.exercises} />
        </details>
      ))}
      <p className="muted small confirmation-note">
        Los complementarios siguen por confirmar. Revísalos en el editor.
      </p>
      <div className="routine-start">
        <button className="primary" disabled={!ready} onClick={onStart}>
          <Icon name="play" size={16} />
          {active ? "Retomar sesión" : "Comenzar sesión"}
        </button>
      </div>
    </>
  );
}
