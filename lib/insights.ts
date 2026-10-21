import { localDate, type WorkoutSession } from "./model";
export function weekActivity(sessions: WorkoutSession[], today = new Date()) {
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const date = localDate(day);
    return {
      date,
      label: ["L", "M", "X", "J", "V", "S", "D"][i],
      isToday: date === localDate(today),
      count: sessions.filter((s) => s.date === date).length,
    };
  });
  return {
    days,
    count: days.reduce((n, d) => n + d.count, 0),
    start: days[0].date,
    end: days[6].date,
  };
}
export function sessionInsights(sessions: WorkoutSession[]) {
  const measured = sessions.filter((s) => s.durationMs !== null);
  return {
    count: sessions.length,
    partial: sessions.filter((s) => s.status === "partial").length,
    measured: measured.length,
    averageMs: measured.length
      ? Math.round(
          measured.reduce((n, s) => n + s.durationMs!, 0) / measured.length,
        )
      : null,
    completedExercises: sessions.reduce(
      (n, s) =>
        n +
        s.results.filter((r) => r.status === "done" && r.actual !== null)
          .length,
      0,
    ),
  };
}
