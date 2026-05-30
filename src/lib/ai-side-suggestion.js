import { getActionRepPolicy } from "../constants/scoring.js";

function pruneEmpty(value) {
  if (Array.isArray(value)) {
    return value.map(pruneEmpty).filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, pruneEmpty(item)])
      .filter(([, item]) => item !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  return value === null || value === undefined ? undefined : value;
}

function clampConfidence(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function confidenceFromRating(status, visibility) {
  const baseByStatus = {
    good: 0.9,
    watch: 0.65,
    limited: 0.45,
    missing: 0.2,
    not_applicable: null,
  };
  const base = baseByStatus[status] ?? null;

  if (base === null && Number.isFinite(visibility)) {
    return clampConfidence(visibility);
  }

  if (base === null) {
    return null;
  }

  if (!Number.isFinite(visibility)) {
    return clampConfidence(base);
  }

  return clampConfidence(base * 0.7 + visibility * 0.3);
}

function normalizeSide(side, policy) {
  if (typeof side !== "string") {
    return null;
  }

  const normalized = side.toLowerCase();
  return policy.expectedSideValues.includes(normalized) ? normalized : null;
}

function getDetectedSide(featureItem, policy) {
  const metrics = featureItem?.metrics ?? {};
  const candidate =
    metrics.side ??
    metrics.frontSide ??
    metrics.detectedSide ??
    metrics.sideContext ??
    null;

  return normalizeSide(candidate, policy);
}

function getSideEvidence(featureItem, policy) {
  const metrics = featureItem?.metrics ?? {};
  const rating =
    featureItem?.ratings?.sideConfidence ??
    featureItem?.ratings?.sideContext ??
    null;
  const sideVisibility =
    metrics.sideVisibility ??
    metrics.handVisibility ??
    metrics.timingVisibility;

  return pruneEmpty({
    sidePolicy: policy.sidePolicy,
    aiSideInference: policy.aiSideInference,
    metricSide: metrics.side,
    frontSide: metrics.frontSide,
    rearSide: metrics.rearSide,
    stanceSide: metrics.stanceSide,
    stationarySide: metrics.stationarySide,
    sideVisibility,
    rearSideVisibility: metrics.rearSideVisibility,
    ratingStatus: rating?.status,
    ratingLabel: rating?.label,
  });
}

function compareReviewerSide(reviewerSide, suggestedSide) {
  if (!["left", "right"].includes(reviewerSide) || !suggestedSide) {
    return null;
  }

  return reviewerSide === suggestedSide;
}

export function buildAiSideSuggestion({
  actionType,
  segment = null,
  featureItem = null,
} = {}) {
  const policy = getActionRepPolicy(actionType ?? segment?.actionType);
  const reviewerSide = segment?.side ?? policy.defaultSide;

  if (policy.sidePolicy !== "left_right") {
    return {
      status: "not_applicable",
      source: "rep_policy",
      side: policy.defaultSide,
      confidence: null,
      confidenceStatus: "not_applicable",
      reviewerSide,
      matchesReviewerSide: null,
      sourceSecond: null,
      reasonCode: "not_lateralized",
      evidence: {
        sidePolicy: policy.sidePolicy,
        aiSideInference: policy.aiSideInference,
      },
    };
  }

  const evidence = getSideEvidence(featureItem, policy);

  if (!featureItem) {
    return {
      status: "unavailable",
      source: "pose_features",
      side: policy.defaultSide,
      confidence: null,
      confidenceStatus: "missing",
      reviewerSide,
      matchesReviewerSide: null,
      sourceSecond: null,
      reasonCode: "missing_pose_features",
      evidence,
    };
  }

  const side = getDetectedSide(featureItem, policy);
  const rating =
    featureItem.ratings?.sideConfidence ?? featureItem.ratings?.sideContext;
  const visibility =
    featureItem.metrics?.sideVisibility ??
    featureItem.metrics?.handVisibility ??
    featureItem.metrics?.timingVisibility;

  if (!side) {
    return {
      status: "unknown",
      source: "pose_features",
      side: policy.defaultSide,
      confidence: confidenceFromRating(rating?.status, visibility),
      confidenceStatus: rating?.status ?? "missing",
      label: rating?.label ?? null,
      reviewerSide,
      matchesReviewerSide: null,
      sourceSecond: featureItem.sourceSecond ?? null,
      reasonCode: "side_not_detected",
      evidence,
    };
  }

  return {
    status: "suggested",
    source: "pose_features",
    side,
    confidence: confidenceFromRating(rating?.status, visibility),
    confidenceStatus: rating?.status ?? null,
    label: rating?.label ?? null,
    reviewerSide,
    matchesReviewerSide: compareReviewerSide(reviewerSide, side),
    sourceSecond: featureItem.sourceSecond ?? null,
    reasonCode: "pose_side_detected",
    evidence,
  };
}
