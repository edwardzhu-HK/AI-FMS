import { createScoreFromSubscores } from "../constants/scoring.js";

const FEATURE_TO_SUBSCORE = {
  hipFlexion: "depth",
  pelvicStability: "kneeAlignment",
  legLine: "torsoControl",
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

function buildSubscores(featureItem) {
  const hipFlexionScore = ratingToScore(featureItem.ratings.hipFlexion?.status);
  const pelvicStabilityScore = ratingToScore(
    featureItem.ratings.pelvicStability?.status,
  );
  const legLineScore = Math.min(
    ratingToScore(featureItem.ratings.kneeExtension?.status),
    ratingToScore(featureItem.ratings.sideConfidence?.status),
  );

  return {
    [FEATURE_TO_SUBSCORE.hipFlexion]: hipFlexionScore,
    [FEATURE_TO_SUBSCORE.pelvicStability]: pelvicStabilityScore,
    [FEATURE_TO_SUBSCORE.legLine]: legLineScore,
  };
}

function buildConfidence(featureItem, timingItem) {
  const evidenceWeights = [
    featureItem.ratings.hipFlexion?.status,
    featureItem.ratings.kneeExtension?.status,
    featureItem.ratings.pelvicStability?.status,
    featureItem.ratings.sideConfidence?.status,
  ].map(ratingToEvidenceWeight);
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

function buildReason(label, rating, score) {
  if (!rating) {
    return `${label} evidence is missing.`;
  }

  if (rating.status === "not_applicable") {
    return `${label} was not scored: ${rating.label}.`;
  }

  return `${label} suggested ${score}: ${rating.label}.`;
}

function buildSuggestionItem(featureItem, timingReport) {
  const timingItem = findTimingItem(timingReport, featureItem);

  if (featureItem.status !== "ok") {
    return {
      segmentId: featureItem.segmentId,
      repetitionIndex: featureItem.repetitionIndex,
      status: "insufficient_evidence",
      totalScore: null,
      subscores: null,
      criteriaScores: [],
      confidence: 0,
      confidenceLabel: "low",
      reasons: ["ASLR feature evidence is not available for this repetition."],
    };
  }

  const subscores = buildSubscores(featureItem);
  const score = createScoreFromSubscores(
    "active_straight_leg_raise",
    subscores,
  );
  const confidence = buildConfidence(featureItem, timingItem);
  const reasons = [
    buildReason("Hip flexion", featureItem.ratings.hipFlexion, subscores.depth),
    buildReason(
      "Pelvic stability",
      featureItem.ratings.pelvicStability,
      subscores.kneeAlignment,
    ),
    buildReason(
      "Leg line",
      featureItem.ratings.kneeExtension,
      subscores.torsoControl,
    ),
    buildReason(
      "Side confidence",
      featureItem.ratings.sideConfidence,
      subscores.torsoControl,
    ),
  ];

  if (timingItem?.status === "needs_adjustment") {
    reasons.push(
      "Timing QA indicates this segment may need adjustment before final scoring.",
    );
  }

  return {
    segmentId: featureItem.segmentId,
    repetitionIndex: featureItem.repetitionIndex,
    status: "suggested",
    totalScore: score.totalScore,
    subscores: score.subscores,
    criteriaScores: score.criteriaScores,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    reasons,
    modelVersion: "pose-features-v0.2-aslr",
  };
}

export function buildAslrExplainableSuggestion({
  featureReport,
  timingReport,
} = {}) {
  if (!featureReport?.items?.length) {
    return null;
  }

  const items = featureReport.items.map((featureItem) =>
    buildSuggestionItem(featureItem, timingReport),
  );
  const scoredItems = items.filter((item) => item.totalScore !== null);

  return {
    status: "ok",
    modelVersion: "pose-features-v0.2-aslr",
    items,
    summary: {
      segmentsTotal: items.length,
      scoredSegments: scoredItems.length,
      lowConfidenceCount: items.filter((item) => item.confidenceLabel === "low")
        .length,
      minSuggestedScore:
        scoredItems.length > 0
          ? Math.min(...scoredItems.map((item) => item.totalScore))
          : null,
    },
  };
}
