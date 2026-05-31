import assert from "node:assert/strict";
import test from "node:test";

import { summarizeTrunkStabilityPoseFeatures } from "../src/lib/trunk-stability-features.js";
import { evaluateTrunkStabilitySegmentsTiming } from "../src/lib/trunk-stability-timing.js";

function landmark(name, x, y, visibility = 0.94) {
  return { name, x, y, z: 0, visibility };
}

function frame(second, { hipX = 0.5, shoulderY = 0.36, wristY = 0.72 } = {}) {
  return {
    second,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", 0.46, shoulderY),
          landmark("right_shoulder", 0.54, shoulderY),
          landmark("left_hip", hipX - 0.04, 0.6),
          landmark("right_hip", hipX + 0.04, 0.6),
          landmark("left_ankle", 0.46, 0.82),
          landmark("right_ankle", 0.54, 0.82),
          landmark("left_wrist", 0.46, wristY),
          landmark("right_wrist", 0.54, wristY),
          landmark("left_elbow", 0.46, (shoulderY + wristY) / 2),
          landmark("right_elbow", 0.54, (shoulderY + wristY) / 2),
        ],
      },
    ],
  };
}

function createTimingReport(posePayload) {
  return evaluateTrunkStabilitySegmentsTiming({
    posePayload,
    segments: [
      {
        segmentId: "seg_1",
        actionType: "trunk_stability_push_up",
        startSecond: 0,
        endSecond: 4,
      },
    ],
  });
}

test("summarizeTrunkStabilityPoseFeatures reports push-up evidence", () => {
  const posePayload = {
    frames: [frame(1), frame(2, { shoulderY: 0.34 }), frame(3)],
  };
  const timingReport = createTimingReport(posePayload);
  const report = summarizeTrunkStabilityPoseFeatures({
    posePayload,
    timingReport,
  });
  const item = report.items[0];

  assert.equal(item.status, "ok");
  assert.equal(item.ratings.pushUpPattern.status, "good");
  assert.equal(item.ratings.coreStability.status, "good");
  assert.equal(item.ratings.armExtension.status, "good");
  assert.equal(report.summary.usableRepetitions, 1);
});

test("summarizeTrunkStabilityPoseFeatures flags large hip drift", () => {
  const posePayload = {
    frames: [
      frame(1, { hipX: 0.42 }),
      frame(2, { hipX: 0.66, shoulderY: 0.34 }),
      frame(3, { hipX: 0.42 }),
    ],
  };
  const report = summarizeTrunkStabilityPoseFeatures({
    posePayload,
    timingReport: createTimingReport(posePayload),
  });

  assert.equal(report.items[0].ratings.coreStability.status, "limited");
  assert.equal(report.items[0].ratings.compensation.status, "limited");
});
