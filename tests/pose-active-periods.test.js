import assert from "node:assert/strict";
import test from "node:test";
import { detectPoseActivePeriods } from "../src/lib/pose-active-periods.js";

const LANDMARK_NAMES = [
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

function landmark(name, second, activeStart, activeEnd) {
  const isActive = second >= activeStart && second <= activeEnd;
  const motion = isActive
    ? Math.sin((second - activeStart) * Math.PI) * 0.08
    : 0;
  const sideOffset = name.startsWith("left") ? -0.04 : 0.04;
  const lowerBodyOffset =
    name.includes("ankle") || name.includes("knee") ? motion : motion * 0.35;

  return {
    name,
    x: 0.5 + sideOffset + lowerBodyOffset,
    y: 0.45 + lowerBodyOffset,
    z: 0,
    visibility: 0.95,
    presence: 0.98,
  };
}

function frame(second, activeStart = 4, activeEnd = 8) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: LANDMARK_NAMES.map((name) =>
          landmark(name, second, activeStart, activeEnd),
        ),
      },
    ],
  };
}

function createPayload({ activeStart = 4, activeEnd = 8 } = {}) {
  return {
    schemaVersion: "ai_fms_pose_landmarks_v1",
    sourceVideo: {
      fileName: "synthetic-active-period.mp4",
    },
    poseModel: {
      name: "synthetic_pose",
    },
    frames: Array.from({ length: 121 }, (_, index) =>
      frame(index * 0.1, activeStart, activeEnd),
    ),
  };
}

test("detectPoseActivePeriods suggests a focused active analysis range", () => {
  const result = detectPoseActivePeriods(createPayload(), {
    minMotionScore: 0.002,
  });

  assert.equal(result.status, "ok");
  assert.equal(result.periods.length, 1);
  assert.ok(result.recommendedRange.startSecond >= 3);
  assert.ok(result.recommendedRange.startSecond <= 4.5);
  assert.ok(result.recommendedRange.endSecond >= 7.5);
  assert.ok(result.recommendedRange.endSecond <= 9);
});

test("detectPoseActivePeriods returns no_active_period for static pose", () => {
  const result = detectPoseActivePeriods(
    createPayload({
      activeStart: 20,
      activeEnd: 21,
    }),
  );

  assert.equal(result.status, "no_active_period");
  assert.equal(result.periods.length, 0);
  assert.equal(result.recommendedRange, null);
});

test("detectPoseActivePeriods reports insufficient pose for tiny payload", () => {
  const result = detectPoseActivePeriods({
    frames: [frame(0), frame(0.1)],
  });

  assert.equal(result.status, "insufficient_pose");
});
