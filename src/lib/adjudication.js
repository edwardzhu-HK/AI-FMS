import {
  DEEP_SQUAT_ATTEMPT_FLOOR,
  normalizeDeepSquatAttemptCondition,
} from "./deep-squat-attempt-condition.js";

const DEEP_SQUAT_ACTION = "deep_squat";
export const SEGMENT_REVIEW_STATUS_COMPLETED = "completed";
export const SEGMENT_REVIEW_STATUS_PARTIAL = "partial";
export const SEGMENT_REVIEW_STATUS_PENDING = "pending";
export const SEGMENT_REVIEW_STATUS_PROTOCOL_EVIDENCE = "protocol_evidence";

function normalizeScore(score) {
  if (!score) {
    return null;
  }

  return {
    totalScore: score.totalScore,
    subscores: score.subscores ?? null,
    criteriaScores: score.criteriaScores ?? [],
    scoreScope: score.scoreScope,
    scoreBasis: score.scoreBasis,
    usesCriteriaScores: score.usesCriteriaScores,
    scoringStatus: score.scoringStatus,
  };
}

function isNotScored(score) {
  return (
    Boolean(score) &&
    (score.scoringStatus === "not_scored" ||
      score.totalScore === null ||
      score.totalScore === undefined)
  );
}

export function isSegmentProtocolEvidence(segment) {
  if (segment?.actionType !== DEEP_SQUAT_ACTION) {
    return false;
  }

  if (
    normalizeDeepSquatAttemptCondition(segment.attemptCondition) !==
    DEEP_SQUAT_ATTEMPT_FLOOR
  ) {
    return false;
  }

  const reviewerA = segment.reviewerScores?.reviewer_a;
  const reviewerB = segment.reviewerScores?.reviewer_b;

  return isNotScored(reviewerA) && isNotScored(reviewerB);
}

function scoreEqualsByTotal(left, right) {
  const a = normalizeScore(left);
  const b = normalizeScore(right);

  if (!a || !b) {
    return false;
  }

  return a.totalScore === b.totalScore;
}

export function adjudicateScores(aiScore, reviewerAScore, reviewerBScore) {
  const missingReviews = !reviewerAScore || !reviewerBScore;

  if (
    missingReviews ||
    isNotScored(reviewerAScore) ||
    isNotScored(reviewerBScore)
  ) {
    return {
      labelStatus: "pending",
      labelSource: "none",
      finalScore: null,
    };
  }

  if (scoreEqualsByTotal(reviewerAScore, reviewerBScore)) {
    return {
      labelStatus: "valid",
      labelSource: "human_consensus",
      finalScore: normalizeScore(reviewerAScore),
    };
  }

  if (scoreEqualsByTotal(aiScore, reviewerAScore)) {
    return {
      labelStatus: "valid",
      labelSource: "ai_human_match",
      finalScore: normalizeScore(reviewerAScore),
    };
  }

  if (scoreEqualsByTotal(aiScore, reviewerBScore)) {
    return {
      labelStatus: "valid",
      labelSource: "ai_human_match",
      finalScore: normalizeScore(reviewerBScore),
    };
  }

  return {
    labelStatus: "invalid",
    labelSource: "none",
    finalScore: null,
  };
}

export function getSegmentReviewStatus(segment) {
  if (isSegmentProtocolEvidence(segment)) {
    return SEGMENT_REVIEW_STATUS_PROTOCOL_EVIDENCE;
  }

  const hasA = Boolean(segment.reviewerScores.reviewer_a);
  const hasB = Boolean(segment.reviewerScores.reviewer_b);
  const hasScoredA = hasA && !isNotScored(segment.reviewerScores.reviewer_a);
  const hasScoredB = hasB && !isNotScored(segment.reviewerScores.reviewer_b);

  if (hasScoredA && hasScoredB) {
    return SEGMENT_REVIEW_STATUS_COMPLETED;
  }

  if (hasA || hasB) {
    return SEGMENT_REVIEW_STATUS_PARTIAL;
  }

  return SEGMENT_REVIEW_STATUS_PENDING;
}

export function summarizeReviewerReadiness(segments = []) {
  const summary = {
    allSegmentsCount: segments.length,
    completedSegmentsCount: 0,
    scoreableCompletedSegmentsCount: 0,
    protocolEvidenceSegmentsCount: 0,
    readyForIngest: false,
    blockingReasons: [],
  };

  for (const segment of segments) {
    const status = getSegmentReviewStatus(segment);

    if (status === SEGMENT_REVIEW_STATUS_COMPLETED) {
      summary.completedSegmentsCount += 1;
      summary.scoreableCompletedSegmentsCount += 1;
    }

    if (status === SEGMENT_REVIEW_STATUS_PROTOCOL_EVIDENCE) {
      summary.completedSegmentsCount += 1;
      summary.protocolEvidenceSegmentsCount += 1;
    }
  }

  const everySegmentHandled =
    summary.allSegmentsCount > 0 &&
    summary.completedSegmentsCount === summary.allSegmentsCount;
  const hasScoreableLabels = summary.scoreableCompletedSegmentsCount > 0;
  const hasProtocolEvidence = summary.protocolEvidenceSegmentsCount > 0;

  summary.readyForIngest =
    everySegmentHandled && (hasScoreableLabels || hasProtocolEvidence);

  if (!everySegmentHandled) {
    summary.blockingReasons.push(
      "some segments are still pending reviewer scores",
    );
  }

  return summary;
}

export function summarizeIngest(segments) {
  const summary = {
    segmentsTotal: segments.length,
    segmentsValid: 0,
    segmentsInvalid: 0,
    segmentsProtocolEvidence: 0,
  };

  for (const segment of segments) {
    if (isSegmentProtocolEvidence(segment)) {
      summary.segmentsProtocolEvidence += 1;
      continue;
    }

    const result = adjudicateScores(
      segment.aiScore,
      segment.reviewerScores.reviewer_a,
      segment.reviewerScores.reviewer_b,
    );

    if (result.labelStatus === "valid") {
      summary.segmentsValid += 1;
    }

    if (result.labelStatus === "invalid") {
      summary.segmentsInvalid += 1;
    }
  }

  return summary;
}
