import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completion,
  targetProgress,
  toggleDone,
  nextExercise,
} from "../lib/tracking";
import { startSession, sessionSchema } from "../lib/model";
import { initialTemplate, initialSession } from "../lib/seed";

test("completion counts confirmations, not target volume, partial values or skipped exercises", () => {
  const s = startSession(initialTemplate).session;
  s.results[0] = { ...s.results[0], actual: 400, status: "partial" };
  s.results[1] = { ...s.results[1], actual: 5, status: "done" };
  s.results[2].status = "skipped";
  assert.deepEqual(completion(s.results, 24), {
    done: 1,
    total: 24,
    percent: 4,
    partial: 1,
    skipped: 1,
  });
  assert.equal(completion(initialSession.results, 24).done, 0);
  assert.equal(completion([], 0).percent, 0);
  assert.equal(
    completion(
      Array.from({ length: 499 }, () => ({ ...s.results[1] })),
      500,
    ).percent,
    99,
  );
});
test("exercise progress uses only the entered quantity against its own target and caps the visual fill", () => {
  const s = startSession(initialTemplate).session;
  const ex = s.template.blocks[0].exercises[0];
  const r = s.results[0];
  assert.equal(targetProgress(ex, r), null);
  r.actual = 220;
  r.status = "partial";
  assert.equal(targetProgress(ex, r), 55);
  r.actual = 0;
  assert.equal(targetProgress(ex, r), 0);
  r.actual = 399.99;
  assert.equal(targetProgress(ex, r), 99);
  r.actual = 800;
  assert.equal(targetProgress(ex, r), 100);
  assert.equal(r.actual, 800);
  assert.equal(targetProgress({ ...ex, target: 0 }, r), null);
  r.status = "skipped";
  assert.equal(targetProgress(ex, r), null);
});
test("explicit target confirmation never copies a planned load and undo preserves measured data", () => {
  const s = startSession(initialTemplate).session;
  const ex = { ...s.template.blocks[0].exercises[0], loadKg: 25 };
  const r = s.results[0];
  const done = toggleDone(ex, r);
  assert.equal(done.actual, 400);
  assert.equal(done.status, "done");
  assert.equal(done.loadKg, null);
  assert.equal(r.actual, null);
  const measured = {
    ...r,
    actual: 220,
    loadKg: 12,
    notes: "Mi valor",
    status: "partial" as const,
  };
  const confirmed = toggleDone(ex, measured);
  assert.equal(confirmed.actual, 220);
  assert.equal(confirmed.loadKg, 12);
  const undone = toggleDone(ex, confirmed);
  assert.equal(undone.status, "partial");
  assert.equal(undone.actual, 220);
  assert.equal(undone.notes, "Mi valor");
  assert.equal(
    toggleDone(ex, { ...r, actual: 0, status: "partial" }).actual,
    0,
  );
  s.results[0] = done;
  assert.equal(sessionSchema.safeParse(s).success, true);
});
test("next exercise follows pair order across rounds and blocks, while partials remain unfinished", () => {
  const t = structuredClone(initialTemplate);
  t.blocks[0].rounds = 2;
  const s = startSession(t).session;
  assert.equal(nextExercise(s)?.exercise.name, "Air Bike");
  s.results[0] = { ...s.results[0], actual: 400, status: "done" };
  assert.equal(nextExercise(s)?.exercise.name, "Burpees");
  s.results[1].status = "skipped";
  assert.equal(nextExercise(s)?.exercise.name, "Remo");
  for (const r of s.results.filter(
    (r) => r.blockId === t.blocks[0].id && r.round === 1,
  )) {
    r.actual = 1;
    r.status = "done";
  }
  assert.equal(nextExercise(s)?.round, 2);
  assert.equal(nextExercise(s)?.exercise.name, "Air Bike");
  for (const r of s.results.filter((r) => r.blockId === t.blocks[0].id)) {
    r.actual = 1;
    r.status = "done";
  }
  assert.equal(nextExercise(s)?.blockIndex, 1);
  const first = s.results.find((r) => r.blockId === t.blocks[0].id)!;
  first.status = "partial";
  assert.equal(nextExercise(s)?.result.id, first.id);
  for (const r of s.results) {
    r.actual = null;
    r.status = "skipped";
  }
  assert.equal(nextExercise(s), null);
  assert.equal(completion(s.results, s.results.length).percent, 0);
});
