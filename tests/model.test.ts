import { test } from "node:test";
import assert from "node:assert/strict";
import {
  startSession,
  pause,
  resume,
  elapsed,
  finishSession,
  progress,
  sessionSchema,
  templateSchema,
  previousResult,
} from "../lib/model";
import { initialTemplate, initialSession } from "../lib/seed";
import { emptyLocal, enqueue, readLocal } from "../lib/local";

test("seed preserves unknown metrics and uncertain transcription", () => {
  assert.equal(sessionSchema.parse(initialSession).durationMs, null);
  assert.equal(initialSession.results.length, 0);
  assert.equal(initialSession.extras.length, 0);
  assert.equal(progress(initialSession).done, 0);
  assert.equal(initialSession.reportedRounds.length, 3);
  assert.deepEqual(
    initialTemplate.blocks.map((b) => b.exercises.at(-1)?.uncertain),
    [true, true, true],
  );
  assert.deepEqual(
    initialTemplate.blocks.map((b) => b.exercises[0].target),
    [400, 600, 800],
  );
});
test("pause/resume includes active time only, survives wall clock reconstruction", () => {
  const draft = startSession(initialTemplate, new Date("2026-10-20T10:00:00Z"));
  const start = Date.parse("2026-10-20T10:00:00Z");
  const paused = pause(draft.timer, start + 10000);
  assert.equal(elapsed(paused, start + 20000), 10000);
  assert.deepEqual(pause(paused, start + 30000), paused);
  const running = resume(paused, start + 40000);
  assert.equal(elapsed(running, start + 45000), 15000);
  assert.deepEqual(resume(running, start + 41000), running);
  assert.equal(
    elapsed(JSON.parse(JSON.stringify(running)), start + 50000),
    20000,
  );
  assert.equal(
    elapsed({ elapsedMs: 100, runningSince: start + 1000 }, start),
    100,
  );
});
test("partial session stores actual zero, no invented weights, and unfinished exercises", () => {
  const draft = startSession(initialTemplate, new Date("2026-10-20T10:00:00Z"));
  draft.session.results[0] = {
    ...draft.session.results[0],
    actual: 0,
    status: "partial",
  };
  const saved = finishSession(draft, new Date("2026-10-20T10:00:05Z"));
  assert.equal(saved.status, "partial");
  assert.equal(saved.durationMs, 5000);
  assert.equal(saved.results[0].actual, 0);
  assert.equal(saved.results[0].loadKg, null);
  assert.deepEqual(progress(saved), { recorded: 1, done: 0, total: 24 });
});
test("template snapshot stays immutable and rounds have distinct result IDs", () => {
  const t = structuredClone(initialTemplate);
  t.blocks[0].rounds = 2;
  const draft = startSession(t);
  t.blocks[0].exercises[0].target = 999;
  t.name = "Modified";
  assert.equal(draft.session.template.blocks[0].exercises[0].target, 400);
  assert.notEqual(draft.session.template.name, "Modified");
  assert.equal(draft.session.results.length, 32);
  assert.equal(new Set(draft.session.results.map((r) => r.id)).size, 32);
});
test("validation rejects fabricated completion, duplicate positions and invalid units", () => {
  const draft = startSession(initialTemplate);
  draft.session.status = "completed";
  assert.equal(sessionSchema.safeParse(draft.session).success, false);
  draft.session.status = "partial";
  draft.session.results.push({
    ...draft.session.results[0],
    id: crypto.randomUUID(),
  });
  assert.equal(sessionSchema.safeParse(draft.session).success, false);
  const t = structuredClone(initialTemplate);
  t.blocks[0].exercises[0].target = -1;
  assert.equal(templateSchema.safeParse(t).success, false);
});
test("empty session is a legitimate partial record, completed requires actual values", () => {
  const draft = startSession(initialTemplate);
  assert.equal(finishSession(draft).status, "partial");
  draft.session.results.forEach((r) => {
    r.actual = 1;
    r.status = "done";
  });
  assert.equal(finishSession(draft).status, "completed");
});
test("local persistence, reload and queue retries do not duplicate sessions", () => {
  const draft = startSession(initialTemplate);
  const saved = finishSession(draft);
  const restored = readLocal(JSON.stringify({ ...emptyLocal(), draft }));
  assert.equal(restored.draft?.session.id, draft.session.id);
  const once = enqueue(restored, saved);
  assert.equal(once.draft, null);
  assert.equal(enqueue(once, saved).pending.length, 1);
  assert.throws(() => enqueue(once, { ...saved, notes: "conflict" }));
  assert.throws(() => readLocal("broken"));
});
test("comparison matches exercise and original unit, never unknown values", () => {
  const draft = startSession(initialTemplate);
  draft.session.results[0].actual = 350;
  draft.session.results[0].status = "partial";
  const saved = finishSession(draft);
  const id = saved.results[0].exerciseId;
  assert.equal(previousResult([initialSession, saved], id, "m")?.actual, 350);
  assert.equal(previousResult([saved], id, "reps"), null);
  assert.equal(previousResult([initialSession], id, "m"), null);
});
