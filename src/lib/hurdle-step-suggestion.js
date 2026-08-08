import {
  createScoreFromSubscores,
  createScoreFromTotal,
} from "../constants/scoring.js";
import { inferScoreForRepetition } from "./score-hints.js";

const POSE_ONLY_SCORING_HINTS = [
  "pose-based scoring",
  "pose only scoring",
  "pose-only scoring",
  "自行判断",
  "不使用文件名",
  "不参考视频名称",
  "do not use filename",
  "ignore filename",
  "not use filename",
];

function shouldUsePoseOnlyScoring(notes) {
  const normalized = (notes ?? "").toLowerCase().replace(/\s+/g, " ");

  return POSE_ONLY_SCORING_HINTS.some((hint) =>
    normalized.includes(hint.toLowerCase()),
  );
}

function ratingToScore(status) {
  if (status === "limited") {
    return 2;
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

function buildMetadataScoreItem(featureItem, metadataScore, timingReport) {
  const timingItem = findTimingItem(timingReport, featureItem);
  const score = createScoreFromTotal("hurdle_step", metadataScore);

  return {
    segmentId: featureItem.segmentId,
    repetitionIndex: featureItem.repetitionIndex,
    status: "suggested",
    scoringStatus: "scored",
    scoreSource: "manual_or_sample_metadata",
    totalScore: score.totalScore,
    subscores: score.subscores,
    criteriaScores: score.criteriaScores,
    confidence: 0.92,
    confidenceLabel: "high",
    reasons: [
      `FMS Hurdle Step score ${metadataScore} comes from explicit reviewer/sample metadata for this repetition.`,
      "Pose features are retained as supporting evidence, but the manual/sample label is the scoring source.",
      ...(timingItem?.status === "needs_adjustment"
        ? [
            "Timing QA indicates this segment may need adjustment before final scoring.",
          ]
        : []),
    ],
    modelVersion: "pose-features-v0.3-hurdle-fms-gated",
  };
}

function buildManualReviewItem(featureItem, timingReport, score, reasons) {
  const timingItem = findTimingItem(timingReport, featureItem);

  return {
    segmentId: featureItem.segmentId,
    repetitionIndex: featureItem.repetitionIndex,
    status: "needs_manual_review",
    scoringStatus: "not_scored",
    scoreSource: "pose_proxy_needs_manual_review",
    totalScore: null,
    rawPoseScore: score.totalScore,
    subscores: score.subscores,
    criteriaScores: score.criteriaScores,
    confidence: 0.48,
    confidenceLabel: "low",
    reasons: [
      "FMS Hurdle Step score 1 requires explicit evidence such as contacting the hurdle, losing balance, or being unable to complete the movement; this pose-only proxy cannot confirm that.",
      "Review the video and assign the reviewer score from the FMS manual criteria.",
      ...reasons,
      ...(timingItem?.status === "needs_adjustment"
        ? [
            "Timing QA indicates this segment may need adjustment before final scoring.",
          ]
        : []),
    ],
    modelVersion: "pose-features-v0.3-hurdle-fms-gated",
  };
}

function buildScoreOneEvidenceItem(
  featureItem,
  timingReport,
  scoreOneEvidence,
) {
  const timingItem = findTimingItem(timingReport, featureItem);
  const score = createScoreFromTotal("hurdle_step", 1);
  const evidenceLabel =
    scoreOneEvidence === "hurdle_contact"
      ? "Observed contact with the hurdle kit / cord path during this repetition."
      : "Observed FMS score-1 rule evidence during this repetition.";

  return {
    segmentId: featureItem.segmentId,
    repetitionIndex: featureItem.repetitionIndex,
    status: "suggested",
    scoringStatus: "scored",
    scoreSource: "pose_proxy_fms_manual_rule",
    totalScore: score.totalScore,
    subscores: score.subscores,
    criteriaScores: score.criteriaScores,
    confidence: 0.9,
    confidenceLabel: "high",
    reasons: [
      "FMS Hurdle Step manual rule: inability to clear the hurdle/cord or loss of balance maps to score 1.",
      evidenceLabel,
      ...(timingItem?.status === "needs_adjustment"
        ? [
            "Timing QA indicates this segment may need adjustment before final scoring.",
          ]
        : []),
    ],
    modelVersion: "pose-features-v0.4-hurdle-fms-manual-rule",
  };
}

function buildSuggestionItem(featureItem, timingReport, context = {}) {
  const timingItem = findTimingItem(timingReport, featureItem);
  const metadataScore = shouldUsePoseOnlyScoring(context.notes)
    ? null
    : inferScoreForRepetition({
        notes: context.notes,
        fileName: context.fileName,
        repetitionIndex: featureItem.repetitionIndex,
        repetitionCount:
          context.repetitionCount ??
          context.segments?.length ??
          context.itemCount,
      });

  if (metadataScore) {
    return buildMetadataScoreItem(featureItem, metadataScore, timingReport);
  }

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

  const scoreOneEvidence = featureItem.metrics?.scoreOneEvidence;
  if (scoreOneEvidence) {
    return buildScoreOneEvidenceItem(
      featureItem,
      timingReport,
      scoreOneEvidence,
    );
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

  if (score.totalScore === 1) {
    return buildManualReviewItem(featureItem, timingReport, score, reasons);
  }

  return {
    segmentId: featureItem.segmentId,
    repetitionIndex: featureItem.repetitionIndex,
    status: "suggested",
    scoringStatus: "scored",
    scoreSource: "pose_proxy",
    totalScore: score.totalScore,
    subscores: score.subscores,
    criteriaScores: score.criteriaScores,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    reasons,
    modelVersion: "pose-features-v0.3-hurdle-fms-gated",
  };
}

export function buildHurdleStepExplainableSuggestion({
  featureReport,
  timingReport,
  segments,
  notes = "",
  fileName = "",
} = {}) {
  if (!featureReport?.items?.length) {
    return null;
  }

  const items = featureReport.items.map((featureItem) =>
    buildSuggestionItem(featureItem, timingReport, {
      segments,
      notes,
      fileName,
      repetitionCount: featureReport.summary?.repetitionsTotal,
      itemCount: featureReport.items.length,
    }),
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
