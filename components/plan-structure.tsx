import type { PrescribedExercise } from "@/lib/model";
import { exerciseGroups } from "@/lib/structure";
import EquipmentTag from "./equipment-tag";
export default function PlanStructure({
  exercises,
}: {
  exercises: PrescribedExercise[];
}) {
  return (
    <div className="plan-supersets">
      {exerciseGroups(exercises).map((group, index) => (
        <section
          className="superset-card"
          key={group.id}
          aria-label={`${group.paired ? "Superset" : "Ejercicio individual"} ${index + 1}`}
        >
          <div className="superset-heading">
            <span className="superset-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3>
                {group.paired
                  ? `Superset ${index + 1}`
                  : "Ejercicio individual"}
              </h3>
              <p>
                {group.exercises.length}{" "}
                {group.exercises.length === 1 ? "ejercicio" : "ejercicios"}
              </p>
            </div>
            <span className="superset-link" aria-hidden="true">
              ↳
            </span>
          </div>
          <div className="superset-exercises">
            {group.exercises.map((ex, i) => (
              <div className="superset-exercise" key={ex.id}>
                <div className="exercise-order" aria-hidden="true">
                  {String.fromCharCode(65 + i)}
                </div>
                <div className="exercise-description">
                  <EquipmentTag kind={ex.equipment} />
                  <strong className="exercise-name">{ex.name}</strong>
                  {ex.uncertain && <span className="badge">Por confirmar</span>}
                  {ex.loadKg !== null && (
                    <span className="muted small">
                      Objetivo de carga: {ex.loadKg} kg
                    </span>
                  )}
                </div>
                <strong className="exercise-target">
                  {ex.target}
                  <small>{ex.unit}</small>
                </strong>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
