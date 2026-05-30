import assert from "node:assert/strict";
import test from "node:test";
import { summarizeHurdleStepPoseFeatures } from "../src/lib/hurdle-step-features.js";
import { evaluateHurdleStepSegmentsTiming } from "../src/lib/hurdle-step-timing.js";

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

function legLandmarks(side, lift, stanceDrift = 0, visibility = 0.95) {
  const baseX = side === "left" ? 0.42 : 0.58;
  return [
    landmark(`${side}_hip`, baseX, 0.55, visibility),
    landmark(`${side}_knee`, baseX, 0.68 - lift * 0.9, visibility),
    landmark(`${side}_ankle`, baseX + stanceDrift, 0.82 - lift, visibility),
    landmark(
      `${side}_foot_index`,
      baseX + stanceDrift,
      0.84 - lift,
      visibility,
    ),
  ];
}

function frame(second, lifts, options = {}) {
  const rightStanceDrift = options.rightStanceDrift ?? 0;
  const trunkShift = options.trunkShift ?? 0;

  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_shoulder", 0.42 + trunkShift, 0.32),
          landmark("right_shoulder", 0.58 + trunkShift, 0.32),
          ...legLandmarks("left", lifts.left ?? 0),
          ...legLandmarks("right", lifts.right ?? 0, rightStanceDrift),
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

  for (let second = 0; second <= 4; second += 0.2) {
    const roundedSecond = Number(second.toFixed(1));
    frames.push(
      frame(
        roundedSecond,
        {
          left: triangularLift(second, 2),
          right: 0,
        },
        {
          rightStanceDrift: 0.008 * Math.sin(second),
        },
      ),
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

test("summarizeHurdleStepPoseFeatures reports step evidence", () => {
  const posePayload = createPayload();
  const timingReport = evaluateHurdleStepSegmentsTiming({
    posePayload,
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 0.8,
        endSecond: 3.2,
      },
    ],
  });
  const report = summarizeHurdleStepPoseFeatures({
    posePayload,
    timingReport,
  });

  assert.equal(report.summary.repetitionsTotal, 1);
  assert.equal(report.summary.usableRepetitions, 1);
  assert.equal(report.items[0].ratings.hurdleClearance.status, "good");
  assert.equal(report.items[0].ratings.stanceLegControl.status, "good");
  assert.equal(report.items[0].ratings.stepLegAlignment.status, "good");
  assert.equal(report.items[0].ratings.pelvisTrunkControl.status, "good");
  assert.equal(report.items[0].ratings.stepClearance.status, "good");
  assert.equal(report.items[0].ratings.stanceStability.status, "good");
  assert.equal(report.items[0].ratings.trunkControl.status, "good");
  assert.equal(report.items[0].ratings.sideConfidence.status, "good");
  assert.equal(report.items[0].metrics.side, "left");
  assert.equal(report.items[0].metrics.stanceSide, "right");
  assert.equal(typeof report.items[0].metrics.peakClearance, "number");
  assert.equal(typeof report.items[0].metrics.stanceKneeAngleDegrees, "number");
  assert.equal(typeof report.items[0].metrics.stepKneeLineOffset, "number");
});

test("summarizeHurdleStepPoseFeatures returns null without timing evidence", () => {
  assert.equal(
    summarizeHurdleStepPoseFeatures({
      posePayload: createPayload(),
      timingReport: null,
    }),
    null,
  );
});

test("summarizeHurdleStepPoseFeatures marks items without cycles", () => {
  const report = summarizeHurdleStepPoseFeatures({
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
