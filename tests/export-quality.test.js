import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeExportQuality,
  summarizeSegmentTimingCorrections,
  summarizeTimingReadiness,
} from "../src/lib/export-quality.js";

function makeScore(totalScore) {
  return {
    totalScore,
    subscores: {
      depth: totalScore,
      kneeAlignment: totalScore,
      torsoControl: totalScore,
    },
  };
}

test("summarizeExportQuality counts labels and pose evidence coverage", () => {
  const summary = summarizeExportQuality({
    segments: [
      {
        segmentId: "seg_1",
        actionType: "deep_squat",
        aiScore: makeScore(3),
        reviewerScores: {
          reviewer_a: makeScore(3),
          reviewer_b: makeScore(3),
        },
        startSecond: 1.2,
        endSecond: 4.4,
        originalStartSecond: 1,
        originalEndSecond: 4,
        segmentSource: "manual_adjusted",
      },
      {
        segmentId: "seg_2",
        actionType: "hurdle_step",
        aiScore: makeScore(2),
        reviewerScores: {
          reviewer_a: null,
          reviewer_b: null,
        },
        startSecond: 5,
        endSecond: 8,
        originalStartSecond: 5,
        originalEndSecond: 8,
        segmentSource: "suggested",
      },
    ],
    poseSummary: {
      valid: true,
      framesTotal: 20,
      framesWithPose: 19,
      missingFramesRatio: 0.05,
      avgVisibility: 0.86,
    },
    timingReport: {
      summary: {
        segmentsTotal: 2,
        goodCount: 1,
        needsAdjustmentCount: 1,
        detectedCycles: 2,
        candidateCyclesTotal: 3,
        expectedSegments: 2,
        cycleCountQa: {
          status: "needs_review",
          expectedSegments: 2,
          candidateCyclesTotal: 3,
          assignedCyclesTotal: 2,
          issues: [
            {
              code: "extra_candidate_cycles",
              severity: "warning",
            },
          ],
        },
      },
      items: [
        {
          segmentId: "seg_1",
          status: "good",
          cycle: {
            startSecond: 0,
            endSecond: 3,
          },
        },
        {
          segmentId: "seg_2",
          status: "needs_adjustment",
        },
      ],
    },
    featureReport: {
      summary: {
        repetitionsTotal: 2,
        usableRepetitions: 1,
      },
      items: [
        {
          segmentId: "seg_1",
          status: "ok",
        },
      ],
    },
    suggestionReport: {
      summary: {
        segmentsTotal: 2,
      },
      items: [
        {
          segmentId: "seg_1",
          status: "suggested",
          totalScore: 3,
        },
      ],
    },
  });

  assert.equal(summary.recordsTotal, 2);
  assert.equal(summary.validLabels, 1);
  assert.equal(summary.pendingLabels, 1);
  assert.equal(summary.invalidLabels, 0);
  assert.equal(summary.reviewerPairCount, 1);
  assert.equal(summary.reviewerAgreementRate, 1);
  assert.deepEqual(summary.movementBreakdown.deep_squat, {
    segmentsTotal: 1,
    validCount: 1,
    invalidCount: 0,
    pendingCount: 0,
  });
  assert.deepEqual(summary.movementBreakdown.hurdle_step, {
    segmentsTotal: 1,
    validCount: 0,
    invalidCount: 0,
    pendingCount: 1,
  });
  assert.equal(summary.pose.poseStatus, "ready");
  assert.equal(summary.pose.timingGood, 1);
  assert.equal(summary.pose.timingNeedsAdjustment, 1);
  assert.equal(summary.pose.timingReadyForIngest, false);
  assert.equal(summary.pose.timingBlockerCount, 1);
  assert.equal(summary.pose.expectedSegments, 2);
  assert.equal(summary.pose.candidateCycles, 3);
  assert.equal(summary.pose.assignedCycles, 2);
  assert.equal(summary.pose.cycleCountQaStatus, "needs_review");
  assert.equal(
    summary.pose.cycleCountQaIssues[0].code,
    "extra_candidate_cycles",
  );
  assert.equal(summary.recordsWithPoseTiming, 1);
  assert.equal(summary.recordsWithPoseFeatures, 1);
  assert.equal(summary.recordsWithPoseSuggestion, 1);
  assert.equal(summary.timingCorrections.adjustedCount, 1);
  assert.equal(summary.timingCorrections.avgBoundaryShiftSecond, 0.2);
  assert.equal(summary.timingCorrections.maxBoundaryShiftSecond, 0.4);
  assert.equal(summary.poseEvidenceAttached, true);
});

test("summarizeTimingReadiness blocks ingest when timing needs adjustment", () => {
  const summary = summarizeTimingReadiness({
    summary: {
      segmentsTotal: 2,
      goodCount: 1,
      needsAdjustmentCount: 1,
    },
    items: [
      {
        segmentId: "seg_1",
        status: "good",
        issues: [],
      },
      {
        segmentId: "seg_2",
        status: "needs_adjustment",
        issues: [
          {
            code: "no_unique_cycle_assignment",
            severity: "error",
          },
        ],
      },
    ],
  });

  assert.equal(summary.available, true);
  assert.equal(summary.readyForIngest, false);
  assert.equal(summary.blockerCount, 1);
  assert.equal(summary.issueCounts.no_unique_cycle_assignment, 1);
});

test("summarizeTimingReadiness includes batch-level cycle count blockers", () => {
  const summary = summarizeTimingReadiness({
    summary: {
      segmentsTotal: 3,
      goodCount: 2,
      needsAdjustmentCount: 0,
      cycleCountQa: {
        status: "blocked",
        issues: [
          {
            code: "detected_cycle_shortfall",
            severity: "error",
          },
        ],
      },
    },
    items: [
      {
        segmentId: "seg_1",
        status: "good",
        issues: [],
      },
    ],
  });

  assert.equal(summary.readyForIngest, false);
  assert.equal(summary.blockerCount, 1);
  assert.equal(summary.issueCounts.detected_cycle_shortfall, 1);
});

test("summarizeTimingReadiness does not block annotation-only exports", () => {
  const summary = summarizeTimingReadiness(null);

  assert.equal(summary.available, false);
  assert.equal(summary.readyForIngest, true);
  assert.equal(summary.blockerCount, 0);
});

test("summarizeExportQuality reports missing pose for annotation-only state", () => {
  const summary = summarizeExportQuality();

  assert.equal(summary.recordsTotal, 0);
  assert.equal(summary.jsonExportReady, false);
  assert.equal(summary.csvExportReady, false);
  assert.equal(summary.poseEvidenceAttached, false);
  assert.equal(summary.pose.poseStatus, "missing");
  assert.equal(summary.timingCorrections.adjustedCount, 0);
});

test("summarizeSegmentTimingCorrections measures manual timing changes", () => {
  const summary = summarizeSegmentTimingCorrections([
    {
      startSecond: 1.5,
      endSecond: 4.5,
      originalStartSecond: 1,
      originalEndSecond: 4,
      segmentSource: "manual_adjusted",
    },
    {
      startSecond: 5,
      endSecond: 8.2,
      originalStartSecond: 5,
      originalEndSecond: 8,
      segmentSource: "suggested",
    },
  ]);

  assert.equal(summary.segmentsTotal, 2);
  assert.equal(summary.adjustedCount, 2);
  assert.equal(summary.unadjustedCount, 0);
  assert.equal(summary.avgStartShiftSecond, 0.25);
  assert.equal(summary.avgEndShiftSecond, 0.35);
  assert.equal(summary.avgBoundaryShiftSecond, 0.35);
  assert.equal(summary.maxBoundaryShiftSecond, 0.5);
});
