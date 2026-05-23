import assert from "node:assert/strict";
import test from "node:test";
import { summarizeShoulderMobilityPoseFeatures } from "../src/lib/shoulder-mobility-features.js";
import { evaluateShoulderMobilitySegmentsTiming } from "../src/lib/shoulder-mobility-timing.js";

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

function frame(second, wristGap) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", 0.42, 0.32),
          landmark("right_shoulder", 0.58, 0.32),
          landmark("left_hip", 0.43, 0.78),
          landmark("right_hip", 0.57, 0.78),
          landmark("left_wrist", 0.5 - wristGap / 2, 0.52),
          landmark("right_wrist", 0.5 + wristGap / 2, 0.52),
          landmark("left_index", 0.5 - wristGap / 2, 0.51),
          landmark("right_index", 0.5 + wristGap / 2, 0.51),
        ],
      },
    ],
  };
}

function createPayload() {
  return {
    frames: [frame(0, 0.24), frame(1, 0.04), frame(2, 0.26)],
  };
}

test("summarizeShoulderMobilityPoseFeatures reports reach evidence", () => {
  const posePayload = createPayload();
  const timingReport = evaluateShoulderMobilitySegmentsTiming({
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
      minReachFrames: 1,
    },
  });
  const report = summarizeShoulderMobilityPoseFeatures({
    posePayload,
    timingReport,
  });

  assert.equal(report.summary.repetitionsTotal, 1);
  assert.equal(report.summary.usableRepetitions, 1);
  assert.equal(report.items[0].ratings.reachDistance.status, "good");
  assert.equal(report.items[0].ratings.handVisibility.status, "good");
  assert.equal(report.items[0].ratings.shoulderReference.status, "good");
  assert.equal(report.items[0].ratings.sideContext.status, "good");
  assert.equal(report.items[0].metrics.side, "right");
  assert.equal(typeof report.items[0].metrics.wristDistanceRatio, "number");
});

test("summarizeShoulderMobilityPoseFeatures returns null without timing evidence", () => {
  assert.equal(
    summarizeShoulderMobilityPoseFeatures({
      posePayload: createPayload(),
      timingReport: null,
    }),
    null,
  );
});

test("summarizeShoulderMobilityPoseFeatures marks items without cycles", () => {
  const report = summarizeShoulderMobilityPoseFeatures({
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
