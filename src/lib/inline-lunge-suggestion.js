import { deriveTotalScore } from "../constants/scoring.js";

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

function findTimingItem(timingReport, featureItem) {
  return timingReport?.items?.find(
    (item) => item.segmentId === featureItem.segmentId,
  );
}

function buildSubscores(featureItem) {
  const lungeDepthScore = ratingToScore(featureItem.ratings.lungeDepth?.status);
  const trunkStabilityScore = ratingToScore(
    featureItem.ratings.trunkAlignment?.status,
  );
  const kneeFootScore = Math.min(
    ratingToScore(featureItem.ratings.kneeFootAlignment?.status),
    ratingToScore(featureItem.ratings.sideConfidence?.status),
  );

  return {
    depth: lungeDepthScore,
    kneeAlignment: trunkStabilityScore,
    torsoControl: kneeFootScore,
  };
}

function buildConfidence(featureItem, timingItem) {
  const evidenceWeights = [
    featureItem.ratings.lungeDepth?.status,
    featureItem.ratings.trunkAlignment?.status,
    featureItem.ratings.kneeFootAlignment?.status,
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
      confidence: 0,
      confidenceLabel: "low",
      reasons: [
        "In-Line Lunge feature evidence is not available for this repetition.",
      ],
    };
  }

  const subscores = buildSubscores(featureItem);
  const totalScore = deriveTotalScore(subscores);
  const confidence = buildConfidence(featureItem, timingItem);
  const reasons = [
    buildReason("Lunge depth", featureItem.ratings.lungeDepth, subscores.depth),
    buildReason(
      "Trunk alignment",
      featureItem.ratings.trunkAlignment,
      subscores.kneeAlignment,
    ),
    buildReason(
      "Knee-foot alignment",
      featureItem.ratings.kneeFootAlignment,
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
    totalScore,
    subscores,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    reasons,
    modelVersion: "pose-features-v0.1-inline-lunge",
  };
}

export function buildInlineLungeExplainableSuggestion({
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
    modelVersion: "pose-features-v0.1-inline-lunge",
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
