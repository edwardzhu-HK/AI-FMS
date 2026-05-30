import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInlineLungeFrameFeatures,
  detectInlineLungeCycles,
  evaluateInlineLungeSegmentTiming,
  evaluateInlineLungeSegmentsTiming,
} from "../src/lib/inline-lunge-timing.js";

function landmark(name, y, visibility = 0.95) {
  return {
    name,
    x: name.startsWith("left") ? 0.42 : 0.58,
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
          landmark("left_shoulder", 0.28),
          landmark("right_shoulder", 0.28),
          landmark("left_hip", 0.54 + depth),
          landmark("right_hip", 0.54 + depth),
          landmark("left_knee", 0.68 + depth * 0.85),
          landmark("right_knee", 0.68 + depth * 0.55),
          landmark("left_ankle", 0.86),
          landmark("right_ankle", 0.86),
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

  for (let second = 0; second <= 10; second += 0.2) {
    const depth =
      triangularDepth(second, 2.5) + triangularDepth(second, 7.2, 0.11);
    frames.push(frame(Number(second.toFixed(1)), depth));
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

function createLowMotionPayload() {
  return {
    ...createPayload(),
    frames: Array.from({ length: 30 }, (_, index) => frame(index * 0.2, 0.01)),
  };
}

test("buildInlineLungeFrameFeatures extracts lower-body depth proxy", () => {
  const features = buildInlineLungeFrameFeatures({
    frames: [frame(1, 0.12)],
  });

  assert.equal(features.length, 1);
  assert.equal(typeof features[0].hipDepthRatio, "number");
  assert.equal(typeof features[0].kneeDepthRatio, "number");
  assert.ok(features[0].visibility > 0.9);
});

test("detectInlineLungeCycles finds lunge depth peaks", () => {
  const result = detectInlineLungeCycles(createPayload());

  assert.equal(result.quality.status, "ok");
  assert.equal(result.cycles.length, 2);
  assert.ok(Math.abs(result.cycles[0].lowestPointSecond - 2.5) <= 0.2);
  assert.ok(Math.abs(result.cycles[1].lowestPointSecond - 7.2) <= 0.2);
});

test("evaluateInlineLungeSegmentTiming accepts complete segment coverage", () => {
  const result = evaluateInlineLungeSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 1.1,
      endSecond: 3.8,
    },
  });

  assert.equal(result.status, "good");
  assert.equal(
    result.issues.some((issue) => issue.code === "too_short"),
    false,
  );
});

test("evaluateInlineLungeSegmentTiming prefers cycles inside the current segment", () => {
  const result = evaluateInlineLungeSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 6,
      endSecond: 8.6,
    },
  });

  assert.equal(result.status, "good");
  assert.ok(Math.abs(result.cycle.lowestPointSecond - 7.2) <= 0.2);
});

test("evaluateInlineLungeSegmentTiming flags a clipped lunge", () => {
  const result = evaluateInlineLungeSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 2.4,
      endSecond: 2.7,
    },
  });

  assert.equal(result.status, "needs_adjustment");
  assert.ok(result.issues.some((issue) => issue.code === "missing_start"));
  assert.ok(result.issues.some((issue) => issue.code === "missing_return"));
});

test("evaluateInlineLungeSegmentsTiming summarizes batch timing quality", () => {
  const result = evaluateInlineLungeSegmentsTiming({
    posePayload: createPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 1.1,
        endSecond: 3.8,
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        cameraView: "front",
        startSecond: 7.1,
        endSecond: 7.3,
      },
    ],
  });

  assert.equal(result.status, "needs_adjustment");
  assert.equal(result.summary.segmentsTotal, 2);
  assert.equal(result.summary.detectedCycles, 2);
  assert.equal(result.summary.candidateCyclesTotal, 2);
  assert.equal(result.summary.expectedSegments, 2);
  assert.equal(result.summary.cycleCountQa.status, "ok");
  assert.equal(result.summary.goodCount, 1);
  assert.equal(result.summary.needsAdjustmentCount, 1);
  assert.ok(result.summary.issueCounts.too_short >= 1);
});

test("detectInlineLungeCycles rejects low-amplitude motion", () => {
  const result = detectInlineLungeCycles(createLowMotionPayload());

  assert.equal(result.cycles.length, 0);
  assert.equal(result.quality.status, "low_motion_amplitude");
});
