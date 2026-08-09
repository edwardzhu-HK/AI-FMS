import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeepSquatFrameFeatures,
  detectDeepSquatCycles,
  evaluateDeepSquatSegmentTiming,
  evaluateDeepSquatSegmentsTiming,
} from "../src/lib/deep-squat-timing.js";

function landmark(name, y, visibility = 0.95) {
  return {
    name,
    x: name.startsWith("left") ? 0.45 : 0.55,
    y,
    z: 0,
    visibility,
    presence: 0.98,
  };
}

function frame(second, depthRatio) {
  const shoulderY = 0.3;
  const ankleY = 0.85;
  const hipY = shoulderY + (ankleY - shoulderY) * depthRatio;

  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", shoulderY),
          landmark("right_shoulder", shoulderY),
          landmark("left_hip", hipY),
          landmark("right_hip", hipY),
          landmark("left_ankle", ankleY),
          landmark("right_ankle", ankleY),
        ],
      },
    ],
  };
}

function frontCompressionFrame(second, compressionRatio) {
  const shoulderY = 0.3;
  const ankleY = 0.85;
  const hipY = 0.53;
  const kneeY = hipY + 0.17 - compressionRatio;

  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", shoulderY),
          landmark("right_shoulder", shoulderY),
          landmark("left_hip", hipY),
          landmark("right_hip", hipY),
          landmark("left_knee", kneeY),
          landmark("right_knee", kneeY),
          landmark("left_ankle", ankleY),
          landmark("right_ankle", ankleY),
        ],
      },
    ],
  };
}

function triangularDepth(second, center) {
  const distance = Math.abs(second - center);
  const height = Math.max(0, 1 - distance / 1.4);
  return 0.42 + height * 0.28;
}

function triangularCompression(second, center) {
  const distance = Math.abs(second - center);
  const height = Math.max(0, 1 - distance / 1.2);
  return height * 0.065;
}

function slowReturnWindowDepth(second, center) {
  const distance = Math.abs(second - center);
  const height = Math.max(0, 1 - distance / 2.4);
  return 0.42 + height * 0.28;
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

function createWindowedPayload() {
  const frames = [];

  for (let second = 0; second <= 4; second += 0.2) {
    frames.push(
      frame(Number(second.toFixed(1)), slowReturnWindowDepth(second, 3)),
    );
  }

  for (let second = 40; second <= 44; second += 0.2) {
    frames.push(
      frame(Number(second.toFixed(1)), slowReturnWindowDepth(second, 41)),
    );
  }

  return {
    schemaVersion: "ai_fms_pose_landmarks_v1",
    sourceVideo: {
      fileName: "synthetic-windowed-deep-squat.mp4",
      processedWindows: [
        { startSecond: 0, endSecond: 4 },
        { startSecond: 40, endSecond: 44 },
      ],
    },
    poseModel: {
      name: "synthetic_pose",
    },
    frames,
  };
}

test("buildDeepSquatFrameFeatures extracts normalized depth ratio", () => {
  const features = buildDeepSquatFrameFeatures({
    frames: [frame(1, 0.62)],
  });

  assert.equal(features.length, 1);
  assert.ok(Math.abs(features[0].depthRatio - 0.62) < 0.000001);
});

test("detectDeepSquatCycles finds repeated squat low points", () => {
  const result = detectDeepSquatCycles(createPayload());

  assert.equal(result.quality.status, "ok");
  assert.equal(result.cycles.length, 2);
  assert.ok(Math.abs(result.cycles[0].lowestPointSecond - 3) <= 0.2);
  assert.ok(Math.abs(result.cycles[1].lowestPointSecond - 8) <= 0.2);
});

test("detectDeepSquatCycles finds front-view hip-knee compression cycles", () => {
  const frames = [];

  for (let second = 0; second <= 12; second += 0.2) {
    const compression = Math.max(
      triangularCompression(second, 3),
      triangularCompression(second, 8),
    );
    frames.push(frontCompressionFrame(Number(second.toFixed(1)), compression));
  }

  const result = detectDeepSquatCycles({
    schemaVersion: "ai_fms_pose_landmarks_v1",
    sourceVideo: {
      fileName: "synthetic-front-deep-squat.mp4",
    },
    poseModel: {
      name: "synthetic_pose",
    },
    frames,
  });

  assert.equal(result.quality.status, "ok");
  assert.equal(result.cycles.length, 2);
  assert.equal(result.cycles[0].timingSignal, "hip_knee_compression");
  assert.ok(Math.abs(result.cycles[0].lowestPointSecond - 3) <= 0.2);
  assert.ok(Math.abs(result.cycles[1].lowestPointSecond - 8) <= 0.2);
});

test("detectDeepSquatCycles keeps processed windows independent", () => {
  const result = detectDeepSquatCycles(createWindowedPayload());

  assert.equal(result.quality.status, "ok");
  assert.equal(result.quality.detectionMode, "processed_windows");
  assert.equal(result.cycles.length, 2);
  assert.equal(result.cycles[0].processedWindowIndex, 1);
  assert.equal(result.cycles[1].processedWindowIndex, 2);
  assert.ok(result.cycles[0].endSecond <= 4);
  assert.ok(result.cycles[1].startSecond >= 40);
});

test("evaluateDeepSquatSegmentTiming accepts complete segment coverage", () => {
  const result = evaluateDeepSquatSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 1.5,
      endSecond: 4.6,
    },
  });

  assert.equal(result.status, "good");
  assert.equal(
    result.issues.some((issue) => issue.code === "too_short"),
    false,
  );
});

test("evaluateDeepSquatSegmentTiming flags missing return", () => {
  const result = evaluateDeepSquatSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 2.4,
      endSecond: 3.3,
    },
  });

  assert.equal(result.status, "needs_adjustment");
  assert.ok(result.issues.some((issue) => issue.code === "missing_start"));
  assert.ok(result.issues.some((issue) => issue.code === "missing_return"));
});

test("evaluateDeepSquatSegmentsTiming summarizes batch timing quality", () => {
  const result = evaluateDeepSquatSegmentsTiming({
    posePayload: createPayload(),
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
        cameraView: "front",
        startSecond: 7.9,
        endSecond: 8.3,
      },
    ],
  });

  assert.equal(result.status, "needs_adjustment");
  assert.equal(result.summary.segmentsTotal, 2);
  assert.equal(result.summary.detectedCycles, 2);
  assert.equal(result.summary.goodCount, 1);
  assert.equal(result.summary.needsAdjustmentCount, 1);
  assert.equal(result.items[1].segmentId, "seg_2");
  assert.ok(result.summary.issueCounts.too_short >= 1);
});
