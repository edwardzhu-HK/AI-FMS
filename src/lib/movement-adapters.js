import { evaluateAslrSegmentsTiming } from "./aslr-timing.js";
import { summarizeDeepSquatPoseFeatures } from "./deep-squat-features.js";
import { buildDeepSquatExplainableSuggestion } from "./deep-squat-suggestion.js";
import { evaluateDeepSquatSegmentsTiming } from "./deep-squat-timing.js";
import { summarizeAslrPoseFeatures } from "./aslr-features.js";
import { buildAslrExplainableSuggestion } from "./aslr-suggestion.js";
import { summarizeShoulderMobilityPoseFeatures } from "./shoulder-mobility-features.js";
import { buildShoulderMobilityExplainableSuggestion } from "./shoulder-mobility-suggestion.js";
import { evaluateShoulderMobilitySegmentsTiming } from "./shoulder-mobility-timing.js";
import { summarizeHurdleStepPoseFeatures } from "./hurdle-step-features.js";
import { buildHurdleStepExplainableSuggestion } from "./hurdle-step-suggestion.js";
import { evaluateHurdleStepSegmentsTiming } from "./hurdle-step-timing.js";
import { summarizeInlineLungePoseFeatures } from "./inline-lunge-features.js";
import { buildInlineLungeExplainableSuggestion } from "./inline-lunge-suggestion.js";
import { evaluateInlineLungeSegmentsTiming } from "./inline-lunge-timing.js";
import { summarizeTrunkStabilityPoseFeatures } from "./trunk-stability-features.js";
import { buildTrunkStabilityExplainableSuggestion } from "./trunk-stability-suggestion.js";
import { evaluateTrunkStabilitySegmentsTiming } from "./trunk-stability-timing.js";
import { summarizeRotaryStabilityPoseFeatures } from "./rotary-stability-features.js";
import { evaluateRotaryStabilitySegmentsTiming } from "./rotary-stability-timing.js";
import { buildRotaryStabilityCycleEvidence } from "./rotary-stability-cycle-evidence.js";
import { buildRotaryStabilityFirstPassSuggestion } from "./rotary-stability-suggestion.js";

export const MOVEMENT_CAPABILITY_STATUS = {
  IMPLEMENTED: "implemented",
  FEATURES_ONLY: "features_only",
  ANNOTATION_ONLY: "annotation_only",
};

export const AI_SCORING_STATUS = {
  POSE_BASED: "pose_based_ai_suggestion",
  FEATURES_ONLY: "pose_evidence_only",
  NOT_SUPPORTED: "not_supported_yet",
};

const BASE_CAPABILITIES = {
  deep_squat: {
    actionType: "deep_squat",
    posePipelineStatus: MOVEMENT_CAPABILITY_STATUS.IMPLEMENTED,
    aiScoringStatus: AI_SCORING_STATUS.POSE_BASED,
    supportsPoseTiming: true,
    supportsPoseFeatures: true,
    supportsPoseSuggestion: true,
    supportsAiDraftTiming: true,
  },
  active_straight_leg_raise: {
    actionType: "active_straight_leg_raise",
    posePipelineStatus: MOVEMENT_CAPABILITY_STATUS.IMPLEMENTED,
    aiScoringStatus: AI_SCORING_STATUS.POSE_BASED,
    supportsPoseTiming: true,
    supportsPoseFeatures: true,
    supportsPoseSuggestion: true,
    supportsAiDraftTiming: true,
  },
  hurdle_step: {
    actionType: "hurdle_step",
    posePipelineStatus: MOVEMENT_CAPABILITY_STATUS.IMPLEMENTED,
    aiScoringStatus: AI_SCORING_STATUS.POSE_BASED,
    supportsPoseTiming: true,
    supportsPoseFeatures: true,
    supportsPoseSuggestion: true,
    supportsAiDraftTiming: true,
  },
  in_line_lunge: {
    actionType: "in_line_lunge",
    posePipelineStatus: MOVEMENT_CAPABILITY_STATUS.IMPLEMENTED,
    aiScoringStatus: AI_SCORING_STATUS.POSE_BASED,
    supportsPoseTiming: true,
    supportsPoseFeatures: true,
    supportsPoseSuggestion: true,
    supportsAiDraftTiming: true,
  },
  shoulder_mobility: {
    actionType: "shoulder_mobility",
    posePipelineStatus: MOVEMENT_CAPABILITY_STATUS.IMPLEMENTED,
    aiScoringStatus: AI_SCORING_STATUS.POSE_BASED,
    supportsPoseTiming: true,
    supportsPoseFeatures: true,
    supportsPoseSuggestion: true,
    supportsAiDraftTiming: false,
  },
  trunk_stability_push_up: {
    actionType: "trunk_stability_push_up",
    posePipelineStatus: MOVEMENT_CAPABILITY_STATUS.IMPLEMENTED,
    aiScoringStatus: AI_SCORING_STATUS.POSE_BASED,
    supportsPoseTiming: true,
    supportsPoseFeatures: true,
    supportsPoseSuggestion: true,
    supportsAiDraftTiming: false,
  },
  rotary_stability: {
    actionType: "rotary_stability",
    posePipelineStatus: MOVEMENT_CAPABILITY_STATUS.IMPLEMENTED,
    aiScoringStatus: AI_SCORING_STATUS.POSE_BASED,
    supportsPoseTiming: true,
    supportsPoseFeatures: true,
    supportsPoseSuggestion: true,
    supportsAiDraftTiming: true,
  },
};

function cloneCapability(capability) {
  return capability ? { ...capability } : null;
}

function findSegmentItem(report, segmentId) {
  if (!report || !segmentId) {
    return null;
  }

  return report.items?.find((item) => item.segmentId === segmentId) ?? null;
}

function hasPoseEvidence({ poseSummary, timingReport, featureReport }) {
  return Boolean(
    poseSummary || timingReport?.items?.length || featureReport?.items?.length,
  );
}

function isPoseSummaryLimited(poseSummary) {
  if (!poseSummary) {
    return false;
  }

  const missingFramesRatio = poseSummary.missingFramesRatio ?? 0;
  const avgVisibility = poseSummary.avgVisibility ?? 1;

  return (
    poseSummary.valid === false ||
    missingFramesRatio > 0.1 ||
    avgVisibility < 0.75
  );
}

function isTimingBlocked(timingItem) {
  return (
    timingItem?.status === "needs_adjustment" ||
    (timingItem?.issues ?? []).some((issue) => issue.severity === "error")
  );
}

function createGate({
  actionType,
  status,
  reasonCode,
  canUsePoseEvidence = false,
  canShowPoseSuggestion = false,
  timingItem = null,
  featureItem = null,
  suggestionItem = null,
}) {
  return {
    actionType,
    status,
    reasonCode,
    canUsePoseEvidence,
    canShowPoseSuggestion,
    timingStatus: timingItem?.status ?? null,
    featureStatus: featureItem?.status ?? null,
    suggestionStatus: suggestionItem?.status ?? null,
  };
}

const DEEP_SQUAT_ADAPTER = {
  ...BASE_CAPABILITIES.deep_squat,
  actionType: "deep_squat",
  featureTitleKey: "deepSquatFeatures",
  buildTimingReport({ posePayload, segments }) {
    if (!posePayload || !segments?.length) {
      return null;
    }

    return evaluateDeepSquatSegmentsTiming({
      posePayload,
      segments,
    });
  },
  buildFeatureReport({ posePayload, timingReport }) {
    if (!posePayload || !timingReport) {
      return null;
    }

    return summarizeDeepSquatPoseFeatures({
      posePayload,
      timingReport,
    });
  },
  buildSuggestionReport({
    featureReport,
    timingReport,
    segments,
    notes,
    fileName,
  }) {
    if (!featureReport || !timingReport) {
      return null;
    }

    return buildDeepSquatExplainableSuggestion({
      featureReport,
      timingReport,
      segments,
      notes,
      fileName,
    });
  },
};

const ASLR_ADAPTER = {
  ...BASE_CAPABILITIES.active_straight_leg_raise,
  actionType: "active_straight_leg_raise",
  featureTitleKey: "activeStraightLegRaiseFeatures",
  buildTimingReport({ posePayload, segments }) {
    if (!posePayload || !segments?.length) {
      return null;
    }

    return evaluateAslrSegmentsTiming({
      posePayload,
      segments,
    });
  },
  buildFeatureReport({ posePayload, timingReport } = {}) {
    if (!posePayload || !timingReport) {
      return null;
    }

    return summarizeAslrPoseFeatures({
      posePayload,
      timingReport,
    });
  },
  buildSuggestionReport({ featureReport, timingReport } = {}) {
    if (!featureReport || !timingReport) {
      return null;
    }

    return buildAslrExplainableSuggestion({
      featureReport,
      timingReport,
    });
  },
};

const SHOULDER_MOBILITY_ADAPTER = {
  ...BASE_CAPABILITIES.shoulder_mobility,
  actionType: "shoulder_mobility",
  featureTitleKey: "shoulderMobilityFeatures",
  buildTimingReport({ posePayload, segments }) {
    if (!posePayload || !segments?.length) {
      return null;
    }

    return evaluateShoulderMobilitySegmentsTiming({
      posePayload,
      segments,
    });
  },
  buildFeatureReport({ posePayload, timingReport } = {}) {
    if (!posePayload || !timingReport) {
      return null;
    }

    return summarizeShoulderMobilityPoseFeatures({
      posePayload,
      timingReport,
    });
  },
  buildSuggestionReport({ featureReport, timingReport } = {}) {
    if (!featureReport || !timingReport) {
      return null;
    }

    return buildShoulderMobilityExplainableSuggestion({
      featureReport,
      timingReport,
    });
  },
};

const HURDLE_STEP_ADAPTER = {
  ...BASE_CAPABILITIES.hurdle_step,
  actionType: "hurdle_step",
  featureTitleKey: "hurdleStepFeatures",
  buildTimingReport({ posePayload, segments }) {
    if (!posePayload || !segments?.length) {
      return null;
    }

    return evaluateHurdleStepSegmentsTiming({
      posePayload,
      segments,
    });
  },
  buildFeatureReport({ posePayload, timingReport } = {}) {
    if (!posePayload || !timingReport) {
      return null;
    }

    return summarizeHurdleStepPoseFeatures({
      posePayload,
      timingReport,
    });
  },
  buildSuggestionReport({
    featureReport,
    timingReport,
    segments,
    notes,
    fileName,
  } = {}) {
    if (!featureReport || !timingReport) {
      return null;
    }

    return buildHurdleStepExplainableSuggestion({
      featureReport,
      timingReport,
      segments,
      notes,
      fileName,
    });
  },
};

const INLINE_LUNGE_ADAPTER = {
  ...BASE_CAPABILITIES.in_line_lunge,
  actionType: "in_line_lunge",
  featureTitleKey: "inlineLungeFeatures",
  buildTimingReport({ posePayload, segments }) {
    if (!posePayload || !segments?.length) {
      return null;
    }

    return evaluateInlineLungeSegmentsTiming({
      posePayload,
      segments,
    });
  },
  buildFeatureReport({ posePayload, timingReport } = {}) {
    if (!posePayload || !timingReport) {
      return null;
    }

    return summarizeInlineLungePoseFeatures({
      posePayload,
      timingReport,
    });
  },
  buildSuggestionReport({ featureReport, timingReport } = {}) {
    if (!featureReport || !timingReport) {
      return null;
    }

    return buildInlineLungeExplainableSuggestion({
      featureReport,
      timingReport,
    });
  },
};

const TRUNK_STABILITY_ADAPTER = {
  ...BASE_CAPABILITIES.trunk_stability_push_up,
  actionType: "trunk_stability_push_up",
  featureTitleKey: "trunkStabilityPushUpFeatures",
  buildTimingReport({ posePayload, segments }) {
    if (!posePayload || !segments?.length) {
      return null;
    }

    return evaluateTrunkStabilitySegmentsTiming({
      posePayload,
      segments,
    });
  },
  buildFeatureReport({ posePayload, timingReport } = {}) {
    if (!posePayload || !timingReport) {
      return null;
    }

    return summarizeTrunkStabilityPoseFeatures({
      posePayload,
      timingReport,
    });
  },
  buildSuggestionReport({ featureReport, timingReport } = {}) {
    if (!featureReport || !timingReport) {
      return null;
    }

    return buildTrunkStabilityExplainableSuggestion({
      featureReport,
      timingReport,
    });
  },
};

const ROTARY_STABILITY_ADAPTER = {
  ...BASE_CAPABILITIES.rotary_stability,
  actionType: "rotary_stability",
  featureTitleKey: "rotaryStabilityFeatures",
  buildTimingReport({ posePayload, segments }) {
    if (!posePayload || !segments?.length) {
      return null;
    }

    return evaluateRotaryStabilitySegmentsTiming({
      posePayload,
      segments,
    });
  },
  buildFeatureReport({ posePayload, timingReport } = {}) {
    if (!posePayload || !timingReport) {
      return null;
    }

    return summarizeRotaryStabilityPoseFeatures({
      posePayload,
      timingReport,
    });
  },
  buildSuggestionReport({ posePayload, timingReport, segments } = {}) {
    if (!posePayload || !timingReport || !segments?.length) {
      return null;
    }

    const cycleEvidenceReport = buildRotaryStabilityCycleEvidence({
      posePayload,
      timingReport,
      segments,
    });
    if (!cycleEvidenceReport) {
      return null;
    }

    return buildRotaryStabilityFirstPassSuggestion({
      cycleEvidenceReport,
    });
  },
};

const MOVEMENT_ADAPTERS = {
  [DEEP_SQUAT_ADAPTER.actionType]: DEEP_SQUAT_ADAPTER,
  [ASLR_ADAPTER.actionType]: ASLR_ADAPTER,
  [SHOULDER_MOBILITY_ADAPTER.actionType]: SHOULDER_MOBILITY_ADAPTER,
  [HURDLE_STEP_ADAPTER.actionType]: HURDLE_STEP_ADAPTER,
  [INLINE_LUNGE_ADAPTER.actionType]: INLINE_LUNGE_ADAPTER,
  [TRUNK_STABILITY_ADAPTER.actionType]: TRUNK_STABILITY_ADAPTER,
  [ROTARY_STABILITY_ADAPTER.actionType]: ROTARY_STABILITY_ADAPTER,
};

export function getMovementAdapter(actionType) {
  return MOVEMENT_ADAPTERS[actionType] ?? null;
}

export function getMovementCapability(actionType) {
  return cloneCapability(BASE_CAPABILITIES[actionType]);
}

export function getMovementCapabilities() {
  return Object.values(BASE_CAPABILITIES).map(cloneCapability);
}

export function getImplementedPoseActionTypes() {
  return Object.values(BASE_CAPABILITIES)
    .filter(
      (capability) =>
        capability.posePipelineStatus ===
        MOVEMENT_CAPABILITY_STATUS.IMPLEMENTED,
    )
    .map((capability) => capability.actionType);
}

export function evaluateMovementEvidenceGate({
  actionType,
  segmentId,
  poseSummary = null,
  timingReport = null,
  featureReport = null,
  suggestionReport = null,
} = {}) {
  const capability = getMovementCapability(actionType);
  const timingItem = findSegmentItem(timingReport, segmentId);
  const featureItem = findSegmentItem(featureReport, segmentId);
  const suggestionItem = findSegmentItem(suggestionReport, segmentId);

  if (!capability) {
    return createGate({
      actionType,
      status: "unknown",
      reasonCode: "unknown_action",
    });
  }

  if (
    capability.posePipelineStatus === MOVEMENT_CAPABILITY_STATUS.ANNOTATION_ONLY
  ) {
    return createGate({
      actionType,
      status: "annotation_only",
      reasonCode: "annotation_only",
    });
  }

  if (!hasPoseEvidence({ poseSummary, timingReport, featureReport })) {
    return createGate({
      actionType,
      status: "missing_pose_evidence",
      reasonCode: "missing_pose_evidence",
    });
  }

  if (isPoseSummaryLimited(poseSummary)) {
    return createGate({
      actionType,
      status: "limited_pose_quality",
      reasonCode: "limited_pose_quality",
      canUsePoseEvidence: true,
      timingItem,
      featureItem,
      suggestionItem,
    });
  }

  if (
    capability.posePipelineStatus === MOVEMENT_CAPABILITY_STATUS.FEATURES_ONLY
  ) {
    return createGate({
      actionType,
      status:
        featureItem?.status === "ok" ? "features_only" : "limited_features",
      reasonCode:
        featureItem?.status === "ok" ? "features_only" : "limited_features",
      canUsePoseEvidence: Boolean(featureItem),
      timingItem,
      featureItem,
      suggestionItem,
    });
  }

  if (!timingItem) {
    return createGate({
      actionType,
      status: "missing_timing",
      reasonCode: "missing_timing",
      canUsePoseEvidence: true,
      featureItem,
      suggestionItem,
    });
  }

  if (isTimingBlocked(timingItem)) {
    return createGate({
      actionType,
      status: "timing_needs_review",
      reasonCode: "timing_needs_review",
      canUsePoseEvidence: true,
      timingItem,
      featureItem,
      suggestionItem,
    });
  }

  if (featureItem?.status !== "ok") {
    return createGate({
      actionType,
      status: "insufficient_features",
      reasonCode: "insufficient_features",
      canUsePoseEvidence: true,
      timingItem,
      featureItem,
      suggestionItem,
    });
  }

  if (
    suggestionItem?.status === "needs_heel_elevated_attempt" ||
    suggestionItem?.status === "needs_attempt_condition_review"
  ) {
    return createGate({
      actionType,
      status: "staged_scoring_needs_review",
      reasonCode: "deep_squat_needs_heel_elevated_attempt",
      canUsePoseEvidence: true,
      timingItem,
      featureItem,
      suggestionItem,
    });
  }

  if (
    suggestionItem?.status !== "suggested" ||
    suggestionItem.totalScore === null
  ) {
    return createGate({
      actionType,
      status: "insufficient_ai_suggestion",
      reasonCode: "insufficient_ai_suggestion",
      canUsePoseEvidence: true,
      timingItem,
      featureItem,
      suggestionItem,
    });
  }

  return createGate({
    actionType,
    status: "ready",
    reasonCode: "ready",
    canUsePoseEvidence: true,
    canShowPoseSuggestion: true,
    timingItem,
    featureItem,
    suggestionItem,
  });
}

export function allSegmentsMatchAdapter(segments, adapter, fallbackActionType) {
  if (!adapter || !segments?.length) {
    return false;
  }

  return segments.every(
    (segment) =>
      (segment.actionType ?? fallbackActionType) === adapter.actionType,
  );
}
