import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRotaryStabilityFrameFeatures,
  evaluateRotaryStabilitySegmentsTiming,
} from "../src/lib/rotary-stability-timing.js";

function landmark(name, x, y, visibility = 0.95) {
  return {
    name,
    x,
    y,
    z: 0,
    visibility,
    presence: 0.98,
  };
}

function frame(second, reach = 0.04) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", 0.42, 0.32),
          landmark("right_shoulder", 0.58, 0.32),
          landmark("left_hip", 0.43, 0.58),
          landmark("right_hip", 0.57, 0.58),
          landmark("left_wrist", 0.42 - reach, 0.33),
          landmark("right_wrist", 0.58 + reach * 0.15, 0.34),
          landmark("left_ankle", 0.43 - reach * 0.1, 0.72),
          landmark("right_ankle", 0.57 + reach, 0.72),
        ],
      },
    ],
  };
}

function createPayload() {
  return {
    frames: [frame(0, 0.04), frame(1, 0.2), frame(2, 0.06)],
  };
}

test("buildRotaryStabilityFrameFeatures extracts rotary reach evidence", () => {
  const features = buildRotaryStabilityFrameFeatures(createPayload());

  assert.equal(features.length, 3);
  assert.equal(features[1].side, "right");
  assert.equal(features[1].pattern, "left_arm_right_leg");
  assert.ok(features[1].rotaryReachScore > features[0].rotaryReachScore);
});

test("evaluateRotaryStabilitySegmentsTiming detects best rotary frame", () => {
  const report = evaluateRotaryStabilitySegmentsTiming({
    posePayload: createPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        actionType: "rotary_stability",
        cameraView: "front",
        startSecond: 0,
        endSecond: 2,
      },
    ],
    options: {
      minRotaryFrames: 1,
    },
  });

  assert.equal(report.status, "good");
  assert.equal(report.summary.detectedCycles, 1);
  assert.equal(report.items[0].cycle.bestReachSecond, 1);
  assert.equal(report.items[0].cycle.side, "right");
});

test("evaluateRotaryStabilitySegmentsTiming reports insufficient pose", () => {
  const report = evaluateRotaryStabilitySegmentsTiming({
    posePayload: { frames: [] },
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        actionType: "rotary_stability",
        cameraView: "front",
        startSecond: 0,
        endSecond: 2,
      },
    ],
  });

  assert.equal(report.status, "needs_adjustment");
  assert.equal(report.items[0].status, "insufficient_pose");
  assert.equal(report.items[0].issues[0].code, "insufficient_rotary_frames");
});
