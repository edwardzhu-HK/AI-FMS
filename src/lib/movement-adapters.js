import { evaluateAslrSegmentsTiming } from "./aslr-timing.js";
import { summarizeDeepSquatPoseFeatures } from "./deep-squat-features.js";
import { buildDeepSquatExplainableSuggestion } from "./deep-squat-suggestion.js";
import { evaluateDeepSquatSegmentsTiming } from "./deep-squat-timing.js";
import { summarizeAslrPoseFeatures } from "./aslr-features.js";
import { buildAslrExplainableSuggestion } from "./aslr-suggestion.js";
import { summarizeShoulderMobilityPoseFeatures } from "./shoulder-mobility-features.js";
import { evaluateShoulderMobilitySegmentsTiming } from "./shoulder-mobility-timing.js";

const DEEP_SQUAT_ADAPTER = {
  actionType: "deep_squat",
  posePipelineStatus: "implemented",
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
  buildSuggestionReport({ featureReport, timingReport }) {
    if (!featureReport || !timingReport) {
      return null;
    }

    return buildDeepSquatExplainableSuggestion({
      featureReport,
      timingReport,
    });
  },
};

const ASLR_ADAPTER = {
  actionType: "active_straight_leg_raise",
  posePipelineStatus: "implemented",
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
  actionType: "shoulder_mobility",
  posePipelineStatus: "features_only",
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
  buildSuggestionReport() {
    return null;
  },
};

const MOVEMENT_ADAPTERS = {
  [DEEP_SQUAT_ADAPTER.actionType]: DEEP_SQUAT_ADAPTER,
  [ASLR_ADAPTER.actionType]: ASLR_ADAPTER,
  [SHOULDER_MOBILITY_ADAPTER.actionType]: SHOULDER_MOBILITY_ADAPTER,
};

export function getMovementAdapter(actionType) {
  return MOVEMENT_ADAPTERS[actionType] ?? null;
}

export function getImplementedPoseActionTypes() {
  return Object.values(MOVEMENT_ADAPTERS)
    .filter((adapter) => adapter.posePipelineStatus === "implemented")
    .map((adapter) => adapter.actionType);
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
