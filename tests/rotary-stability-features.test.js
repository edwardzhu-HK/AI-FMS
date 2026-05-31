import assert from "node:assert/strict";
import test from "node:test";

import { summarizeRotaryStabilityPoseFeatures } from "../src/lib/rotary-stability-features.js";
import { evaluateRotaryStabilitySegmentsTiming } from "../src/lib/rotary-stability-timing.js";

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

test("summarizeRotaryStabilityPoseFeatures reports feature-only evidence", () => {
  const posePayload = createPayload();
  const timingReport = evaluateRotaryStabilitySegmentsTiming({
    posePayload,
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 0,
        endSecond: 2,
        side: "right",
      },
    ],
    options: {
      minRotaryFrames: 1,
    },
  });
  const report = summarizeRotaryStabilityPoseFeatures({
    posePayload,
    timingReport,
  });

  assert.equal(report.actionType, "rotary_stability");
  assert.equal(report.summary.repetitionsTotal, 1);
  assert.equal(report.summary.usableRepetitions, 1);
  assert.equal(report.items[0].status, "ok");
  assert.equal(report.items[0].ratings.rotaryDiagonalControl.status, "good");
  assert.ok(
    ["good", "watch"].includes(report.items[0].ratings.sideConfidence.status),
  );
  assert.equal(report.items[0].metrics.side, "right");
  assert.equal(typeof report.items[0].metrics.rotaryReachScore, "number");
});

test("summarizeRotaryStabilityPoseFeatures returns null without timing evidence", () => {
  assert.equal(
    summarizeRotaryStabilityPoseFeatures({
      posePayload: createPayload(),
      timingReport: null,
    }),
    null,
  );
});

test("summarizeRotaryStabilityPoseFeatures marks items without cycles", () => {
  const report = summarizeRotaryStabilityPoseFeatures({
    posePayload: createPayload(),
    timingReport: {
      items: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          cameraView: "front",
          cycle: null,
        },
      ],
    },
  });

  assert.equal(report.items[0].status, "no_cycle");
  assert.equal(report.summary.usableRepetitions, 0);
});
