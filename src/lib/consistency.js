import { adjudicateScores } from "./adjudication.js";

export function scoreEquals(left, right) {
  if (!left || !right) {
    return false;
  }

  return left.totalScore === right.totalScore;
}

function toRate(numerator, denominator) {
  if (denominator === 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(4));
}

function createMovementSummary() {
  return {
    segmentsTotal: 0,
    validCount: 0,
    invalidCount: 0,
    pendingCount: 0,
  };
}

export function summarizeConsistency(segments) {
  const metrics = {
    segmentsTotal: segments.length,
    validCount: 0,
    invalidCount: 0,
    pendingCount: 0,
    aiMatchesFinalCount: 0,
    aiDiffersFromFinalCount: 0,
    reviewerConsensusCount: 0,
    reviewerDisagreementCount: 0,
    reviewerPairCount: 0,
    reviewerAgreementRate: null,
    aiMatchesFinalRate: null,
    movementBreakdown: {},
  };

  for (const segment of segments) {
    const actionType = segment.actionType ?? "unknown";
    const movementSummary =
      metrics.movementBreakdown[actionType] ?? createMovementSummary();
    metrics.movementBreakdown[actionType] = movementSummary;
    movementSummary.segmentsTotal += 1;

    const reviewerA = segment.reviewerScores.reviewer_a;
    const reviewerB = segment.reviewerScores.reviewer_b;

    if (reviewerA && reviewerB) {
      metrics.reviewerPairCount += 1;

      if (scoreEquals(reviewerA, reviewerB)) {
        metrics.reviewerConsensusCount += 1;
      } else {
        metrics.reviewerDisagreementCount += 1;
      }
    }

    const adjudication = adjudicateScores(
      segment.aiScore,
      reviewerA,
      reviewerB,
    );

    if (adjudication.labelStatus === "pending") {
      metrics.pendingCount += 1;
      movementSummary.pendingCount += 1;
      continue;
    }

    if (adjudication.labelStatus === "invalid") {
      metrics.invalidCount += 1;
      movementSummary.invalidCount += 1;
      continue;
    }

    metrics.validCount += 1;
    movementSummary.validCount += 1;

    if (scoreEquals(segment.aiScore, adjudication.finalScore)) {
      metrics.aiMatchesFinalCount += 1;
    } else {
      metrics.aiDiffersFromFinalCount += 1;
    }
  }

  metrics.aiMatchesFinalRate = toRate(
    metrics.aiMatchesFinalCount,
    metrics.validCount,
  );
  metrics.reviewerAgreementRate = toRate(
    metrics.reviewerConsensusCount,
    metrics.reviewerPairCount,
  );

  return metrics;
}
