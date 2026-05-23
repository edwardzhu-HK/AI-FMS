import assert from "node:assert/strict";
import test from "node:test";

import {
  allSegmentsMatchAdapter,
  getImplementedPoseActionTypes,
  getMovementAdapter,
} from "../src/lib/movement-adapters.js";

test("movement adapter registry exposes Deep Squat pose pipeline", () => {
  const adapter = getMovementAdapter("deep_squat");

  assert.equal(adapter.actionType, "deep_squat");
  assert.equal(adapter.posePipelineStatus, "implemented");
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(typeof adapter.buildSuggestionReport, "function");
  assert.ok(getImplementedPoseActionTypes().includes("deep_squat"));
});

test("movement adapter registry exposes ASLR implemented pipeline", () => {
  const adapter = getMovementAdapter("active_straight_leg_raise");

  assert.equal(adapter.actionType, "active_straight_leg_raise");
  assert.equal(adapter.posePipelineStatus, "implemented");
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(typeof adapter.buildSuggestionReport, "function");
  assert.deepEqual(getImplementedPoseActionTypes(), [
    "deep_squat",
    "active_straight_leg_raise",
  ]);
});

test("movement adapter registry exposes Hurdle Step features-only pipeline", () => {
  const adapter = getMovementAdapter("hurdle_step");

  assert.equal(adapter.actionType, "hurdle_step");
  assert.equal(adapter.posePipelineStatus, "features_only");
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(adapter.buildSuggestionReport(), null);
});

test("movement adapter registry exposes Shoulder Mobility features-only pipeline", () => {
  const adapter = getMovementAdapter("shoulder_mobility");

  assert.equal(adapter.actionType, "shoulder_mobility");
  assert.equal(adapter.posePipelineStatus, "features_only");
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(adapter.buildSuggestionReport(), null);
  assert.deepEqual(getImplementedPoseActionTypes(), [
    "deep_squat",
    "active_straight_leg_raise",
  ]);
});

test("allSegmentsMatchAdapter gates pose reports by action type", () => {
  const adapter = getMovementAdapter("deep_squat");

  assert.equal(
    allSegmentsMatchAdapter(
      [
        { segmentId: "seg_1", actionType: "deep_squat" },
        { segmentId: "seg_2", actionType: "deep_squat" },
      ],
      adapter,
      "deep_squat",
    ),
    true,
  );
  assert.equal(
    allSegmentsMatchAdapter(
      [
        { segmentId: "seg_1", actionType: "deep_squat" },
        { segmentId: "seg_2", actionType: "active_straight_leg_raise" },
      ],
      adapter,
      "deep_squat",
    ),
    false,
  );
});
