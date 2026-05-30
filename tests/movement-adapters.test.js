import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateMovementEvidenceGate,
  allSegmentsMatchAdapter,
  getImplementedPoseActionTypes,
  getMovementCapabilities,
  getMovementCapability,
  getMovementAdapter,
} from "../src/lib/movement-adapters.js";

test("movement adapter registry exposes Deep Squat pose pipeline", () => {
  const adapter = getMovementAdapter("deep_squat");
  const capability = getMovementCapability("deep_squat");

  assert.equal(adapter.actionType, "deep_squat");
  assert.equal(adapter.posePipelineStatus, "implemented");
  assert.equal(capability.aiScoringStatus, "pose_based_ai_suggestion");
  assert.equal(capability.supportsPoseSuggestion, true);
  assert.equal(adapter.supportsAiDraftTiming, true);
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(typeof adapter.buildSuggestionReport, "function");
  assert.ok(getImplementedPoseActionTypes().includes("deep_squat"));
});

test("movement adapter registry exposes ASLR implemented pipeline", () => {
  const adapter = getMovementAdapter("active_straight_leg_raise");

  assert.equal(adapter.actionType, "active_straight_leg_raise");
  assert.equal(adapter.posePipelineStatus, "implemented");
  assert.equal(adapter.supportsAiDraftTiming, true);
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(typeof adapter.buildSuggestionReport, "function");
  assert.deepEqual(getImplementedPoseActionTypes(), [
    "deep_squat",
    "active_straight_leg_raise",
    "hurdle_step",
    "in_line_lunge",
    "shoulder_mobility",
  ]);
});

test("movement adapter registry exposes Hurdle Step implemented pipeline", () => {
  const adapter = getMovementAdapter("hurdle_step");

  assert.equal(adapter.actionType, "hurdle_step");
  assert.equal(adapter.posePipelineStatus, "implemented");
  assert.equal(adapter.supportsAiDraftTiming, true);
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(typeof adapter.buildSuggestionReport, "function");
});

test("movement adapter registry exposes Shoulder Mobility implemented pipeline", () => {
  const adapter = getMovementAdapter("shoulder_mobility");
  const capability = getMovementCapability("shoulder_mobility");

  assert.equal(adapter.actionType, "shoulder_mobility");
  assert.equal(adapter.posePipelineStatus, "implemented");
  assert.equal(capability.aiScoringStatus, "pose_based_ai_suggestion");
  assert.equal(capability.supportsPoseSuggestion, true);
  assert.equal(adapter.supportsAiDraftTiming, false);
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(typeof adapter.buildSuggestionReport, "function");
  assert.deepEqual(getImplementedPoseActionTypes(), [
    "deep_squat",
    "active_straight_leg_raise",
    "hurdle_step",
    "in_line_lunge",
    "shoulder_mobility",
  ]);
});

test("movement capability registry covers annotation-only actions", () => {
  assert.equal(getMovementAdapter("trunk_stability_push_up"), null);
  assert.deepEqual(
    getMovementCapabilities().map((capability) => capability.actionType),
    [
      "deep_squat",
      "active_straight_leg_raise",
      "hurdle_step",
      "in_line_lunge",
      "shoulder_mobility",
      "trunk_stability_push_up",
      "rotary_stability",
    ],
  );
  assert.equal(
    getMovementCapability("rotary_stability").posePipelineStatus,
    "annotation_only",
  );
});

test("movement evidence gate separates ready AI scoring from feature-only evidence", () => {
  assert.deepEqual(
    evaluateMovementEvidenceGate({
      actionType: "trunk_stability_push_up",
      segmentId: "seg_1",
    }),
    {
      actionType: "trunk_stability_push_up",
      status: "annotation_only",
      reasonCode: "annotation_only",
      canUsePoseEvidence: false,
      canShowPoseSuggestion: false,
      timingStatus: null,
      featureStatus: null,
      suggestionStatus: null,
    },
  );

  assert.equal(
    evaluateMovementEvidenceGate({
      actionType: "deep_squat",
      segmentId: "seg_1",
    }).status,
    "missing_pose_evidence",
  );

  assert.equal(
    evaluateMovementEvidenceGate({
      actionType: "shoulder_mobility",
      segmentId: "seg_1",
      poseSummary: { valid: true, missingFramesRatio: 0, avgVisibility: 0.9 },
      featureReport: {
        items: [{ segmentId: "seg_1", status: "ok" }],
      },
    }).status,
    "missing_timing",
  );

  assert.equal(
    evaluateMovementEvidenceGate({
      actionType: "shoulder_mobility",
      segmentId: "seg_1",
      poseSummary: { valid: true, missingFramesRatio: 0, avgVisibility: 0.9 },
      timingReport: {
        items: [{ segmentId: "seg_1", status: "good", issues: [] }],
      },
      featureReport: {
        items: [{ segmentId: "seg_1", status: "ok" }],
      },
      suggestionReport: {
        items: [{ segmentId: "seg_1", status: "suggested", totalScore: 2 }],
      },
    }).status,
    "ready",
  );

  const readyGate = evaluateMovementEvidenceGate({
    actionType: "deep_squat",
    segmentId: "seg_1",
    poseSummary: { valid: true, missingFramesRatio: 0, avgVisibility: 0.9 },
    timingReport: {
      items: [{ segmentId: "seg_1", status: "good", issues: [] }],
    },
    featureReport: {
      items: [{ segmentId: "seg_1", status: "ok" }],
    },
    suggestionReport: {
      items: [{ segmentId: "seg_1", status: "suggested", totalScore: 3 }],
    },
  });

  assert.equal(readyGate.status, "ready");
  assert.equal(readyGate.canShowPoseSuggestion, true);
});

test("movement adapter registry exposes In-Line Lunge implemented pipeline", () => {
  const adapter = getMovementAdapter("in_line_lunge");

  assert.equal(adapter.actionType, "in_line_lunge");
  assert.equal(adapter.posePipelineStatus, "implemented");
  assert.equal(adapter.supportsAiDraftTiming, true);
  assert.equal(typeof adapter.buildTimingReport, "function");
  assert.equal(typeof adapter.buildFeatureReport, "function");
  assert.equal(typeof adapter.buildSuggestionReport, "function");
  assert.deepEqual(getImplementedPoseActionTypes(), [
    "deep_squat",
    "active_straight_leg_raise",
    "hurdle_step",
    "in_line_lunge",
    "shoulder_mobility",
  ]);
});

test("allSegmentsMatchAdapter gates pose reports by action type", () => {
  const adapter = getMovementAdapter("deep_squat");

  assert.equal(
    allSegmentsMatchAdapter(
      [
        { segmentId: "seg_1", actionType: "deep_squat" },
        { segmentId: "seg_2", actionType: "deep_squat" },
      ],
      adapter,
      "deep_squat",
    ),
    true,
  );
  assert.equal(
    allSegmentsMatchAdapter(
      [
        { segmentId: "seg_1", actionType: "deep_squat" },
        { segmentId: "seg_2", actionType: "active_straight_leg_raise" },
      ],
      adapter,
      "deep_squat",
    ),
    false,
  );
});
