import { test } from "node:test";
import assert from "node:assert/strict";
import { weekActivity, sessionInsights } from "../lib/insights";
import { initialSession, initialTemplate } from "../lib/seed";
import { startSession, finishSession } from "../lib/model";

test("week activity uses calendar dates, includes valid partials and never assumes a weekly goal", () => {
  const week = weekActivity([initialSession], new Date(2026, 9, 21, 12));
  assert.equal(week.start, "2026-10-19");
  assert.equal(week.end, "2026-10-25");
  assert.equal(week.count, 1);
  assert.equal(week.days.find((d) => d.date === "2026-10-20")?.count, 1);
  assert.equal(week.days.find((d) => d.isToday)?.date, "2026-10-21");
  assert.equal(week.days.filter((d) => d.count).length, 1);
});
test("insights keep unknown durations unknown and exclude them from measured averages", () => {
  assert.deepEqual(sessionInsights([initialSession]), {
    count: 1,
    partial: 1,
    measured: 0,
    averageMs: null,
    completedExercises: 0,
  });
  const draft = startSession(initialTemplate, new Date("2026-10-21T10:00:00Z"));
  draft.session.results[0].actual = 350;
  draft.session.results[0].status = "done";
  const measured = finishSession(draft, new Date("2026-10-21T10:10:00Z"));
  const stats = sessionInsights([initialSession, measured]);
  assert.equal(stats.count, 2);
  assert.equal(stats.averageMs, 600000);
  assert.equal(stats.measured, 1);
  assert.equal(stats.completedExercises, 1);
});
