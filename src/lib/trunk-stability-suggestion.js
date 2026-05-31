import { createScoreFromSubscores } from "../constants/scoring.js";

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
  const coreStabilityScore = Math.min(
    ratingToScore(featureItem.ratings.coreStability?.status),
    ratingToScore(featureItem.ratings.trunkVisibility?.status),
  );
  const pushUpPatternScore = Math.min(
    ratingToScore(featureItem.ratings.pushUpPattern?.status),
    ratingToScore(featureItem.ratings.armExtension?.status),
  );
  const compensationScore = ratingToScore(
    featureItem.ratings.compensation?.status,
  );

  return {
    depth: coreStabilityScore,
    kneeAlignment: pushUpPatternScore,
    torsoControl: compensationScore,
  };
}

function buildConfidence(featureItem, timingItem) {
  const evidenceWeights = [
    featureItem.ratings.pushUpPattern?.status,
    featureItem.ratings.coreStability?.status,
    featureItem.ratings.armExtension?.status,
    featureItem.ratings.compensation?.status,
    featureItem.ratings.trunkVisibility?.status,
  ].map(ratingToEvidenceWeight);
  const evidenceCoverage =
    evidenceWeights.reduce((sum, value) => sum + value, 0) /
    Math.max(1, evidenceWeights.length);
  const visibility = featureItem.metrics.avgVisibility ?? 0;
  const timingCoverage = timingItem?.coverageRatio ?? 0;
  const confidence =
    evidenceCoverage * 0.45 + visibility * 0.35 + timingCoverage * 0.2;

  return Number(Math.max(0, Math.min(1, confidence)).toFixed(2));
}

function buildReason(label, rating, score, detail = null) {
  if (!rating) {
    return `${label} evidence is missing.`;
  }

  if (rating.status === "not_applicable") {
    return `${label} was not scored: ${rating.label}.`;
  }

  const detailText = detail ? ` ${detail}` : "";
  return `${label} suggested ${score}: ${rating.label}.${detailText}`;
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
      reasons: [
        "Trunk Stability Push-Up feature evidence is not available for this repetition.",
      ],
    };
  }

  const subscores = buildSubscores(featureItem);
  const score = createScoreFromSubscores("trunk_stability_push_up", subscores);
  const confidence = buildConfidence(featureItem, timingItem);
  const reasons = [
    buildReason(
      "Core stability",
      featureItem.ratings.coreStability,
      subscores.depth,
      `hip-line offset ${featureItem.metrics.hipLineOffset ?? "N/A"}.`,
    ),
    buildReason(
      "Push-up pattern",
      featureItem.ratings.pushUpPattern,
      subscores.kneeAlignment,
      `shoulder-wrist lift ${featureItem.metrics.shoulderWristLift ?? "N/A"}.`,
    ),
    buildReason(
      "Arm extension",
      featureItem.ratings.armExtension,
      subscores.kneeAlignment,
      `elbow angle ${featureItem.metrics.avgElbowAngle ?? "N/A"}deg.`,
    ),
    buildReason(
      "Compensation",
      featureItem.ratings.compensation,
      subscores.torsoControl,
      `hip drift ${featureItem.metrics.hipLineOffsetRange ?? "N/A"}.`,
    ),
    buildReason(
      "Trunk visibility",
      featureItem.ratings.trunkVisibility,
      subscores.depth,
    ),
    "Extension clearing pain is not inferred from pose; reviewer should confirm clearing/pain separately.",
  ];

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
    modelVersion: "pose-features-v0.1-trunk-stability-push-up",
  };
}

export function buildTrunkStabilityExplainableSuggestion({
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
    modelVersion: "pose-features-v0.1-trunk-stability-push-up",
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
