import { summarizeRotaryStabilityPoseFeatures } from "./rotary-stability-features.js";
import { evaluateRotaryStabilitySegmentsTiming } from "./rotary-stability-timing.js";
import { buildRotaryStabilityCycleEvidence } from "./rotary-stability-cycle-evidence.js";
import { buildRotaryStabilityExperimentalSuggestion } from "./rotary-stability-suggestion.js";

const EXPERIMENTAL_ROTARY_STABILITY_ADAPTER = Object.freeze({
  actionType: "rotary_stability",
  status: "experimental_first_pass",
  exposedInDefaultWorkbench: true,
  exposedInFrozenRoundB: false,
  buildTimingReport({ posePayload, segments }) {
    return evaluateRotaryStabilitySegmentsTiming({ posePayload, segments });
  },
  buildFeatureReport({ posePayload, timingReport }) {
    return summarizeRotaryStabilityPoseFeatures({ posePayload, timingReport });
  },
  buildCycleEvidenceReport({ posePayload, timingReport, segments, options }) {
    return buildRotaryStabilityCycleEvidence({
      posePayload,
      timingReport,
      segments,
      options,
    });
  },
  buildSuggestionReport({ cycleEvidenceReport, protocolMetadataBySegment }) {
    return buildRotaryStabilityExperimentalSuggestion({
      cycleEvidenceReport,
      protocolMetadataBySegment,
    });
  },
});

export function getRotaryStabilityExperimentalAdapter() {
  return EXPERIMENTAL_ROTARY_STABILITY_ADAPTER;
}
