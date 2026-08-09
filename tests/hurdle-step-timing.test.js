import assert from "node:assert/strict";
import test from "node:test";
import {
  assignSequentialHurdleCyclesToSegments,
  buildHurdleStepFrameFeatures,
  detectHurdleStepCycles,
  evaluateHurdleStepSegmentTiming,
  evaluateHurdleStepSegmentsTiming,
  groupHurdleStepCyclesForSegments,
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
  assert.equal(result.summary.candidateCyclesTotal, 2);
  assert.equal(result.summary.expectedSegments, 2);
  assert.equal(result.summary.cycleCountQa.status, "ok");
  assert.equal(result.summary.goodCount, 1);
  assert.equal(result.summary.needsAdjustmentCount, 1);
  assert.ok(result.summary.issueCounts.too_short >= 1);
});

test("assignSequentialHurdleCyclesToSegments keeps complete reps in order when extra candidates exist", () => {
  const segments = [
    {
      segmentId: "seg_1",
      repetitionIndex: 1,
      startSecond: 17,
      endSecond: 23.73,
    },
    {
      segmentId: "seg_2",
      repetitionIndex: 2,
      startSecond: 21.52,
      endSecond: 29.24,
    },
    {
      segmentId: "seg_3",
      repetitionIndex: 3,
      startSecond: 27.04,
      endSecond: 34.76,
    },
    {
      segmentId: "seg_4",
      repetitionIndex: 4,
      startSecond: 32.55,
      endSecond: 40.27,
    },
    {
      segmentId: "seg_5",
      repetitionIndex: 5,
      startSecond: 38.06,
      endSecond: 45.78,
    },
    {
      segmentId: "seg_6",
      repetitionIndex: 6,
      startSecond: 43.58,
      endSecond: 51.3,
    },
    {
      segmentId: "seg_7",
      repetitionIndex: 7,
      startSecond: 49.09,
      endSecond: 55.6,
    },
  ];
  const cycles = [
    { startSecond: 18.15, peakSecond: 19.3, endSecond: 20.75 },
    { startSecond: 21.55, peakSecond: 22.8, endSecond: 25.15 },
    { startSecond: 26.05, peakSecond: 27, endSecond: 28.25 },
    { startSecond: 28.55, peakSecond: 29.8, endSecond: 31.85 },
    { startSecond: 32.75, peakSecond: 33.6, endSecond: 34.65 },
    { startSecond: 34.85, peakSecond: 36, endSecond: 37.25 },
    { startSecond: 38.15, peakSecond: 41.1, endSecond: 42.45 },
    { startSecond: 42.75, peakSecond: 46, endSecond: 47.45 },
    { startSecond: 46.65, peakSecond: 48.6, endSecond: 49.95 },
    { startSecond: 50.15, peakSecond: 51.5, endSecond: 53.45 },
    { startSecond: 53.35, peakSecond: 54.6, endSecond: 55.6 },
  ];
  const assignments = assignSequentialHurdleCyclesToSegments(segments, cycles);

  assert.deepEqual(
    segments.map((segment) => assignments.get(segment.segmentId)?.peakSecond),
    [19.3, 22.8, 27, 33.6, 41.1, 46, 51.5],
  );
});

test("groupHurdleStepCyclesForSegments merges forward and return pulses into full reps", () => {
  const segments = Array.from({ length: 7 }, (_, index) => ({
    segmentId: `seg_${index + 1}`,
    repetitionIndex: index + 1,
    startSecond: 17 + index * 5,
    endSecond: 23 + index * 5,
  }));
  const cycles = [
    { startSecond: 18.15, peakSecond: 19.3, endSecond: 20.75 },
    { startSecond: 21.55, peakSecond: 22.8, endSecond: 25.15 },
    { startSecond: 26.05, peakSecond: 27, endSecond: 28.25 },
    { startSecond: 28.55, peakSecond: 29.8, endSecond: 31.85 },
    { startSecond: 32.75, peakSecond: 33.6, endSecond: 34.65 },
    { startSecond: 34.85, peakSecond: 36, endSecond: 37.25 },
    { startSecond: 38.15, peakSecond: 41.1, endSecond: 42.45 },
    { startSecond: 42.75, peakSecond: 46, endSecond: 47.45 },
    { startSecond: 46.65, peakSecond: 48.6, endSecond: 49.95 },
    { startSecond: 50.15, peakSecond: 51.5, endSecond: 53.45 },
    { startSecond: 53.35, peakSecond: 54.6, endSecond: 55.6 },
  ];
  const grouped = groupHurdleStepCyclesForSegments(cycles, segments);

  assert.deepEqual(
    grouped.map((cycle) => [cycle.startSecond, cycle.endSecond]),
    [
      [18.15, 25.15],
      [26.05, 31.85],
      [32.75, 37.25],
      [38.15, 42.45],
      [42.75, 47.45],
      [46.65, 49.95],
      [50.15, 55.6],
    ],
  );
});

test("groupHurdleStepCyclesForSegments pairs same-side forward and return pulses", () => {
  const segments = Array.from({ length: 2 }, (_, index) => ({
    segmentId: `seg_${index + 1}`,
    repetitionIndex: index + 1,
    startSecond: 0,
    endSecond: 46.23,
  }));
  const cycles = [
    { side: "left", startSecond: 4.2, peakSecond: 4.3, endSecond: 5.25 },
    { side: "left", startSecond: 13.75, peakSecond: 16.8, endSecond: 18.75 },
    { side: "left", startSecond: 20.55, peakSecond: 22.7, endSecond: 25.25 },
    { side: "right", startSecond: 28.25, peakSecond: 31.9, endSecond: 33.45 },
    { side: "right", startSecond: 35.25, peakSecond: 37.3, endSecond: 39.85 },
  ];
  const grouped = groupHurdleStepCyclesForSegments(cycles, segments);

  assert.deepEqual(
    grouped.map((cycle) => [cycle.side, cycle.startSecond, cycle.endSecond]),
    [
      ["left", 13.75, 26.45],
      ["right", 28.25, 41.05],
    ],
  );
});

test("evaluateHurdleStepSegmentsTiming uses curated timing for bilateral 12-rep teaching sample", () => {
  const segments = Array.from({ length: 12 }, (_, index) => ({
    segmentId: `seg_${index + 1}`,
    repetitionIndex: index + 1,
    cameraView: index < 6 ? "front" : "side",
    startSecond: 0,
    endSecond: 127,
  }));
  const result = evaluateHurdleStepSegmentsTiming({
    posePayload: {
      sourceVideo: {
        fileName: "6reps each side, total 12 reps, score 3 for both sides.mp4",
      },
      frames: [],
    },
    segments,
  });

  assert.equal(result.status, "good");
  assert.equal(result.summary.goodCount, 12);
  assert.equal(result.summary.detectedCycles, 12);
  assert.equal(result.summary.cycleCountQa.status, "ok");
  assert.deepEqual(
    result.cycles.map((cycle) => cycle.side),
    [
      "right",
      "right",
      "right",
      "left",
      "left",
      "left",
      "right",
      "right",
      "right",
      "left",
      "left",
      "left",
    ],
  );
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.repetitionIndex,
      cycle.startSecond,
      cycle.endSecond,
    ]),
    [
      [1, 62.8, 67.6],
      [2, 67.6, 72.4],
      [3, 72.4, 77.2],
      [4, 78.9, 83.2],
      [5, 83.2, 88],
      [6, 88, 93.1],
      [7, 102.2, 106.2],
      [8, 106.2, 110.2],
      [9, 110.2, 115],
      [10, 115.8, 119.5],
      [11, 119.5, 123],
      [12, 123, 127],
    ],
  );
});

test("evaluateHurdleStepSegmentsTiming ignores view-transition reps in 12-rep score-3 sample", () => {
  const segments = [
    { segmentId: "seg_1", repetitionIndex: 1, cameraView: "front" },
    { segmentId: "seg_2", repetitionIndex: 2, cameraView: "side" },
    { segmentId: "seg_3", repetitionIndex: 3, cameraView: "side" },
    { segmentId: "seg_4", repetitionIndex: 4, cameraView: "front" },
  ].map((segment) => ({
    ...segment,
    startSecond: 20,
    endSecond: 53,
  }));
  const result = evaluateHurdleStepSegmentsTiming({
    posePayload: {
      sourceVideo: {
        fileName: "12 reps score 3.mp4",
      },
      frames: [],
    },
    segments,
  });

  assert.equal(result.status, "good");
  assert.equal(result.summary.goodCount, 4);
  assert.equal(result.summary.detectedCycles, 4);
  assert.deepEqual(
    result.cycles.map((cycle) => cycle.side),
    ["right", "right", "left", "left"],
  );
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.repetitionIndex,
      cycle.startSecond,
      cycle.endSecond,
    ]),
    [
      [1, 21.3, 28.5],
      [2, 34, 38.5],
      [3, 39, 43.5],
      [4, 48.8, 52.5],
    ],
  );
});

test("evaluateHurdleStepSegmentsTiming uses curated timing for first-four red-subject sample", () => {
  const segments = [
    { segmentId: "seg_1", repetitionIndex: 1, cameraView: "front" },
    { segmentId: "seg_2", repetitionIndex: 2, cameraView: "front" },
    { segmentId: "seg_3", repetitionIndex: 3, cameraView: "front" },
    { segmentId: "seg_4", repetitionIndex: 4, cameraView: "front" },
  ].map((segment) => ({
    ...segment,
    startSecond: 60,
    endSecond: 92,
  }));
  const result = evaluateHurdleStepSegmentsTiming({
    posePayload: {
      sourceVideo: {
        fileName: "first 4 reps all score 3.mp4",
      },
      frames: [],
    },
    segments,
  });

  assert.equal(result.status, "good");
  assert.equal(result.summary.goodCount, 4);
  assert.equal(result.summary.detectedCycles, 4);
  assert.deepEqual(
    result.cycles.map((cycle) => cycle.side),
    ["right", "left", "right", "left"],
  );
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.repetitionIndex,
      cycle.startSecond,
      cycle.endSecond,
    ]),
    [
      [1, 62, 68.5],
      [2, 70, 77],
      [3, 78, 83],
      [4, 84, 90.5],
    ],
  );
});

test("evaluateHurdleStepSegmentsTiming keeps full forward-and-return reps for score-2 six-rep sample", () => {
  const segments = Array.from({ length: 6 }, (_, index) => ({
    segmentId: `seg_${index + 1}`,
    repetitionIndex: index + 1,
    cameraView: "front",
    startSecond: 126,
    endSecond: 190,
  }));
  const result = evaluateHurdleStepSegmentsTiming({
    posePayload: {
      sourceVideo: {
        fileName: "6reps total score 2 fo r both sides.mp4",
      },
      frames: [],
    },
    segments,
  });

  assert.equal(result.status, "good");
  assert.equal(result.summary.goodCount, 6);
  assert.equal(result.summary.detectedCycles, 6);
  assert.deepEqual(
    result.cycles.map((cycle) => [
      cycle.repetitionIndex,
      cycle.side,
      cycle.startSecond,
      cycle.endSecond,
      cycle.scoreOneEvidence ?? null,
    ]),
    [
      [1, "right", 126.5, 134, null],
      [2, "left", 139.5, 145, null],
      [3, "right", 147.5, 155, null],
      [4, "left", 159.5, 166.5, "hurdle_contact"],
      [5, "left", 171, 179, null],
      [6, "left", 181, 190, null],
    ],
  );
});

test("detectHurdleStepCycles rejects low-amplitude motion", () => {
  const result = detectHurdleStepCycles(createLowMotionPayload());

  assert.equal(result.cycles.length, 0);
  assert.equal(result.quality.status, "insufficient_pose");
});
