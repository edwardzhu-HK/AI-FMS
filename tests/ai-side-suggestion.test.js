import assert from "node:assert/strict";
import test from "node:test";
import { buildAiSideSuggestion } from "../src/lib/ai-side-suggestion.js";

test("buildAiSideSuggestion returns not-applicable evidence for non-lateralized actions", () => {
  const suggestion = buildAiSideSuggestion({
    actionType: "deep_squat",
    segment: {
      side: "none",
    },
    featureItem: {
      metrics: {
        side: "right",
      },
    },
  });

  assert.deepEqual(suggestion, {
    status: "not_applicable",
    source: "rep_policy",
    side: "none",
    confidence: null,
    confidenceStatus: "not_applicable",
    reviewerSide: "none",
    matchesReviewerSide: null,
    sourceSecond: null,
    reasonCode: "not_lateralized",
    evidence: {
      sidePolicy: "not_lateralized",
      aiSideInference: "not_applicable",
    },
  });
});

test("buildAiSideSuggestion normalizes lateralized pose evidence without overwriting reviewer side", () => {
  const suggestion = buildAiSideSuggestion({
    actionType: "in_line_lunge",
    segment: {
      side: "right",
    },
    featureItem: {
      sourceSecond: 6.1,
      ratings: {
        sideConfidence: {
          status: "watch",
          label: "left side low visibility",
        },
      },
      metrics: {
        frontSide: "left",
        rearSide: "right",
        sideVisibility: 0.7,
        rearSideVisibility: 0.8,
      },
    },
  });

  assert.deepEqual(suggestion, {
    status: "suggested",
    source: "pose_features",
    side: "left",
    confidence: 0.66,
    confidenceStatus: "watch",
    label: "left side low visibility",
    reviewerSide: "right",
    matchesReviewerSide: false,
    sourceSecond: 6.1,
    reasonCode: "pose_side_detected",
    evidence: {
      sidePolicy: "left_right",
      aiSideInference: "pose_supported",
      frontSide: "left",
      rearSide: "right",
      sideVisibility: 0.7,
      rearSideVisibility: 0.8,
      ratingStatus: "watch",
      ratingLabel: "left side low visibility",
    },
  });
});

test("buildAiSideSuggestion marks lateralized actions unavailable when pose features are missing", () => {
  const suggestion = buildAiSideSuggestion({
    actionType: "shoulder_mobility",
    segment: {
      side: "unknown",
    },
  });

  assert.equal(suggestion.status, "unavailable");
  assert.equal(suggestion.side, "unknown");
  assert.equal(suggestion.reasonCode, "missing_pose_features");
  assert.equal(suggestion.confidenceStatus, "missing");
});
