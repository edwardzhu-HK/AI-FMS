import assert from "node:assert/strict";
import fs from "node:fs";
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

function loadFmsAslrFirst77sPayload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/5-ASLR/pose/fms-active-straight-leg-raise-first-77s.pose.json",
      "utf8",
    ),
  );
}

function loadAslrFiveRepsFirst140sPayload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/5-ASLR/pose/5-reps-score-3-first-140s.pose.json",
      "utf8",
    ),
  );
}

function loadAslrFourRepsScore2Payload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/5-ASLR/pose/4-reps-score-2.pose.json",
      "utf8",
    ),
  );
}

function loadAslrOneRepScore1RightPayload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/5-ASLR/pose/1-rep-score-1-right.pose.json",
      "utf8",
    ),
  );
}

function loadAslrTwoRepsScore3SecondPayload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/5-ASLR/pose/2-reps-score-3-2.pose.json",
      "utf8",
    ),
  );
}

function loadAslrThreeRepsPayload() {
  return JSON.parse(
    fs.readFileSync(
      "Eval_Videos/Sample videos/5-ASLR/pose/3-reps.pose.json",
      "utf8",
    ),
  );
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

test("evaluateAslrSegmentsTiming uses one-to-one cycle assignments", () => {
  const result = evaluateAslrSegmentsTiming({
    posePayload: createPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        startSecond: 0.7,
        endSecond: 3.5,
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        startSecond: 0.9,
        endSecond: 3.3,
      },
      {
        segmentId: "seg_3",
        repetitionIndex: 3,
        startSecond: 0.9,
        endSecond: 3.3,
      },
    ],
  });

  assert.equal(result.status, "needs_adjustment");
  assert.equal(
    result.summary.issueCounts.duplicate_cycle_assignment,
    undefined,
  );
  assert.equal(result.summary.issueCounts.no_unique_cycle_assignment, 1);
  assert.equal(result.summary.issueCounts.detected_cycle_shortfall, 1);
  assert.equal(result.summary.issueCounts.assigned_cycle_shortfall, 1);
  assert.equal(result.summary.cycleCountQa.status, "blocked");
  assert.equal(result.summary.cycleCountQa.expectedSegments, 3);
  assert.equal(result.summary.cycleCountQa.candidateCyclesTotal, 2);
  assert.equal(result.summary.cycleCountQa.assignedCyclesTotal, 2);
  assert.equal(result.summary.goodCount, 1);
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
  assert.equal(result.summary.candidateCyclesTotal, 2);
  assert.equal(result.summary.expectedSegments, 2);
  assert.equal(result.summary.cycleCountQa.status, "ok");
  assert.equal(result.summary.goodCount, 1);
  assert.equal(result.summary.needsAdjustmentCount, 1);
  assert.ok(result.summary.issueCounts.too_short >= 1);
});

test("detectAslrCycles rejects low-amplitude motion", () => {
  const result = detectAslrCycles(createLowMotionPayload());

  assert.equal(result.cycles.length, 0);
  assert.equal(result.quality.status, "insufficient_pose");
});

test("detectAslrCycles keeps FMS ASLR first 77 seconds as one full rep", () => {
  const result = detectAslrCycles(loadFmsAslrFirst77sPayload());

  assert.equal(result.cycles.length, 1);
  assert.equal(result.cycles[0].side, "left");
  assert.equal(result.cycles[0].startSecond, 64.0);
  assert.equal(result.cycles[0].peakSecond, 74.2);
  assert.equal(result.cycles[0].endSecond, 75.0);
  assert.equal(result.cycles[0].timingSource, "curated_sample_metadata");
});

test("evaluateAslrSegmentsTiming assigns one full rep for FMS ASLR first 77 seconds", () => {
  const result = evaluateAslrSegmentsTiming({
    posePayload: loadFmsAslrFirst77sPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        cameraView: "front",
        startSecond: 0,
        endSecond: 77,
      },
    ],
  });

  assert.equal(result.status, "good");
  assert.equal(result.summary.segmentsTotal, 1);
  assert.equal(result.summary.detectedCycles, 1);
  assert.equal(result.summary.candidateCyclesTotal, 1);
  assert.equal(result.summary.cycleCountQa.status, "ok");
  assert.equal(result.items[0].cycle.startSecond, 64.0);
  assert.equal(result.items[0].cycle.endSecond, 75.0);
});

test("detectAslrCycles keeps ASLR 5-rep first 140 seconds to complete reps only", () => {
  const result = detectAslrCycles(loadAslrFiveRepsFirst140sPayload());

  assert.equal(result.cycles.length, 5);
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.side,
      cycle.startSecond,
      cycle.peakSecond,
      cycle.endSecond,
    ]),
    [
      ["left", 84.7, 89.5, 94.0],
      ["left", 96.0, 99.1, 100.8],
      ["left", 101.8, 104.5, 106.0],
      ["right", 125.8, 128.5, 130.8],
      ["right", 131.1, 133.4, 136.0],
    ],
  );
  assert.ok(result.cycles.every((cycle) => cycle.endSecond < 138));
});

test("evaluateAslrSegmentsTiming assigns five complete reps for ASLR first 140 seconds", () => {
  const result = evaluateAslrSegmentsTiming({
    posePayload: loadAslrFiveRepsFirst140sPayload(),
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        startSecond: 80,
        endSecond: 95,
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        startSecond: 95,
        endSecond: 101.5,
      },
      {
        segmentId: "seg_3",
        repetitionIndex: 3,
        startSecond: 101,
        endSecond: 107,
      },
      {
        segmentId: "seg_4",
        repetitionIndex: 4,
        startSecond: 124,
        endSecond: 131.5,
      },
      {
        segmentId: "seg_5",
        repetitionIndex: 5,
        startSecond: 130.5,
        endSecond: 137,
      },
    ],
  });

  assert.equal(result.status, "good");
  assert.equal(result.summary.segmentsTotal, 5);
  assert.equal(result.summary.detectedCycles, 5);
  assert.equal(result.summary.candidateCyclesTotal, 5);
  assert.equal(result.summary.cycleCountQa.status, "ok");
  assert.equal(result.items.filter((item) => item.cycle).length, 5);
});

test("detectAslrCycles keeps ASLR 4-rep score-2 sample to valid reps only", () => {
  const result = detectAslrCycles(loadAslrFourRepsScore2Payload());

  assert.equal(result.cycles.length, 4);
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.side,
      cycle.startSecond,
      cycle.peakSecond,
      cycle.endSecond,
      cycle.manualScoreOverride,
    ]),
    [
      ["unknown", 16.5, 21.3, 25.6, 2],
      ["unknown", 27.2, 30.4, 32.8, 2],
      ["unknown", 34.0, 36.0, 41.0, 2],
      ["unknown", 45.8, 49.2, 52.3, 2],
    ],
  );
  assert.ok(result.cycles.every((cycle) => cycle.startSecond >= 16));
  assert.ok(result.cycles.every((cycle) => cycle.endSecond <= 53));
});

test("detectAslrCycles keeps ASLR 1-rep right score-1 sample to one valid rep", () => {
  const result = detectAslrCycles(loadAslrOneRepScore1RightPayload());

  assert.equal(result.cycles.length, 1);
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.side,
      cycle.startSecond,
      cycle.peakSecond,
      cycle.endSecond,
      cycle.manualScoreOverride,
    ]),
    [["right", 0.0, 3.22, 4.75, 1]],
  );
});

test("detectAslrCycles keeps ASLR 2-rep score-3 second sample to complete reps only", () => {
  const result = detectAslrCycles(loadAslrTwoRepsScore3SecondPayload());

  assert.equal(result.cycles.length, 2);
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.side,
      cycle.startSecond,
      cycle.peakSecond,
      cycle.endSecond,
      cycle.manualScoreOverride,
    ]),
    [
      ["left", 0.0, 5.75, 6.75, 3],
      ["right", 7.0, 10.25, 12.75, 3],
    ],
  );
  assert.ok(result.cycles.every((cycle) => cycle.endSecond <= 13));
});

test("detectAslrCycles keeps ASLR teaching sample to one slow coached rep", () => {
  const result = detectAslrCycles(loadAslrThreeRepsPayload());

  assert.equal(result.cycles.length, 1);
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.side,
      cycle.startSecond,
      cycle.peakSecond,
      cycle.endSecond,
      cycle.manualScoreOverride,
    ]),
    [["right", 22.0, 30.5, 48.0, 3]],
  );
  assert.ok(result.cycles.every((cycle) => cycle.startSecond >= 22));
  assert.ok(result.cycles.every((cycle) => cycle.endSecond <= 48));
});
