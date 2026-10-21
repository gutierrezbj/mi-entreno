"use client";
import { useId } from "react";
export default function NumberStepper({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const inputId = useId();
  return (
    <div className="stepper-field">
      <label htmlFor={inputId}>{label}</label>
      <span className="number-stepper">
        <button
          type="button"
          aria-label={`Disminuir ${name}`}
          disabled={value === null || value <= 0}
          onClick={() => onChange(Math.max(0, (value ?? 0) - 1))}
        >
          −
        </button>
        <input
          id={inputId}
          aria-label={name}
          type="number"
          inputMode="decimal"
          min="0"
          max="1000000"
          step="any"
          placeholder="—"
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
        <button
          type="button"
          aria-label={`Aumentar ${name}`}
          disabled={value !== null && value >= 1000000}
          onClick={() => onChange(Math.min(1000000, (value ?? 0) + 1))}
        >
          +
        </button>
      </span>
    </div>
  );
}
