import { createScoreFromSubscores } from "../constants/scoring.js";
import {
  capDeepSquatAttemptScoreForCondition,
  DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED,
  inferDeepSquatAttemptCondition,
  inferDeepSquatScoreTwoBoardRepetitions,
  isHeelElevatedAttempt,
} from "./deep-squat-attempt-condition.js";
import {
  detectDeepSquatBoardUsage,
  isDeepSquatBoardDetected,
} from "./deep-squat-board-detector.js";

const FEATURE_TO_SUBSCORE = {
  depth: "depth",
  kneeAlignment: "kneeAlignment",
  torsoControl: "torsoControl",
};

function ratingToScore(status) {
  if (status === "limited") {
    return 1;
  }

  if (status === "watch") {
    return 2;
  }

  return 3;
}

function ratingToEvidenceWeight(status) {
  if (status === "good" || status === "watch" || status === "limited") {
    return 1;
  }

  return 0;
}

function confidenceLabel(confidence) {
  if (confidence >= 0.72) {
    return "high";
  }

  if (confidence >= 0.52) {
    return "medium";
  }

  return "low";
}

function buildReason(featureKey, rating, score) {
  const labels = {
    depth: "Depth",
    kneeAlignment: "Knee alignment",
    torsoControl: "Torso control",
  };

  if (!rating) {
    return `${labels[featureKey]} evidence is missing.`;
  }

  if (rating.status === "not_applicable") {
    return `${labels[featureKey]} was not scored from this camera view (${rating.label}).`;
  }

  return `${labels[featureKey]} suggested ${score}: ${rating.label}.`;
}

function buildSubscores(featureItem) {
  return Object.entries(FEATURE_TO_SUBSCORE).reduce(
    (subscores, [featureKey, subscoreKey]) => {
      const rating = featureItem.ratings[featureKey];
      subscores[subscoreKey] = ratingToScore(rating?.status);
      return subscores;
    },
    {},
  );
}

function buildConfidence(featureItem, timingItem) {
  const evidenceWeights = Object.keys(FEATURE_TO_SUBSCORE).map((featureKey) =>
    ratingToEvidenceWeight(featureItem.ratings[featureKey]?.status),
  );
  const evidenceCoverage =
    evidenceWeights.reduce((sum, value) => sum + value, 0) /
    Math.max(1, evidenceWeights.length);
  const visibility = featureItem.metrics.avgVisibility ?? 0;
  const timingCoverage = timingItem?.metrics?.coverageRatio ?? 0;
  const confidence =
    evidenceCoverage * 0.45 + visibility * 0.35 + timingCoverage * 0.2;

  return Number(Math.max(0, Math.min(1, confidence)).toFixed(2));
}

function findTimingItem(timingReport, featureItem) {
  return timingReport?.items?.find(
    (item) => item.segmentId === featureItem.segmentId,
  );
}

function buildSegmentMap(segments = []) {
  return new Map(
    segments
      .filter((segment) => segment?.segmentId)
      .map((segment) => [segment.segmentId, segment]),
  );
}

function buildStagedScoringReason(rawScore, attemptCondition) {
  if (isHeelElevatedAttempt(attemptCondition)) {
    if (rawScore > 2) {
      return "FMS staged scoring: heels-elevated / FMS board attempts are capped at score 2.";
    }

    return "FMS staged scoring: this is a heels-elevated / FMS board attempt, so it can support the score-2 path.";
  }

  return "FMS staged scoring: a floor attempt below score 3 must be followed by a heels-elevated / FMS board attempt before assigning the Deep Squat final score.";
}

function buildBoardScoreTwoReferenceReason() {
  return "FMS staged scoring: notes or curated sample metadata confirm this heels-elevated / FMS board attempt belongs to the score-2 path; raw pose evidence is retained for audit.";
}

function capSubscoresForAttempt(subscores, attemptCondition) {
  if (!isHeelElevatedAttempt(attemptCondition)) {
    return subscores;
  }

  return Object.fromEntries(
    Object.entries(subscores ?? {}).map(([key, value]) => [
      key,
      typeof value === "number" ? Math.min(value, 2) : value,
    ]),
  );
}

function capCriteriaScoresForAttempt(criteriaScores, attemptCondition) {
  if (!isHeelElevatedAttempt(attemptCondition)) {
    return criteriaScores;
  }

  return criteriaScores.map((criterion) => ({
    ...criterion,
    score:
      typeof criterion.score === "number"
        ? Math.min(criterion.score, 2)
        : criterion.score,
  }));
}

function buildSuggestionItem(featureItem, timingReport, context) {
  const timingItem = findTimingItem(timingReport, featureItem);
  const segment =
    context.segmentMap.get(featureItem.segmentId) ??
    context.segmentMap.get(String(featureItem.segmentId)) ??
    featureItem;
  const boardDetection = detectDeepSquatBoardUsage({
    segment,
    notes: context.notes,
    fileName: context.fileName,
    repetitionCount: context.repetitionCount,
  });
  const attemptCondition = isDeepSquatBoardDetected(boardDetection)
    ? DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED
    : inferDeepSquatAttemptCondition({
        segment,
        notes: context.notes,
        fileName: context.fileName,
        repetitionCount: context.repetitionCount,
      });
  const referenceBoardScore = inferDeepSquatScoreTwoBoardRepetitions({
    notes: context.notes,
    fileName: context.fileName,
    repetitionCount: context.repetitionCount,
  }).has(featureItem.repetitionIndex)
    ? 2
    : null;

  if (featureItem.status !== "ok") {
    return {
      segmentId: featureItem.segmentId,
      repetitionIndex: featureItem.repetitionIndex,
      attemptCondition,
      status: "insufficient_evidence",
      totalScore: null,
      subscores: null,
      criteriaScores: [],
      confidence: 0,
      confidenceLabel: "low",
      reasons: ["Feature evidence is not available for this repetition."],
      boardDetection,
    };
  }

  const subscores = buildSubscores(featureItem);
  const score = createScoreFromSubscores("deep_squat", subscores);
  const rawAttemptScore = score.totalScore;
  const cappedAttemptScore = capDeepSquatAttemptScoreForCondition(
    rawAttemptScore,
    attemptCondition,
  );
  const confidence = buildConfidence(featureItem, timingItem);
  const reasons = Object.entries(FEATURE_TO_SUBSCORE).map(
    ([featureKey, subscoreKey]) =>
      buildReason(
        featureKey,
        featureItem.ratings[featureKey],
        subscores[subscoreKey],
      ),
  );

  if (timingItem?.status === "needs_adjustment") {
    reasons.push(
      "Timing QA indicates this segment may need adjustment before final scoring.",
    );
  }

  if (isHeelElevatedAttempt(attemptCondition)) {
    reasons.unshift(
      buildStagedScoringReason(rawAttemptScore, attemptCondition),
    );
    const shouldUseReferenceBoardScore =
      typeof referenceBoardScore === "number" &&
      referenceBoardScore > cappedAttemptScore;

    if (shouldUseReferenceBoardScore) {
      reasons.unshift(buildBoardScoreTwoReferenceReason());
    }

    return {
      segmentId: featureItem.segmentId,
      repetitionIndex: featureItem.repetitionIndex,
      attemptCondition,
      status: "suggested",
      scoringStatus: "scored",
      scoreSource: shouldUseReferenceBoardScore
        ? "manual_or_sample_metadata"
        : "pose_features",
      totalScore: shouldUseReferenceBoardScore
        ? referenceBoardScore
        : cappedAttemptScore,
      rawAttemptScore,
      subscores: capSubscoresForAttempt(score.subscores, attemptCondition),
      criteriaScores: capCriteriaScoresForAttempt(
        score.criteriaScores,
        attemptCondition,
      ),
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      reasons,
      boardDetection,
      modelVersion: "pose-features-v0.2-fms-staged",
    };
  }

  if (rawAttemptScore < 3) {
    reasons.unshift(
      buildStagedScoringReason(rawAttemptScore, attemptCondition),
    );

    return {
      segmentId: featureItem.segmentId,
      repetitionIndex: featureItem.repetitionIndex,
      attemptCondition,
      status: "needs_heel_elevated_attempt",
      scoringStatus: "not_scored",
      totalScore: null,
      rawAttemptScore,
      subscores: score.subscores,
      criteriaScores: score.criteriaScores,
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      reasons,
      boardDetection,
      modelVersion: "pose-features-v0.2-fms-staged",
    };
  }

  return {
    segmentId: featureItem.segmentId,
    repetitionIndex: featureItem.repetitionIndex,
    attemptCondition,
    status: "suggested",
    scoringStatus: "scored",
    totalScore: score.totalScore,
    rawAttemptScore,
    subscores: score.subscores,
    criteriaScores: score.criteriaScores,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    reasons,
    boardDetection,
    modelVersion: "pose-features-v0.2-fms-staged",
  };
}

export function buildDeepSquatExplainableSuggestion({
  featureReport,
  timingReport,
  segments = [],
  notes = "",
  fileName = "",
}) {
  if (!featureReport?.items?.length) {
    return null;
  }

  const segmentMap = buildSegmentMap(segments);
  const repetitionCount = Math.max(segments.length, featureReport.items.length);
  const items = featureReport.items.map((featureItem) =>
    buildSuggestionItem(featureItem, timingReport, {
      segmentMap,
      notes,
      fileName,
      repetitionCount,
    }),
  );
  const scoredItems = items.filter((item) => item.totalScore !== null);

  return {
    status: "ok",
    modelVersion: "pose-features-v0.2-fms-staged",
    items,
    summary: {
      segmentsTotal: items.length,
      scoredSegments: scoredItems.length,
      stagedReviewCount: items.filter(
        (item) => item.status === "needs_heel_elevated_attempt",
      ).length,
      lowConfidenceCount: items.filter((item) => item.confidenceLabel === "low")
        .length,
      minSuggestedScore:
        scoredItems.length > 0
          ? Math.min(...scoredItems.map((item) => item.totalScore))
          : null,
    },
  };
}
