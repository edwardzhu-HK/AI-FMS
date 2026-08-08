import { createScoreFromTotal } from "../constants/scoring.js";

function confidenceLabel(confidence) {
  if (confidence >= 0.72) {
    return "high";
  }

  if (confidence >= 0.52) {
    return "medium";
  }

  return "low";
}

function buildConfidence(featureItem, timingItem) {
  const visibility =
    featureItem.metrics?.timingVisibility ??
    featureItem.metrics?.sideVisibility ??
    0;
  const timingCoverage = timingItem?.metrics?.coverageRatio ?? 0;
  const confidence = visibility * 0.55 + timingCoverage * 0.45;

  return Number(Math.max(0, Math.min(1, confidence)).toFixed(2));
}

function findTimingItem(timingReport, featureItem) {
  return timingReport?.items?.find(
    (item) => item.segmentId === featureItem.segmentId,
  );
}

function buildManualRuleReason(totalScore) {
  if (totalScore === 1) {
    return "FMS manual rule: Rotary Stability score 1 applies when there is loss of balance, the hand does not touch the lateral malleolus, the knee/elbow do not fully extend, or the subject cannot get into the set-up position.";
  }

  if (totalScore === 2) {
    return "FMS manual rule: Rotary Stability score 2 requires completing the diagonal pattern with control; this curated label must still be confirmed by a human reviewer.";
  }

  if (totalScore === 3) {
    return "FMS manual rule: score 3 is supported when the same-side Rotary Stability pattern is completed. Clearing negative is reviewer-supplied metadata for this sample, not inferred from a visible clearing test.";
  }

  return "FMS manual rule: score 0 is reserved for pain and requires reviewer confirmation.";
}

function buildSuggestionItem(featureItem, timingReport) {
  const timingItem = findTimingItem(timingReport, featureItem);

  if (
    !Number.isInteger(featureItem.manualScoreOverride) ||
    featureItem.manualScoreOverride < 0 ||
    featureItem.manualScoreOverride > 3 ||
    featureItem.manualScoreSource !== "curated_visual_fms_review"
  ) {
    return {
      segmentId: featureItem.segmentId,
      repetitionIndex: featureItem.repetitionIndex,
      status: "feature_only",
      totalScore: null,
      subscores: null,
      criteriaScores: [],
      confidence: 0,
      confidenceLabel: "low",
      scoreBasis: "pose_evidence_only_manual_fms_review_required",
      reasons: [
        "Rotary Stability pose features are available, but this segment has no curated FMS visual score.",
      ],
    };
  }

  const score = createScoreFromTotal(
    "rotary_stability",
    featureItem.manualScoreOverride,
    {
      scoreBasis: featureItem.manualScoreSource,
      usesCriteriaScores: false,
    },
  );
  const confidence = buildConfidence(featureItem, timingItem);

  return {
    segmentId: featureItem.segmentId,
    repetitionIndex: featureItem.repetitionIndex,
    status: "suggested",
    totalScore: score.totalScore,
    subscores: score.subscores,
    criteriaScores: score.criteriaScores,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    reasons: [
      `Rotary Stability curated visual review suggested ${score.totalScore}: ${featureItem.manualScoreReason}`,
      buildManualRuleReason(score.totalScore),
      "Pose landmarks are retained for skeleton display and supporting context.",
    ],
    modelVersion: "curated-fms-v0.1-rotary",
    scoreBasis: featureItem.manualScoreSource,
  };
}

export function buildRotaryStabilityExplainableSuggestion({
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
    modelVersion: "curated-fms-v0.1-rotary",
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
