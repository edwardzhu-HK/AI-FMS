import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHurdleStepFrameFeatures,
  detectHurdleStepCycles,
  evaluateHurdleStepSegmentTiming,
  evaluateHurdleStepSegmentsTiming,
} from "../src/lib/hurdle-step-timing.js";

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

function legLandmarks(side, lift, visibility = 0.95) {
  const prefix = side;
  return [
    landmark(`${prefix}_hip`, 0.55, visibility),
    landmark(`${prefix}_knee`, 0.68 - lift * 0.9, visibility),
    landmark(`${prefix}_ankle`, 0.82 - lift, visibility),
    landmark(`${prefix}_foot_index`, 0.84 - lift, visibility),
  ];
}

function frame(second, lifts) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          ...legLandmarks("left", lifts.left ?? 0),
          ...legLandmarks("right", lifts.right ?? 0),
        ],
      },
    ],
  };
}

function triangularLift(second, center, height = 0.18) {
  const distance = Math.abs(second - center);
  return Math.max(0, 1 - distance / 0.9) * height;
}

function createPayload() {
  const frames = [];

  for (let second = 0; second <= 9; second += 0.2) {
    frames.push(
      frame(Number(second.toFixed(1)), {
        right: triangularLift(second, 2),
        left: triangularLift(second, 6),
      }),
    );
  }

  return {
    schemaVersion: "ai_fms_pose_landmarks_v1",
    sourceVideo: {
      fileName: "synthetic-hurdle.mp4",
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
        right: 0.012,
      }),
    ),
  };
}

test("buildHurdleStepFrameFeatures extracts side-specific leg landmarks", () => {
  const features = buildHurdleStepFrameFeatures({
    frames: [frame(1, { right: 0.16 })],
  });

  assert.equal(features.length, 2);
  assert.deepEqual(features.map((feature) => feature.side).sort(), [
    "left",
    "right",
  ]);
  assert.ok(features.every((feature) => feature.visibility > 0.9));
});

test("detectHurdleStepCycles finds alternating step clearance peaks", () => {
  const result = detectHurdleStepCycles(createPayload());

  assert.equal(result.quality.status, "ok");
  assert.equal(result.cycles.length, 2);
  assert.equal(result.cycles[0].side, "right");
  assert.equal(result.cycles[1].side, "left");
  assert.ok(Math.abs(result.cycles[0].peakSecond - 2) <= 0.2);
  assert.ok(Math.abs(result.cycles[1].peakSecond - 6) <= 0.2);
});

test("evaluateHurdleStepSegmentTiming accepts complete segment coverage", () => {
  const result = evaluateHurdleStepSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 1,
      endSecond: 3.3,
    },
  });

  assert.equal(result.status, "good");
  assert.equal(result.cycle.side, "right");
  assert.equal(
    result.issues.some((issue) => issue.code === "too_short"),
    false,
  );
});

test("evaluateHurdleStepSegmentTiming prefers cycles inside the current segment", () => {
  const result = evaluateHurdleStepSegmentTiming({
    posePayload: createPayload(),
    segment: {
      repetitionIndex: 1,
      startSecond: 4.8,
      endSecond: 7.3,
    },
  });

  assert.equal(result.status, "good");
  assert.equal(result.cycle.side, "left");
  assert.ok(Math.abs(result.cycle.peakSecond - 6) <= 0.2);
});

test("evaluateHurdleStepSegmentTiming flags a clipped step", () => {
  const result = evaluateHurdleStepSegmentTiming({
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

test("evaluateHurdleStepSegmentsTiming summarizes batch timing quality", () => {
  const result = evaluateHurdleStepSegmentsTiming({
    posePayload: createPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 1,
        endSecond: 3.3,
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        cameraView: "front",
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

test("detectHurdleStepCycles rejects low-amplitude motion", () => {
  const result = detectHurdleStepCycles(createLowMotionPayload());

  assert.equal(result.cycles.length, 0);
  assert.equal(result.quality.status, "insufficient_pose");
});
