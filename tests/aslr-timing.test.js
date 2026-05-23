import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAslrFrameFeatures,
  detectAslrCycles,
  evaluateAslrSegmentTiming,
  evaluateAslrSegmentsTiming,
} from "../src/lib/aslr-timing.js";

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

function legLandmarks(side, ankleY, visibility = 0.95) {
  const prefix = side;
  return [
    landmark(`${prefix}_hip`, 0.62, visibility),
    landmark(`${prefix}_knee`, (0.62 + ankleY) / 2, visibility),
    landmark(`${prefix}_ankle`, ankleY, visibility),
    landmark(`${prefix}_foot_index`, ankleY - 0.02, visibility),
  ];
}

function frame(second, elevations) {
  const baselineAnkleY = 0.7;
  const leftAnkleY = baselineAnkleY - (elevations.left ?? 0);
  const rightAnkleY = baselineAnkleY - (elevations.right ?? 0);

  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          ...legLandmarks("left", leftAnkleY),
          ...legLandmarks("right", rightAnkleY),
        ],
      },
    ],
  };
}

function triangularElevation(second, center, height = 0.24) {
  const distance = Math.abs(second - center);
  return Math.max(0, 1 - distance / 1.1) * height;
}

function createPayload() {
  const frames = [];

  for (let second = 0; second <= 9; second += 0.2) {
    frames.push(
      frame(Number(second.toFixed(1)), {
        right: triangularElevation(second, 2),
        left: triangularElevation(second, 6),
      }),
    );
  }

  return {
    schemaVersion: "ai_fms_pose_landmarks_v1",
    sourceVideo: {
      fileName: "synthetic-aslr.mp4",
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
    frames: Array.from({ length: 30 }, (_, index) =>
      frame(index * 0.2, {
        left: 0.01,
        right: 0.015,
      }),
    ),
  };
}

test("buildAslrFrameFeatures extracts side-specific leg landmarks", () => {
  const features = buildAslrFrameFeatures({
    frames: [frame(1, { right: 0.2 })],
  });

  assert.equal(features.length, 2);
  assert.deepEqual(features.map((feature) => feature.side).sort(), [
    "left",
    "right",
  ]);
  assert.ok(features.every((feature) => feature.visibility > 0.9));
});

test("detectAslrCycles finds alternating leg raise peaks", () => {
  const result = detectAslrCycles(createPayload());

  assert.equal(result.quality.status, "ok");
  assert.equal(result.cycles.length, 2);
  assert.equal(result.cycles[0].side, "right");
  assert.equal(result.cycles[1].side, "left");
  assert.ok(Math.abs(result.cycles[0].peakSecond - 2) <= 0.2);
  assert.ok(Math.abs(result.cycles[1].peakSecond - 6) <= 0.2);
});

test("evaluateAslrSegmentTiming accepts complete segment coverage", () => {
  const result = evaluateAslrSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 0.7,
      endSecond: 3.5,
    },
  });

  assert.equal(result.status, "good");
  assert.equal(result.cycle.side, "right");
  assert.equal(
    result.issues.some((issue) => issue.code === "too_short"),
    false,
  );
});

test("evaluateAslrSegmentTiming flags a clipped leg raise", () => {
  const result = evaluateAslrSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 1.9,
      endSecond: 2.2,
    },
  });

  assert.equal(result.status, "needs_adjustment");
  assert.ok(result.issues.some((issue) => issue.code === "missing_start"));
  assert.ok(result.issues.some((issue) => issue.code === "missing_return"));
});

test("evaluateAslrSegmentsTiming summarizes batch timing quality", () => {
  const result = evaluateAslrSegmentsTiming({
    posePayload: createPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "side",
        startSecond: 0.7,
        endSecond: 3.5,
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        cameraView: "side",
        startSecond: 5.9,
        endSecond: 6.1,
      },
    ],
  });

  assert.equal(result.status, "needs_adjustment");
  assert.equal(result.summary.segmentsTotal, 2);
  assert.equal(result.summary.detectedCycles, 2);
  assert.equal(result.summary.goodCount, 1);
  assert.equal(result.summary.needsAdjustmentCount, 1);
  assert.ok(result.summary.issueCounts.too_short >= 1);
});

test("detectAslrCycles rejects low-amplitude motion", () => {
  const result = detectAslrCycles(createLowMotionPayload());

  assert.equal(result.cycles.length, 0);
  assert.equal(result.quality.status, "insufficient_pose");
});
