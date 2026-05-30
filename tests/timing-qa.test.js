import assert from "node:assert/strict";
import test from "node:test";
import {
  assignUniqueCyclesToSegments,
  dedupeOverlappingCycles,
  summarizeCycleCountQa,
} from "../src/lib/timing-qa.js";

test("dedupeOverlappingCycles keeps the stronger overlapping movement cycle", () => {
  const cycles = dedupeOverlappingCycles([
    {
      repetitionIndex: 1,
      startSecond: 10,
      endSecond: 14,
      peakSecond: 11,
      peakClearance: 0.08,
      avgVisibility: 0.9,
    },
    {
      repetitionIndex: 2,
      startSecond: 10.1,
      endSecond: 14.1,
      peakSecond: 12,
      peakClearance: 0.15,
      avgVisibility: 0.95,
    },
    {
      repetitionIndex: 3,
      startSecond: 18,
      endSecond: 21,
      peakSecond: 19,
      peakClearance: 0.12,
      avgVisibility: 0.9,
    },
  ]);

  assert.equal(cycles.length, 2);
  assert.equal(cycles[0].peakSecond, 12);
  assert.deepEqual(
    cycles.map((cycle) => cycle.repetitionIndex),
    [1, 2],
  );
});

test("assignUniqueCyclesToSegments does not reuse one cycle for two segments", () => {
  const assignments = assignUniqueCyclesToSegments(
    [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        startSecond: 0,
        endSecond: 5,
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        startSecond: 5,
        endSecond: 10,
      },
    ],
    [
      {
        repetitionIndex: 1,
        startSecond: 2,
        endSecond: 4,
        peakSecond: 3,
      },
    ],
  );

  assert.equal(assignments.size, 1);
  assert.equal(assignments.has("seg_1"), true);
  assert.equal(assignments.has("seg_2"), false);
});

test("summarizeCycleCountQa flags candidate cycle shortfall as blocker", () => {
  const summary = summarizeCycleCountQa({
    segments: [
      { segmentId: "seg_1", repetitionIndex: 1 },
      { segmentId: "seg_2", repetitionIndex: 2 },
      { segmentId: "seg_3", repetitionIndex: 3 },
    ],
    candidateCycles: [{ repetitionIndex: 1 }],
    assignedCycles: [{ repetitionIndex: 1 }],
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.expectedSegments, 3);
  assert.equal(summary.candidateCyclesTotal, 1);
  assert.equal(summary.assignedCyclesTotal, 1);
  assert.deepEqual(
    summary.issues.map((issue) => issue.code),
    ["detected_cycle_shortfall", "assigned_cycle_shortfall"],
  );
});

test("summarizeCycleCountQa flags extra candidate cycles as review-only", () => {
  const summary = summarizeCycleCountQa({
    segments: [
      { segmentId: "seg_1", repetitionIndex: 1 },
      { segmentId: "seg_2", repetitionIndex: 2 },
    ],
    candidateCycles: [
      { repetitionIndex: 1 },
      { repetitionIndex: 2 },
      { repetitionIndex: 3 },
    ],
    assignedCycles: [{ repetitionIndex: 1 }, { repetitionIndex: 2 }],
  });

  assert.equal(summary.status, "needs_review");
  assert.deepEqual(
    summary.issues.map((issue) => issue.code),
    ["extra_candidate_cycles"],
  );
});
