import assert from "node:assert/strict";
import test from "node:test";
import { adjudicateScores, summarizeIngest } from "../src/lib/adjudication.js";

function makeScore(totalScore, depth, kneeAlignment, torsoControl) {
  return {
    totalScore,
    subscores: { depth, kneeAlignment, torsoControl },
  };
}

test("adjudication uses human consensus when both reviewers match", () => {
  const ai = makeScore(1, 1, 1, 2);
  const reviewerA = makeScore(2, 2, 2, 2);
  const reviewerB = makeScore(2, 2, 2, 2);

  const result = adjudicateScores(ai, reviewerA, reviewerB);

  assert.equal(result.labelStatus, "valid");
  assert.equal(result.labelSource, "human_consensus");
  assert.equal(result.finalScore.totalScore, 2);
});

test("adjudication uses ai-human match when AI matches one reviewer", () => {
  const ai = makeScore(2, 2, 2, 2);
  const reviewerA = makeScore(2, 2, 2, 2);
  const reviewerB = makeScore(1, 1, 1, 2);

  const result = adjudicateScores(ai, reviewerA, reviewerB);

  assert.equal(result.labelStatus, "valid");
  assert.equal(result.labelSource, "ai_human_match");
  assert.equal(result.finalScore.totalScore, 2);
});

test("adjudication marks invalid when three-way mismatch", () => {
  const ai = makeScore(3, 3, 3, 3);
  const reviewerA = makeScore(2, 2, 2, 2);
  const reviewerB = makeScore(1, 1, 1, 1);

  const result = adjudicateScores(ai, reviewerA, reviewerB);

  assert.equal(result.labelStatus, "invalid");
  assert.equal(result.labelSource, "none");
  assert.equal(result.finalScore, null);
});

test("adjudication treats zero as a valid FMS pain score", () => {
  const ai = makeScore(0, 0, 0, 0);
  const reviewerA = makeScore(0, 0, 0, 0);
  const reviewerB = makeScore(1, 1, 1, 1);

  const result = adjudicateScores(ai, reviewerA, reviewerB);

  assert.equal(result.labelStatus, "valid");
  assert.equal(result.labelSource, "ai_human_match");
  assert.equal(result.finalScore.totalScore, 0);
});

test("summarizeIngest reports valid and invalid counts", () => {
  const segments = [
    {
      aiScore: makeScore(2, 2, 2, 2),
      reviewerScores: {
        reviewer_a: makeScore(2, 2, 2, 2),
        reviewer_b: makeScore(2, 2, 2, 2),
      },
    },
    {
      aiScore: makeScore(3, 3, 3, 3),
      reviewerScores: {
        reviewer_a: makeScore(2, 2, 2, 2),
        reviewer_b: makeScore(1, 1, 1, 1),
      },
    },
  ];

  const summary = summarizeIngest(segments);

  assert.equal(summary.segmentsTotal, 2);
  assert.equal(summary.segmentsValid, 1);
  assert.equal(summary.segmentsInvalid, 1);
});
