import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiDraftTimingPayloads,
  filterSegmentsWithDetectedCycles,
} from "../src/lib/ai-draft-timing.js";

function createSegment(index, startSecond, endSecond) {
  return {
    segmentId: `seg_${index}`,
    repetitionIndex: index,
    startSecond,
    endSecond,
    side: "none",
    painFlag: false,
    clearingTest: "not_applicable",
    clearingFindings: [],
    rubricVersion: "fms_v1.0",
  };
}

test("buildAiDraftTimingPayloads compacts shortfall cases to detected cycles", () => {
  const segments = [
    createSegment(1, 0, 13.59),
    createSegment(2, 10.59, 25.59),
    createSegment(3, 22.59, 37.58),
    createSegment(4, 34.58, 49.58),
    createSegment(5, 46.58, 59.97),
  ];
  const timingReport = {
    cycles: [
      { startSecond: 34.7, endSecond: 38.15, lowestPointSecond: 36.8 },
      { startSecond: 40.9, endSecond: 45.15, lowestPointSecond: 43.6 },
      { startSecond: 46.3, endSecond: 50.45, lowestPointSecond: 48.8 },
    ],
    items: [],
  };

  const updates = buildAiDraftTimingPayloads({
    segments,
    timingReport,
    rangeStartSecond: 0,
    rangeEndSecond: 59.97,
  });

  assert.deepEqual(
    updates.map((update) => update.segmentId),
    ["seg_1", "seg_2", "seg_3"],
  );
  assert.deepEqual(
    updates.map((update) => [update.startSecond, update.endSecond]),
    [
      [34.5, 38.35],
      [40.7, 45.35],
      [46.1, 50.65],
    ],
  );
});

test("buildAiDraftTimingPayloads fills unknown side from detected cycle", () => {
  const segments = [
    {
      ...createSegment(1, 0, 10),
      side: "unknown",
    },
    {
      ...createSegment(2, 10, 20),
      side: "right",
    },
  ];
  const timingReport = {
    cycles: [],
    items: [
      {
        segmentId: "seg_1",
        cycle: { startSecond: 1, endSecond: 5, peakSecond: 3, side: "left" },
        issues: [],
      },
      {
        segmentId: "seg_2",
        cycle: { startSecond: 11, endSecond: 15, peakSecond: 13, side: "left" },
        issues: [],
      },
    ],
  };

  const updates = buildAiDraftTimingPayloads({
    segments,
    timingReport,
    rangeStartSecond: 0,
    rangeEndSecond: 20,
  });

  assert.deepEqual(
    updates.map((update) => update.side),
    ["left", "right"],
  );
});

test("filterSegmentsWithDetectedCycles keeps only reviewable action segments", () => {
  const segments = [
    createSegment(1, 34.5, 38.35),
    createSegment(2, 40.7, 45.35),
    createSegment(3, 46.1, 50.65),
    createSegment(4, 34.58, 49.58),
    createSegment(5, 46.58, 59.97),
  ];
  const timingReport = {
    items: [
      { segmentId: "seg_1", cycle: { startSecond: 34.7, endSecond: 38.15 } },
      { segmentId: "seg_2", cycle: { startSecond: 40.9, endSecond: 45.15 } },
      { segmentId: "seg_3", cycle: { startSecond: 46.3, endSecond: 50.45 } },
      { segmentId: "seg_4", cycle: null },
      { segmentId: "seg_5", cycle: null },
    ],
  };

  const filtered = filterSegmentsWithDetectedCycles({
    segments,
    timingReport,
  });

  assert.deepEqual(
    filtered.map((segment) => segment.segmentId),
    ["seg_1", "seg_2", "seg_3"],
  );
});
