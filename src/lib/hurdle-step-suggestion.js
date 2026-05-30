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
  const clearanceScore = ratingToScore(
    (featureItem.ratings.hurdleClearance ?? featureItem.ratings.stepClearance)
      ?.status,
  );
  const balanceControlScore = Math.min(
    ratingToScore(
      (
        featureItem.ratings.stanceLegControl ??
        featureItem.ratings.stanceStability
      )?.status,
    ),
    ratingToScore(
      (
        featureItem.ratings.pelvisTrunkControl ??
        featureItem.ratings.trunkControl
      )?.status,
    ),
  );
  const kneeAnkleLineScore = Math.min(
    ratingToScore(
      (featureItem.ratings.stepLegAlignment ?? featureItem.ratings.trunkControl)
        ?.status,
    ),
    ratingToScore(featureItem.ratings.sideConfidence?.status),
  );

  return {
    depth: clearanceScore,
    kneeAlignment: balanceControlScore,
    torsoControl: kneeAnkleLineScore,
  };
}

function buildConfidence(featureItem, timingItem) {
  const evidenceWeights = [
    (featureItem.ratings.hurdleClearance ?? featureItem.ratings.stepClearance)
      ?.status,
    (
      featureItem.ratings.stanceLegControl ??
      featureItem.ratings.stanceStability
    )?.status,
    (featureItem.ratings.pelvisTrunkControl ?? featureItem.ratings.trunkControl)
      ?.status,
    (featureItem.ratings.stepLegAlignment ?? featureItem.ratings.trunkControl)
      ?.status,
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
      criteriaScores: [],
      confidence: 0,
      confidenceLabel: "low",
      reasons: [
        "Hurdle Step feature evidence is not available for this repetition.",
      ],
    };
  }

  const subscores = buildSubscores(featureItem);
  const score = createScoreFromSubscores("hurdle_step", subscores);
  const confidence = buildConfidence(featureItem, timingItem);
  const reasons = [
    buildReason(
      "Hurdle clearance",
      featureItem.ratings.hurdleClearance ?? featureItem.ratings.stepClearance,
      subscores.depth,
    ),
    buildReason(
      "Stance leg control",
      featureItem.ratings.stanceLegControl ??
        featureItem.ratings.stanceStability,
      subscores.kneeAlignment,
    ),
    buildReason(
      "Pelvis trunk control",
      featureItem.ratings.pelvisTrunkControl ??
        featureItem.ratings.trunkControl,
      subscores.kneeAlignment,
    ),
    buildReason(
      "Step leg alignment",
      featureItem.ratings.stepLegAlignment ?? featureItem.ratings.trunkControl,
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
    modelVersion: "pose-features-v0.2-hurdle",
  };
}

export function buildHurdleStepExplainableSuggestion({
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
    modelVersion: "pose-features-v0.2-hurdle",
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
