import assert from "node:assert/strict";
import test from "node:test";
import {
  buildShoulderMobilityFrameFeatures,
  evaluateShoulderMobilitySegmentsTiming,
} from "../src/lib/shoulder-mobility-timing.js";

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
  const frames = [];

  for (let second = 0; second <= 8; second += 0.2) {
    const firstReachGap =
      0.22 - Math.max(0, 1 - Math.abs(second - 2) / 0.9) * 0.19;
    const secondReachGap =
      0.24 - Math.max(0, 1 - Math.abs(second - 6) / 0.9) * 0.12;
    const gap = second < 4 ? firstReachGap : secondReachGap;
    frames.push(frame(Number(second.toFixed(1)), gap));
  }

  return {
    schemaVersion: "ai_fms_pose_landmarks_v1",
    sourceVideo: {
      fileName: "synthetic-shoulder.mp4",
    },
    frames,
  };
}

test("buildShoulderMobilityFrameFeatures extracts wrist reach proxy", () => {
  const features = buildShoulderMobilityFrameFeatures(createPayload());

  assert.ok(features.length > 0);
  assert.equal(typeof features[0].wristDistanceRatio, "number");
});

test("evaluateShoulderMobilitySegmentsTiming finds best reach frames", () => {
  const report = evaluateShoulderMobilitySegmentsTiming({
    posePayload: createPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 0,
        endSecond: 4,
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        cameraView: "front",
        startSecond: 4,
        endSecond: 8,
      },
    ],
  });

  assert.equal(report.status, "good");
  assert.equal(report.summary.detectedCycles, 2);
  assert.equal(report.items[0].cycle.bestReachSecond, 2);
  assert.equal(report.items[1].cycle.bestReachSecond, 6);
});

test("evaluateShoulderMobilitySegmentsTiming reports insufficient segment evidence", () => {
  const report = evaluateShoulderMobilitySegmentsTiming({
    posePayload: createPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 20,
        endSecond: 21,
      },
    ],
  });

  assert.equal(report.status, "needs_adjustment");
  assert.equal(report.items[0].status, "insufficient_pose");
});
