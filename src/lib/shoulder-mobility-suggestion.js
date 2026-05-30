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
  const reachScore = ratingToScore(featureItem.ratings.reachDistance?.status);
  const shoulderReferenceScore = ratingToScore(
    featureItem.ratings.shoulderReference?.status,
  );
  const handVisibilityScore = ratingToScore(
    featureItem.ratings.handVisibility?.status,
  );
  const sideContextScore = ratingToScore(
    featureItem.ratings.sideContext?.status,
  );

  return {
    depth: reachScore,
    kneeAlignment: Math.min(reachScore, shoulderReferenceScore),
    torsoControl: Math.min(handVisibilityScore, sideContextScore),
  };
}

function buildConfidence(featureItem, timingItem) {
  const evidenceWeights = [
    featureItem.ratings.reachDistance?.status,
    featureItem.ratings.handVisibility?.status,
    featureItem.ratings.shoulderReference?.status,
    featureItem.ratings.sideContext?.status,
  ].map(ratingToEvidenceWeight);
  const evidenceCoverage =
    evidenceWeights.reduce((sum, value) => sum + value, 0) /
    Math.max(1, evidenceWeights.length);
  const visibility = Math.max(
    0,
    Math.min(
      1,
      (featureItem.metrics.handVisibility ??
        featureItem.metrics.timingVisibility ??
        0) *
        0.55 +
        (featureItem.metrics.timingVisibility ??
          featureItem.metrics.handVisibility ??
          0) *
          0.45,
    ),
  );
  const timingCoverage = timingItem?.metrics?.coverageRatio ?? 0;
  const confidence =
    evidenceCoverage * 0.45 + visibility * 0.35 + timingCoverage * 0.2;

  return Number(Math.max(0, Math.min(1, confidence)).toFixed(2));
}

function buildReason(label, rating, score, detail = "") {
  if (!rating) {
    return `${label} evidence is missing.`;
  }

  if (rating.status === "not_applicable") {
    return `${label} was not scored: ${rating.label}.`;
  }

  return `${label} suggested ${score}: ${rating.label}${detail}.`;
}

function formatWristDistanceDetail(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `; wrist distance ratio ${value}`
    : "";
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
        "Shoulder Mobility feature evidence is not available for this repetition.",
      ],
    };
  }

  const subscores = buildSubscores(featureItem);
  const score = createScoreFromSubscores("shoulder_mobility", subscores);
  const confidence = buildConfidence(featureItem, timingItem);
  const reasons = [
    buildReason(
      "Reach symmetry",
      featureItem.ratings.reachDistance,
      subscores.depth,
      formatWristDistanceDetail(featureItem.metrics.wristDistanceRatio),
    ),
    buildReason(
      "Thoracic mobility proxy",
      featureItem.ratings.shoulderReference,
      subscores.kneeAlignment,
    ),
    buildReason(
      "Hand visibility",
      featureItem.ratings.handVisibility,
      subscores.torsoControl,
    ),
    buildReason(
      "Side context",
      featureItem.ratings.sideContext,
      subscores.torsoControl,
    ),
    "Shoulder clearing pain is not inferred from pose; reviewer should confirm pain/clearing separately.",
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
    modelVersion: "pose-features-v0.1-shoulder",
  };
}

export function buildShoulderMobilityExplainableSuggestion({
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
    modelVersion: "pose-features-v0.1-shoulder",
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
