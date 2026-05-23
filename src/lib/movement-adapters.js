import { summarizeDeepSquatPoseFeatures } from "./deep-squat-features.js";
import { buildDeepSquatExplainableSuggestion } from "./deep-squat-suggestion.js";
import { evaluateDeepSquatSegmentsTiming } from "./deep-squat-timing.js";

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

const MOVEMENT_ADAPTERS = {
  [DEEP_SQUAT_ADAPTER.actionType]: DEEP_SQUAT_ADAPTER,
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
