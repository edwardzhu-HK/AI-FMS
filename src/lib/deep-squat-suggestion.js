import { createScoreFromSubscores } from "../constants/scoring.js";

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
      reasons: ["Feature evidence is not available for this repetition."],
    };
  }

  const subscores = buildSubscores(featureItem);
  const score = createScoreFromSubscores("deep_squat", subscores);
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
    modelVersion: "pose-features-v0.1",
  };
}

export function buildDeepSquatExplainableSuggestion({
  featureReport,
  timingReport,
}) {
  if (!featureReport?.items?.length) {
    return null;
  }

  const items = featureReport.items.map((featureItem) =>
    buildSuggestionItem(featureItem, timingReport),
  );
  const scoredItems = items.filter((item) => item.totalScore !== null);

  return {
    status: "ok",
    modelVersion: "pose-features-v0.1",
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
