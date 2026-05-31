import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultSegmentMetadata } from "../src/constants/scoring.js";
import { summarizeClearingReadiness } from "../src/lib/clearing-readiness.js";

function buildSegment(actionType, overrides = {}) {
  return {
    segmentId: `${actionType}_1`,
    actionType,
    repetitionIndex: 1,
    ...createDefaultSegmentMetadata(actionType),
    ...overrides,
  };
}

test("clearing readiness skips actions without clearing policy", () => {
  const summary = summarizeClearingReadiness([
    buildSegment("deep_squat"),
    buildSegment("active_straight_leg_raise"),
  ]);

  assert.equal(summary.available, false);
  assert.equal(summary.readyForIngest, true);
  assert.equal(summary.blockerCount, 0);
});

test("clearing readiness blocks unconfirmed clearing findings", () => {
  const summary = summarizeClearingReadiness([
    buildSegment("shoulder_mobility"),
    buildSegment("trunk_stability_push_up"),
  ]);

  assert.equal(summary.available, true);
  assert.equal(summary.readyForIngest, false);
  assert.equal(summary.requiredSegmentsCount, 2);
  assert.equal(summary.confirmedSegmentsCount, 0);
  assert.deepEqual(summary.issueCounts, { clearing_not_tested: 2 });
});

test("clearing readiness treats negative and green results as confirmed", () => {
  const summary = summarizeClearingReadiness([
    buildSegment("in_line_lunge", {
      clearingFindings: [
        { key: "ankle_clearing_pain", result: "negative" },
        { key: "ankle_clearing_mobility", result: "green" },
      ],
    }),
  ]);

  assert.equal(summary.readyForIngest, true);
  assert.equal(summary.requiredSegmentsCount, 1);
  assert.equal(summary.confirmedSegmentsCount, 1);
  assert.equal(summary.blockerCount, 0);
});
