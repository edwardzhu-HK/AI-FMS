import assert from "node:assert/strict";
import test from "node:test";
import { summarizeAslrPoseFeatures } from "../src/lib/aslr-features.js";
import { evaluateAslrSegmentsTiming } from "../src/lib/aslr-timing.js";

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

function legLandmarks(side, ankleY, visibility = 0.95) {
  const x = side === "left" ? 0.42 : 0.58;
  return [
    landmark(`${side}_hip`, x, 0.62, visibility),
    landmark(`${side}_knee`, x, (0.62 + ankleY) / 2, visibility),
    landmark(`${side}_ankle`, x, ankleY, visibility),
    landmark(`${side}_foot_index`, x + 0.04, ankleY - 0.01, visibility),
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

function frameWithPelvicGap(second, hipHeightGap) {
  return {
    second,
    timestampMs: second * 1000,
    poses: [
      {
        landmarks: [
          landmark("left_hip", 0.42, 0.62 + hipHeightGap),
          landmark("left_knee", 0.42, 0.5),
          landmark("left_ankle", 0.42, 0.38),
          landmark("left_foot_index", 0.46, 0.37),
          landmark("right_hip", 0.58, 0.62),
          landmark("right_knee", 0.58, 0.5),
          landmark("right_ankle", 0.58, 0.38),
          landmark("right_foot_index", 0.62, 0.37),
        ],
      },
    ],
  };
}

function triangularElevation(second, center, height = 0.25) {
  const distance = Math.abs(second - center);
  return Math.max(0, 1 - distance / 1.1) * height;
}

function createPayload() {
  const frames = [];

  for (let second = 0; second <= 9; second += 0.2) {
    frames.push(
      frame(Number(second.toFixed(1)), {
        right: triangularElevation(second, 2),
        left: triangularElevation(second, 6, 0.18),
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

test("summarizeAslrPoseFeatures reports side-specific leg raise evidence", () => {
  const posePayload = createPayload();
  const timingReport = evaluateAslrSegmentsTiming({
    posePayload,
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
        startSecond: 4.7,
        endSecond: 7.5,
      },
    ],
  });
  const report = summarizeAslrPoseFeatures({
    posePayload,
    timingReport,
  });

  assert.equal(report.summary.repetitionsTotal, 2);
  assert.equal(report.summary.usableRepetitions, 2);
  assert.equal(report.items[0].metrics.side, "right");
  assert.equal(report.items[0].metrics.stationarySide, "left");
  assert.equal(report.items[0].ratings.activeLegRaise.status, "good");
  assert.equal(report.items[0].ratings.hipFlexion.status, "good");
  assert.equal(report.items[0].ratings.kneeExtension.status, "good");
  assert.equal(report.items[0].ratings.stationaryLegControl.status, "good");
  assert.equal(report.items[0].ratings.pelvicStability.status, "good");
  assert.equal(report.items[0].ratings.sideConfidence.status, "good");
  assert.equal(report.items[1].metrics.side, "left");
  assert.equal(report.items[1].ratings.activeLegRaise.status, "watch");
  assert.equal(report.items[1].ratings.hipFlexion.status, "watch");
  assert.equal(typeof report.items[0].metrics.ankleAboveHip, "number");
  assert.equal(typeof report.items[0].metrics.kneeAngleDegrees, "number");
  assert.equal(
    typeof report.items[0].metrics.stationaryKneeAngleDegrees,
    "number",
  );
  assert.equal(typeof report.items[0].metrics.stationaryAnkleDrift, "number");
});

test("summarizeAslrPoseFeatures returns null without timing evidence", () => {
  assert.equal(
    summarizeAslrPoseFeatures({
      posePayload: createPayload(),
      timingReport: null,
    }),
    null,
  );
});

test("summarizeAslrPoseFeatures tolerates small pelvic proxy offset", () => {
  const report = summarizeAslrPoseFeatures({
    posePayload: {
      frames: [frameWithPelvicGap(1, 0.055)],
    },
    timingReport: {
      items: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          cameraView: "side",
          metrics: {
            avgVisibility: 0.9,
            coverageRatio: 1,
          },
          cycle: {
            side: "right",
            startSecond: 0.5,
            endSecond: 1.5,
            peakSecond: 1,
            peakElevation: 0.2,
          },
        },
      ],
    },
  });

  assert.equal(report.items[0].ratings.pelvicStability.status, "good");
});

test("summarizeAslrPoseFeatures marks items without cycles", () => {
  const report = summarizeAslrPoseFeatures({
    posePayload: createPayload(),
    timingReport: {
      items: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          cameraView: "side",
          cycle: null,
        },
      ],
    },
  });

  assert.equal(report.items[0].status, "no_cycle");
  assert.equal(report.summary.usableRepetitions, 0);
});
