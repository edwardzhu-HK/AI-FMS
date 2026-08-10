import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRoundBCloseout } from "../src/lib/round-b-closeout-analysis.js";

function event({
  eventId,
  reviewerId,
  studyRound,
  repetitionId,
  actionType,
  score,
  confidence,
  duration,
  usefulness = null,
}) {
  return {
    eventId,
    reviewerId,
    studyRound,
    repetitionId,
    ingestId: `ing-${repetitionId}`,
    actionType,
    status: "scored",
    score,
    confidence,
    reviewDurationMs: duration,
    createdAt: "2026-08-10T00:00:00.000Z",
    evidenceReview: usefulness
      ? {
          usefulness,
          evidenceStatus: "ai_score_available",
          aiSuggestionShown: true,
        }
      : null,
  };
}

function reviewExport(reviewerId, studyRound, scores, usefulness = null) {
  const repetitionIds = ["rep-1", "rep-2"];
  return {
    pilotId: "pilot-test",
    reviewerId,
    studyRound,
    expectedRepetitionIds: repetitionIds,
    events: repetitionIds.map((repetitionId, index) =>
      event({
        eventId: `${studyRound}-${reviewerId}-${repetitionId}`,
        reviewerId,
        studyRound,
        repetitionId,
        actionType: index === 0 ? "hurdle_step" : "deep_squat",
        score: scores[index],
        confidence: index === 0 ? "medium" : "high",
        duration: 1000 + index * 100,
        usefulness,
      }),
    ),
  };
}

const evidence = {
  freezeId: "freeze-v1",
  manifestFingerprint: "manifest-v1",
  modelFreeze: { ruleFingerprint: "rules-v1" },
  summary: { totalItems: 2 },
  items: [
    {
      repetitionId: "rep-1",
      actionType: "hurdle_step",
      aiSuggestion: { totalScore: 2 },
    },
    {
      repetitionId: "rep-2",
      actionType: "deep_squat",
      aiSuggestion: null,
    },
  ],
};

test("summarizes reviewer changes and frozen AI comparisons after Round B", () => {
  const analysis = summarizeRoundBCloseout({
    roundAExports: [
      reviewExport("Ronnie", "round_a", [2, 2]),
      reviewExport("Other Reviewer", "round_a", [2, 2]),
    ],
    roundBExports: [
      reviewExport("Ronnie", "round_b", [3, 2], "helpful"),
      reviewExport("Other Reviewer", "round_b", [3, 2], "no_change"),
    ],
    evidence,
  });

  assert.equal(analysis.roundBAgreement.overall.rawScoreAgreementRate, 1);
  assert.equal(analysis.reviewerChanges[1].summary.scoreChangedCount, 1);
  assert.equal(
    analysis.reviewerChanges[1].summary.evidenceUsefulness.helpful,
    2,
  );
  assert.equal(analysis.aiComparison.roundAConsensus.metrics.exactCount, 1);
  assert.equal(analysis.aiComparison.roundBConsensus.metrics.withinOneCount, 1);
  assert.equal(analysis.aiComparison.roundBConsensus.metrics.exactCount, 0);
});

test("requires the same two reviewer identities across rounds", () => {
  assert.throws(
    () =>
      summarizeRoundBCloseout({
        roundAExports: [
          reviewExport("Ronnie", "round_a", [2, 2]),
          reviewExport("Other Reviewer", "round_a", [2, 2]),
        ],
        roundBExports: [
          reviewExport("Ronnie", "round_b", [2, 2], "helpful"),
          reviewExport("Third Reviewer", "round_b", [2, 2], "helpful"),
        ],
        evidence,
      }),
    /reviewer identities must match/,
  );
});
