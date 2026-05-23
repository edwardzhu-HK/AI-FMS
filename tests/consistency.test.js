import assert from "node:assert/strict";
import test from "node:test";
import { summarizeConsistency } from "../src/lib/consistency.js";

function makeScore(totalScore, depth, kneeAlignment, torsoControl) {
  return {
    totalScore,
    subscores: {
      depth,
      kneeAlignment,
      torsoControl,
    },
  };
}

test("summarizeConsistency calculates pending and labeled metrics", () => {
  const segments = [
    {
      actionType: "deep_squat",
      aiScore: makeScore(2, 2, 2, 2),
      reviewerScores: {
        reviewer_a: makeScore(2, 2, 2, 2),
        reviewer_b: makeScore(2, 2, 2, 2),
      },
    },
    {
      actionType: "deep_squat",
      aiScore: makeScore(1, 1, 1, 1),
      reviewerScores: {
        reviewer_a: makeScore(2, 2, 2, 2),
        reviewer_b: makeScore(3, 3, 3, 3),
      },
    },
    {
      actionType: "hurdle_step",
      aiScore: makeScore(3, 3, 3, 3),
      reviewerScores: {
        reviewer_a: null,
        reviewer_b: null,
      },
    },
  ];

  const metrics = summarizeConsistency(segments);

  assert.equal(metrics.segmentsTotal, 3);
  assert.equal(metrics.validCount, 1);
  assert.equal(metrics.invalidCount, 1);
  assert.equal(metrics.pendingCount, 1);
  assert.equal(metrics.aiMatchesFinalCount, 1);
  assert.equal(metrics.aiDiffersFromFinalCount, 0);
  assert.equal(metrics.reviewerConsensusCount, 1);
  assert.equal(metrics.reviewerDisagreementCount, 1);
  assert.equal(metrics.reviewerPairCount, 2);
  assert.equal(metrics.reviewerAgreementRate, 0.5);
  assert.equal(metrics.aiMatchesFinalRate, 1);
  assert.deepEqual(metrics.movementBreakdown.deep_squat, {
    segmentsTotal: 2,
    validCount: 1,
    invalidCount: 1,
    pendingCount: 0,
  });
  assert.deepEqual(metrics.movementBreakdown.hurdle_step, {
    segmentsTotal: 1,
    validCount: 0,
    invalidCount: 0,
    pendingCount: 1,
  });
});

test("summarizeConsistency sets agreement rates null when no labels are ready", () => {
  const segments = [
    {
      aiScore: makeScore(2, 2, 2, 2),
      reviewerScores: {
        reviewer_a: null,
        reviewer_b: null,
      },
    },
  ];

  const metrics = summarizeConsistency(segments);
  assert.equal(metrics.aiMatchesFinalRate, null);
  assert.equal(metrics.reviewerAgreementRate, null);
});
