import assert from "node:assert/strict";
import test from "node:test";
import { buildSegmentsFromCycle } from "../src/lib/segmenting.js";

test("buildSegmentsFromCycle uses expected reps and keeps in range", () => {
  const segments = buildSegmentsFromCycle({
    startSecond: 0,
    endSecond: 20,
    expectedReps: 3,
    notes: "都是正面",
    fileName: "front.mp4",
  });

  assert.equal(segments.length, 3);
  assert.equal(segments[0].startSecond, 0);
  assert.equal(segments[2].endSecond, 20);
  assert.ok(segments[0].endSecond > segments[1].startSecond);
  assert.equal(segments[0].cameraView, "front");
});

test("buildSegmentsFromCycle supports mixed front/side notes", () => {
  const segments = buildSegmentsFromCycle({
    startSecond: 0,
    endSecond: 42,
    expectedReps: 7,
    notes: "前三个正面，后四个侧面",
    fileName: "Sample-1.mp4",
  });

  const views = segments.map((segment) => segment.cameraView);
  assert.deepEqual(views, [
    "front",
    "front",
    "front",
    "side",
    "side",
    "side",
    "side",
  ]);
  assert.equal(segments[0].startSecond, 0);
  assert.equal(segments[6].endSecond, 42);
});

test("buildSegmentsFromCycle supports 12-rep Hurdle front then side notes", () => {
  const segments = buildSegmentsFromCycle({
    startSecond: 0,
    endSecond: 127,
    expectedReps: 12,
    notes:
      "Hurdle Step 12 reps score 3：前6个正面，后6个侧面。顺序为正面 right 3 reps、正面 left 3 reps、侧面 right 3 reps、侧面 left 3 reps。",
    fileName: "6reps each side, total 12 reps, score 3 for both sides.mp4",
  });

  assert.equal(segments.length, 12);
  assert.deepEqual(
    segments.map((segment) => segment.cameraView),
    [
      "front",
      "front",
      "front",
      "front",
      "front",
      "front",
      "side",
      "side",
      "side",
      "side",
      "side",
      "side",
    ],
  );
  assert.equal(segments[0].startSecond, 0);
  assert.equal(segments[11].endSecond, 127);
});

test("buildSegmentsFromCycle supports clean-view subset notes for Hurdle 12-rep source video", () => {
  const segments = buildSegmentsFromCycle({
    startSecond: 20,
    endSecond: 53,
    expectedReps: 4,
    notes:
      "Hurdle Step 12 reps score 3 source video；clean subset for pose-based scoring。只保留纯视角 clean reps：rep 1 front 21.3-28.5, rep 2 side 34.0-38.5, rep 3 side 39.0-43.5, rep 4 front 48.8-52.5。",
    fileName: "12 reps score 3.mp4",
  });

  assert.equal(segments.length, 4);
  assert.deepEqual(
    segments.map((segment) => segment.cameraView),
    ["front", "side", "side", "front"],
  );
});

test("buildSegmentsFromCycle can infer mixed view from sample file name fallback", () => {
  const segments = buildSegmentsFromCycle({
    startSecond: 1,
    endSecond: 45,
    expectedReps: 7,
    notes: "",
    fileName: "Sample-1.mp4",
  });

  const views = segments.map((segment) => segment.cameraView);
  assert.deepEqual(views, [
    "front",
    "front",
    "front",
    "side",
    "side",
    "side",
    "side",
  ]);
  assert.equal(segments[0].startSecond, 1);
  assert.equal(segments[6].endSecond, 45);
});

test("buildSegmentsFromCycle supports explicit single-rep overrides", () => {
  const segments = buildSegmentsFromCycle({
    startSecond: 0,
    endSecond: 24,
    expectedReps: 4,
    notes: "第2个动作侧面，第3个动作正面",
    fileName: "mixed.mp4",
  });

  assert.equal(segments[0].cameraView, "front");
  assert.equal(segments[1].cameraView, "side");
  assert.equal(segments[2].cameraView, "front");
});

test("buildSegmentsFromCycle can estimate reps from notes when expected_reps missing", () => {
  const segments = buildSegmentsFromCycle({
    startSecond: 0,
    endSecond: 42,
    expectedReps: null,
    notes: "共七个动作，前三个正面，后四个侧面",
    fileName: "sample.mp4",
  });

  assert.equal(segments.length, 7);
});
