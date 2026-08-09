import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeStudyReviewAgreement,
  weightedCohenKappa,
} from "../src/lib/study-review-agreement.js";

function event({
  repetitionId,
  actionType = "deep_squat",
  reviewerId,
  status = "scored",
  score = 2,
  reason = null,
}) {
  return {
    eventId: `${reviewerId}_${repetitionId}`,
    repetitionId,
    ingestId: `ing_${repetitionId}`,
    actionType,
    reviewerId,
    status,
    score: status === "scored" ? score : null,
    confidence: "medium",
    unscorableReason: reason,
    comment: reason ?? "scored",
    createdAt: "2026-08-09T00:00:00.000Z",
  };
}

function reviewExport(reviewerId, events) {
  return {
    pilotId: "pilot",
    studyRound: "round_a",
    reviewerId,
    expectedRepetitionIds: ["rep_1", "rep_2", "rep_3"],
    events,
  };
}

test("weighted Cohen kappa distinguishes perfect, inverse, and degenerate pairs", () => {
  const perfect = [0, 1, 2, 3].map((score) => ({
    leftScore: score,
    rightScore: score,
  }));
  const inverse = [0, 0, 3, 3].map((score, index) => ({
    leftScore: score,
    rightScore: [3, 3, 0, 0][index],
  }));
  const degenerate = [1, 1].map((score) => ({
    leftScore: score,
    rightScore: score,
  }));

  assert.equal(weightedCohenKappa(perfect, "quadratic"), 1);
  assert.equal(weightedCohenKappa(inverse, "linear"), -1);
  assert.equal(weightedCohenKappa(inverse, "quadratic"), -1);
  assert.equal(weightedCohenKappa(degenerate, "quadratic"), null);
});

test("agreement summary separates scores, scoreability, and reason taxonomy", () => {
  const left = reviewExport("Ronnie", [
    event({ repetitionId: "rep_1", reviewerId: "Ronnie", score: 2 }),
    event({
      repetitionId: "rep_2",
      reviewerId: "Ronnie",
      status: "unscorable",
      reason: "missing_required_reference",
    }),
    event({ repetitionId: "rep_3", reviewerId: "Ronnie", score: 3 }),
  ]);
  const right = reviewExport("Other Reviewer", [
    event({ repetitionId: "rep_1", reviewerId: "Other Reviewer", score: 2 }),
    event({
      repetitionId: "rep_2",
      reviewerId: "Other Reviewer",
      status: "unscorable",
      reason: "movement_not_visible",
    }),
    event({
      repetitionId: "rep_3",
      reviewerId: "Other Reviewer",
      status: "unscorable",
      reason: "movement_not_visible",
    }),
  ]);

  const result = summarizeStudyReviewAgreement(left, right);

  assert.equal(result.overall.expectedCount, 3);
  assert.equal(result.overall.statusAgreementCount, 2);
  assert.equal(result.overall.bothScoredCount, 1);
  assert.equal(result.overall.exactScoreAgreementCount, 1);
  assert.equal(result.overall.rawScoreAgreementRate, 1);
  assert.equal(result.overall.bothUnscorableCount, 1);
  assert.equal(result.overall.unscorableReasonAgreementCount, 0);
  assert.deepEqual(
    result.disagreementQueue.map((row) => row.disagreementType),
    ["unscorable_reason_disagreement", "scoreability_mismatch"],
  );
});
