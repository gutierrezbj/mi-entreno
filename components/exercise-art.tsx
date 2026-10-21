import type { PrescribedExercise } from "@/lib/model";
export default function ExerciseArt({
  exercise,
}: {
  exercise: PrescribedExercise;
}) {
  const seed = exercise.exerciseId.startsWith("00000000-0000-4000-8000-");
  const n = seed ? Number(exercise.exerciseId.slice(-12)) : 0;
  return (
    <div className="exercise-art" aria-hidden="true">
      <svg
        viewBox="0 0 300 150"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {n === 1 ? (
          <>
            <ellipse cx="191" cy="105" rx="34" ry="34" />
            <circle cx="191" cy="105" r="25" strokeWidth="1" />
            <path
              d="m191 73 0 64m-30-47 60 30m-60 0 60-30m-45-14 31 54m-46-24h61"
              strokeWidth="1"
            />
            <path d="m106 113 24-36 39 32m-63 4 59 0m-32-40-3-27m-12 0h29m-5 28 19-31 25 3m-25-3 7-19 14 0M75 139h57m40 0h53M94 113l-8 26m103-1 7 1" />
            <circle cx="106" cy="113" r="9" />
          </>
        ) : n === 3 ? (
          <>
            <path d="M40 122h215m-201 0 4 14m182-14 4 14M71 111l133-12m-96-8 24-2m-12 1-6 21m31-36 50 10m-50-10 5-8" />
            <circle cx="222" cy="96" r="28" />
            <path d="m222 96-28-12m27 42v10" />
            <path d="m150 67 33-8 12 10" />
          </>
        ) : n === 5 ? (
          <>
            <path d="m83 125 126-24 42 14-125 24-43-14Zm125-24-11-67 23 0 10 74M185 34h44m-21 8-17 9m30 20 20-7m-111 64 94-18" />
            <path d="m125 139-3 7m117-31 10 16M84 126l-10 8" />
          </>
        ) : n === 7 ? (
          <>
            <path d="M92 137h131M120 137V24h65v113M113 24h79M126 34l-29 42m83-42 29 42M91 76l8 8m111-8-8 8" />
            <circle cx="153" cy="108" r="22" />
            <path d="m140 108 26 0m-13-13v26m-18 16-3 8m44-8 3 8" />
          </>
        ) : n === 2 ? (
          <>
            <circle cx="225" cy="82" r="10" />
            <path d="m214 93-48 2-42-9m40 10-4 30 35 0m-35-30-27 27-44 0m39-37-26 24-44 0M43 137h214" />
            <path d="m228 95 4 30h19" />
          </>
        ) : (
          <>
            <circle cx="155" cy="33" r="12" />
            <path d="m151 47-9 39 29 20m-26-22-31 16-30 28m85-24 27 23M149 55l-34 16-25-11m60-5 28 20 28-10M65 140h166" />
          </>
        )}
      </svg>
    </div>
  );
}
