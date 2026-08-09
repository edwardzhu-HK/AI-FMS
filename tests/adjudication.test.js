import assert from "node:assert/strict";
import test from "node:test";
import {
  adjudicateScores,
  getSegmentReviewStatus,
  summarizeIngest,
  summarizeReviewerReadiness,
} from "../src/lib/adjudication.js";

function makeScore(totalScore, depth, kneeAlignment, torsoControl) {
  return {
    totalScore,
    subscores: { depth, kneeAlignment, torsoControl },
  };
}

test("adjudication uses human consensus when both reviewers match", () => {
  const ai = makeScore(1, 1, 1, 2);
  const reviewerA = {
    ...makeScore(2, 2, 2, 2),
    scoreScope: "rep_raw_score",
    scoreBasis: "scoresheet_like_raw_score",
    usesCriteriaScores: false,
  };
  const reviewerB = {
    ...makeScore(2, 2, 2, 2),
    scoreScope: "rep_raw_score",
    scoreBasis: "scoresheet_like_raw_score",
    usesCriteriaScores: false,
  };

  const result = adjudicateScores(ai, reviewerA, reviewerB);

  assert.equal(result.labelStatus, "valid");
  assert.equal(result.labelSource, "human_consensus");
  assert.equal(result.finalScore.totalScore, 2);
  assert.equal(result.finalScore.scoreBasis, "scoresheet_like_raw_score");
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

test("adjudication keeps temporarily unscored reviews pending", () => {
  const ai = makeScore(2, 2, 2, 2);
  const notScored = {
    totalScore: null,
    subscores: {
      depth: null,
      kneeAlignment: null,
      torsoControl: null,
    },
    scoringStatus: "not_scored",
  };
  const reviewerB = makeScore(2, 2, 2, 2);

  const result = adjudicateScores(ai, notScored, reviewerB);

  assert.equal(result.labelStatus, "pending");
  assert.equal(result.finalScore, null);
  assert.equal(
    getSegmentReviewStatus({
      reviewerScores: {
        reviewer_a: notScored,
        reviewer_b: reviewerB,
      },
    }),
    "partial",
  );
});

test("deep squat floor attempts can be retained as protocol evidence", () => {
  const notScored = {
    totalScore: null,
    scoringStatus: "not_scored",
  };
  const segment = {
    actionType: "deep_squat",
    attemptCondition: "floor",
    reviewerScores: {
      reviewer_a: notScored,
      reviewer_b: notScored,
    },
  };

  assert.equal(getSegmentReviewStatus(segment), "protocol_evidence");

  const summary = summarizeIngest([segment]);
  assert.equal(summary.segmentsValid, 0);
  assert.equal(summary.segmentsInvalid, 0);
  assert.equal(summary.segmentsProtocolEvidence, 1);
});

test("reviewer readiness allows protocol evidence when scoreable labels exist", () => {
  const notScored = {
    totalScore: null,
    scoringStatus: "not_scored",
  };
  const completedScore = makeScore(2, 2, 2, 2);
  const segments = [
    {
      actionType: "deep_squat",
      attemptCondition: "floor",
      reviewerScores: {
        reviewer_a: notScored,
        reviewer_b: notScored,
      },
    },
    {
      actionType: "deep_squat",
      attemptCondition: "heels_elevated_board",
      reviewerScores: {
        reviewer_a: completedScore,
        reviewer_b: completedScore,
      },
    },
  ];

  const readiness = summarizeReviewerReadiness(segments);

  assert.equal(readiness.completedSegmentsCount, 2);
  assert.equal(readiness.scoreableCompletedSegmentsCount, 1);
  assert.equal(readiness.protocolEvidenceSegmentsCount, 1);
  assert.equal(readiness.readyForIngest, true);
});

test("reviewer readiness allows protocol-evidence-only ingest", () => {
  const notScored = {
    totalScore: null,
    scoringStatus: "not_scored",
  };
  const segments = [
    {
      actionType: "deep_squat",
      attemptCondition: "floor",
      reviewerScores: {
        reviewer_a: notScored,
        reviewer_b: notScored,
      },
    },
    {
      actionType: "deep_squat",
      attemptCondition: "floor",
      reviewerScores: {
        reviewer_a: notScored,
        reviewer_b: notScored,
      },
    },
  ];

  const readiness = summarizeReviewerReadiness(segments);

  assert.equal(readiness.completedSegmentsCount, 2);
  assert.equal(readiness.scoreableCompletedSegmentsCount, 0);
  assert.equal(readiness.protocolEvidenceSegmentsCount, 2);
  assert.equal(readiness.readyForIngest, true);
  assert.deepEqual(readiness.blockingReasons, []);
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
