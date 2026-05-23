import assert from "node:assert/strict";
import test from "node:test";
import { summarizeInlineLungePoseFeatures } from "../src/lib/inline-lunge-features.js";
import { evaluateInlineLungeSegmentsTiming } from "../src/lib/inline-lunge-timing.js";

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

function frame(second, depth) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", 0.42, 0.28),
          landmark("right_shoulder", 0.58, 0.28),
          landmark("left_hip", 0.42, 0.54 + depth),
          landmark("right_hip", 0.58, 0.54 + depth),
          landmark("left_knee", 0.43, 0.68 + depth * 0.95),
          landmark("right_knee", 0.58, 0.68 + depth * 0.4),
          landmark("left_ankle", 0.42, 0.86),
          landmark("right_ankle", 0.58, 0.86),
          landmark("left_foot_index", 0.45, 0.87),
          landmark("right_foot_index", 0.61, 0.87),
        ],
      },
    ],
  };
}

function triangularDepth(second, center, height = 0.13) {
  const distance = Math.abs(second - center);
  return Math.max(0, 1 - distance / 1.1) * height;
}

function createPayload() {
  const frames = [];

  for (let second = 0; second <= 5; second += 0.2) {
    frames.push(frame(Number(second.toFixed(1)), triangularDepth(second, 2.5)));
  }

  return {
    schemaVersion: "ai_fms_pose_landmarks_v1",
    sourceVideo: {
      fileName: "synthetic-inline-lunge.mp4",
    },
    poseModel: {
      name: "synthetic_pose",
    },
    frames,
  };
}

test("summarizeInlineLungePoseFeatures reports lunge evidence", () => {
  const posePayload = createPayload();
  const timingReport = evaluateInlineLungeSegmentsTiming({
    posePayload,
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 1.1,
        endSecond: 3.8,
      },
    ],
  });
  const report = summarizeInlineLungePoseFeatures({
    posePayload,
    timingReport,
  });

  assert.equal(report.summary.repetitionsTotal, 1);
  assert.equal(report.summary.usableRepetitions, 1);
  assert.equal(report.items[0].ratings.lungeDepth.status, "good");
  assert.equal(report.items[0].ratings.trunkAlignment.status, "good");
  assert.equal(report.items[0].ratings.kneeFootAlignment.status, "good");
  assert.equal(report.items[0].ratings.sideConfidence.status, "good");
  assert.equal(report.items[0].metrics.frontSide, "left");
  assert.equal(typeof report.items[0].metrics.peakDepthRatio, "number");
});

test("summarizeInlineLungePoseFeatures returns null without timing evidence", () => {
  assert.equal(
    summarizeInlineLungePoseFeatures({
      posePayload: createPayload(),
      timingReport: null,
    }),
    null,
  );
});

test("summarizeInlineLungePoseFeatures marks items without cycles", () => {
  const report = summarizeInlineLungePoseFeatures({
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
