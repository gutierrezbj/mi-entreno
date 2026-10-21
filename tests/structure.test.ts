import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { initialTemplate } from "../lib/seed";
import {
  exerciseGroups,
  exerciseStructure,
  withStructure,
} from "../lib/structure";
import {
  sessionSchema,
  startSession,
  finishSession,
  templateSchema,
} from "../lib/model";

test("seed has four pairs per block, with machine and bodyweight explicitly distinguished", () => {
  for (const block of initialTemplate.blocks) {
    const groups = exerciseGroups(block.exercises);
    assert.equal(groups.length, 4);
    assert.deepEqual(
      groups.map((g) => g.exercises.length),
      [2, 2, 2, 2],
    );
    assert.ok(groups.every((g) => g.paired));
    assert.deepEqual(
      groups.slice(0, 3).map((g) => g.exercises.map((ex) => ex.equipment)),
      Array.from({ length: 3 }, () => ["machine", "bodyweight"]),
    );
    assert.equal(groups[3].exercises[1].uncertain, true);
  }
  assert.equal(initialTemplate.blocks[1].exercises[7].equipment, "weighted");
  assert.equal(initialTemplate.blocks[1].exercises[7].loadKg, null);
  assert.equal(initialTemplate.blocks[2].exercises[7].equipment, "machine");
});
test("legacy seed gets a presentation structure without rewriting its data or inventing classification for custom exercises", () => {
  const legacy = structuredClone(initialTemplate);
  for (const b of legacy.blocks)
    for (const ex of b.exercises) {
      delete ex.equipment;
      delete ex.supersetId;
    }
  const before = JSON.stringify(legacy);
  assert.equal(exerciseGroups(legacy.blocks[0].exercises).length, 4);
  assert.equal(JSON.stringify(legacy), before);
  const custom = {
    ...legacy.blocks[0].exercises[0],
    id: crypto.randomUUID(),
    exerciseId: crypto.randomUUID(),
    name: "Mi ejercicio",
    unit: "m" as const,
  };
  assert.equal(exerciseStructure(custom).equipment, undefined);
  assert.equal(exerciseGroups([custom])[0].paired, false);
  assert.equal(
    withStructure(legacy).blocks[0].exercises[0].equipment,
    "machine",
  );
});
test("grouping follows explicit membership and individual exercises can stay ungrouped", () => {
  const [a, b, c] = structuredClone(initialTemplate.blocks[0].exercises);
  b.supersetId = c.supersetId;
  c.supersetId = null;
  const groups = exerciseGroups([a, b, c]);
  assert.equal(groups.length, 3);
  assert.equal(groups[2].paired, false);
  assert.deepEqual(
    groups.flatMap((g) => g.exercises).map((ex) => ex.id),
    [a.id, b.id, c.id],
  );
  a.equipment = "weighted";
  assert.equal(exerciseStructure(a).equipment, "weighted");
  a.supersetId = null;
  assert.equal(exerciseGroups([a])[0].paired, false);
});
test("old session payloads keep their canonical hash, new snapshots preserve editable structure", () => {
  const old = finishSession(startSession(initialTemplate));
  for (const b of old.template.blocks)
    for (const ex of b.exercises) {
      delete ex.equipment;
      delete ex.supersetId;
    }
  const canonical = sessionSchema.parse(old);
  const hash = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  assert.equal(hash(old), hash(canonical));
  assert.equal(hash(canonical), hash(sessionSchema.parse(canonical)));
  assert.equal(
    Object.hasOwn(canonical.template.blocks[0].exercises[0], "supersetId"),
    false,
  );
  const draft = startSession(withStructure(old.template));
  assert.equal(
    draft.session.template.blocks[0].exercises[0].equipment,
    "machine",
  );
  const edited = structuredClone(draft.session.template);
  edited.blocks[0].exercises[0].supersetId = null;
  assert.notEqual(
    draft.session.template.blocks[0].exercises[0].supersetId,
    null,
  );
  const invalid = structuredClone(initialTemplate);
  (invalid.blocks[0].exercises[0] as { equipment: string }).equipment =
    "unknown";
  assert.equal(templateSchema.safeParse(invalid).success, false);
});
