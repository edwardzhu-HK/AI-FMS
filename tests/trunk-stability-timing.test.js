import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTrunkStabilityFrameFeatures,
  evaluateTrunkStabilitySegmentsTiming,
} from "../src/lib/trunk-stability-timing.js";

function landmark(name, x, y, visibility = 0.94) {
  return { name, x, y, z: 0, visibility };
}

function frame(second, { hipX = 0.5, shoulderY = 0.4, wristY = 0.72 } = {}) {
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

function payload(frames) {
  return { frames };
}

test("buildTrunkStabilityFrameFeatures extracts push-up lift evidence", () => {
  const features = buildTrunkStabilityFrameFeatures(
    payload([frame(1), frame(2, { shoulderY: 0.36 })]),
  );

  assert.equal(features.length, 2);
  assert.ok(features[1].shoulderWristLift > features[0].shoulderWristLift);
  assert.equal(features[0].avgElbowAngle, 180);
});

test("evaluateTrunkStabilitySegmentsTiming detects best push-up frame", () => {
  const report = evaluateTrunkStabilitySegmentsTiming({
    posePayload: payload([
      frame(1, { shoulderY: 0.5, wristY: 0.7 }),
      frame(2, { shoulderY: 0.42, wristY: 0.72 }),
      frame(3, { shoulderY: 0.34, wristY: 0.72 }),
    ]),
    segments: [
      {
        segmentId: "seg_1",
        actionType: "trunk_stability_push_up",
        startSecond: 0.5,
        endSecond: 3.5,
      },
    ],
  });

  assert.equal(report.items[0].status, "good");
  assert.equal(report.items[0].cycle.bestPushSecond, 3);
  assert.equal(report.summary.okSegments, 1);
});

test("evaluateTrunkStabilitySegmentsTiming reports insufficient pose", () => {
  const report = evaluateTrunkStabilitySegmentsTiming({
    posePayload: payload([frame(1)]),
    segments: [
      {
        segmentId: "seg_1",
        actionType: "trunk_stability_push_up",
        startSecond: 0.5,
        endSecond: 1.5,
      },
    ],
  });

  assert.equal(report.items[0].status, "insufficient_pose");
  assert.equal(report.items[0].issues[0].severity, "error");
});
