import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActionsPayload,
  buildVideoLibrary,
} from "../server/video-manager-api.js";

test("buildActionsPayload exposes all FMS movement actions", () => {
  const payload = buildActionsPayload();
  assert.equal(payload.items.length, 7);
  assert.ok(payload.items.some((item) => item.id === "rotary_stability"));
});

test("buildVideoLibrary returns isolated online downloads plus references", () => {
  const library = buildVideoLibrary("rotary_stability");
  assert.equal(library.actionType, "rotary_stability");
  assert.ok(Array.isArray(library.items));
  assert.ok(library.counts.total >= library.counts.downloaded);
});

test("video manager library payload contains manager-facing metadata", () => {
  const library = buildVideoLibrary("rotary_stability");
  const firstItem = library.items[0];

  if (!firstItem) {
    assert.equal(library.counts.total, 0);
    return;
  }

  assert.equal(firstItem.actionType, "rotary_stability");
  assert.ok("needsReview" in firstItem);
  assert.ok("expectedReps" in firstItem);
  assert.ok("durationSecond" in firstItem);
});
