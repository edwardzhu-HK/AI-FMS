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
    evidenceReview: null,
    blindReview: {
      reviewMode: "blind",
      currentPoseEvidenceShown: false,
      currentAiSuggestionShown: false,
      eligibleForBlindAnalysis: true,
    },
  };
}

function reviewExport(reviewerId, studyRound, scores) {
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

const finalPredictions = {
  packageVersion: "final-ai-v1.1-test",
  packageFingerprint: "final-v1.1-fingerprint",
  summary: { formalItems: 2 },
  rows: [
    {
      repetitionId: "rep-1",
      actionType: "hurdle_step",
      comparisonEligible: true,
      aiSuggestedScore: 3,
    },
    {
      repetitionId: "rep-2",
      actionType: "deep_squat",
      comparisonEligible: false,
      aiSuggestedScore: null,
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
      reviewExport("Ronnie", "round_b", [3, 2]),
      reviewExport("Other Reviewer", "round_b", [3, 2]),
    ],
    evidence,
    finalPredictions,
  });

  assert.equal(analysis.roundBAgreement.overall.rawScoreAgreementRate, 1);
  assert.equal(analysis.reviewerChanges[1].summary.scoreChangedCount, 1);
  assert.equal(analysis.reviewerChanges[1].summary.blindReviewCount, 2);
  assert.equal(analysis.aiComparison.roundBReviewersBlindedToAi, true);
  assert.equal(analysis.aiComparison.roundBAssistedByDisplayedEvidence, false);
  assert.equal(analysis.aiComparison.roundAConsensus.metrics.exactCount, 1);
  assert.equal(analysis.aiComparison.roundBConsensus.metrics.withinOneCount, 1);
  assert.equal(analysis.aiComparison.roundBConsensus.metrics.exactCount, 0);
  assert.equal(
    analysis.aiComparison.finalV11.roundBConsensus.metrics.exactCount,
    1,
  );
  assert.equal(
    analysis.aiComparison.finalV11.packageFingerprint,
    "final-v1.1-fingerprint",
  );
});

test("rejects review exports that expose AI or pose evidence", () => {
  const exposedRoundB = reviewExport("Ronnie", "round_b", [2, 2]);
  exposedRoundB.events[0].blindReview.currentAiSuggestionShown = true;

  assert.throws(
    () =>
      summarizeRoundBCloseout({
        roundAExports: [
          reviewExport("Ronnie", "round_a", [2, 2]),
          reviewExport("Other Reviewer", "round_a", [2, 2]),
        ],
        roundBExports: [
          exposedRoundB,
          reviewExport("Other Reviewer", "round_b", [2, 2]),
        ],
        evidence,
      }),
    /non-blind review event/,
  );
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
          reviewExport("Ronnie", "round_b", [2, 2]),
          reviewExport("Third Reviewer", "round_b", [2, 2]),
        ],
        evidence,
      }),
    /reviewer identities must match/,
  );
});
