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
  assert.deepEqual(getImplementedPoseActionTypes(), ["deep_squat"]);
});

test("movement adapter registry exposes ASLR timing-only pipeline", () => {
  const adapter = getMovementAdapter("active_straight_leg_raise");

  assert.equal(adapter.actionType, "active_straight_leg_raise");
  assert.equal(adapter.posePipelineStatus, "timing_only");
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(adapter.buildFeatureReport(), null);
  assert.equal(adapter.buildSuggestionReport(), null);
  assert.deepEqual(getImplementedPoseActionTypes(), ["deep_squat"]);
});

test("movement adapter registry keeps unsupported movements annotation-only", () => {
  assert.equal(getMovementAdapter("shoulder_mobility"), null);
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
