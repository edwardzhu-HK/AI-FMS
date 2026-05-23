import assert from "node:assert/strict";
import test from "node:test";
import { summarizeDeepSquatPoseFeatures } from "../src/lib/deep-squat-features.js";
import { evaluateDeepSquatSegmentsTiming } from "../src/lib/deep-squat-timing.js";

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

function triangularDepth(second, center) {
  const distance = Math.abs(second - center);
  const height = Math.max(0, 1 - distance / 1.4);
  return 0.42 + height * 0.28;
}

function frame(second, depthRatio) {
  const shoulderY = 0.3;
  const ankleY = 0.85;
  const hipY = shoulderY + (ankleY - shoulderY) * depthRatio;
  const kneeY = hipY - 0.04;
  const isSideRep = second >= 6;
  const hipShift = isSideRep ? 0.1 : 0;
  const kneeOffset = isSideRep ? 0.08 : 0.02;
  const footForward = isSideRep ? 0.16 : 0.04;

  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", 0.46, shoulderY),
          landmark("right_shoulder", 0.54, shoulderY),
          landmark("left_hip", 0.46 + hipShift, hipY),
          landmark("right_hip", 0.54 + hipShift, hipY),
          landmark("left_knee", 0.44 + kneeOffset, kneeY),
          landmark("right_knee", 0.56 + kneeOffset, kneeY),
          landmark("left_ankle", 0.44, ankleY),
          landmark("right_ankle", 0.56, ankleY),
          landmark("left_foot_index", 0.44 + footForward, ankleY + 0.02),
          landmark("right_foot_index", 0.56 + footForward, ankleY + 0.02),
        ],
      },
    ],
  };
}

function createPayload() {
  const frames = [];

  for (let second = 0; second <= 12; second += 0.2) {
    const depth = Math.max(
      triangularDepth(second, 3),
      triangularDepth(second, 8),
    );
    frames.push(frame(Number(second.toFixed(1)), depth));
  }

  return {
    schemaVersion: "ai_fms_pose_landmarks_v1",
    sourceVideo: {
      fileName: "synthetic-deep-squat.mp4",
    },
    poseModel: {
      name: "synthetic_pose",
    },
    frames,
  };
}

test("summarizeDeepSquatPoseFeatures reports view-aware feature ratings", () => {
  const posePayload = createPayload();
  const timingReport = evaluateDeepSquatSegmentsTiming({
    posePayload,
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 1.5,
        endSecond: 4.6,
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        cameraView: "side",
        startSecond: 6.5,
        endSecond: 9.6,
      },
    ],
  });
  const report = summarizeDeepSquatPoseFeatures({
    posePayload,
    timingReport,
  });

  assert.equal(report.summary.repetitionsTotal, 2);
  assert.equal(report.summary.usableRepetitions, 2);
  assert.equal(report.items[0].ratings.depth.status, "good");
  assert.equal(report.items[0].ratings.kneeAlignment.status, "good");
  assert.equal(report.items[0].ratings.torsoControl.status, "not_applicable");
  assert.equal(report.items[0].ratings.hipAngle.status, "not_applicable");
  assert.equal(report.items[1].ratings.torsoControl.status, "good");
  assert.equal(report.items[1].ratings.kneeAlignment.status, "not_applicable");
  assert.notEqual(report.items[1].ratings.hipAngle.status, "not_applicable");
  assert.notEqual(report.items[1].ratings.kneeAngle.status, "not_applicable");
  assert.notEqual(report.items[1].ratings.ankleAngle.status, "not_applicable");
  assert.equal(typeof report.items[1].metrics.hipAngleDegrees, "number");
  assert.equal(typeof report.items[1].metrics.kneeAngleDegrees, "number");
  assert.equal(typeof report.items[1].metrics.ankleShankLeanDegrees, "number");
  assert.ok(report.items[1].metrics.trunkLeanDegrees > 0);
});
