import assert from "node:assert/strict";
import test from "node:test";
import { buildDeepSquatExplainableSuggestion } from "../src/lib/deep-squat-suggestion.js";

function rating(status, label) {
  return { status, label };
}

function createFeatureReport() {
  return {
    items: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        status: "ok",
        ratings: {
          depth: rating("good", "hip below knee"),
          kneeAlignment: rating("good", "knees track feet"),
          torsoControl: rating("not_applicable", "best from side view"),
        },
        metrics: {
          avgVisibility: 0.96,
        },
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        status: "ok",
        ratings: {
          depth: rating("good", "hip below knee"),
          kneeAlignment: rating("not_applicable", "best from front view"),
          torsoControl: rating("watch", "forward lean watch"),
        },
        metrics: {
          avgVisibility: 0.94,
        },
      },
    ],
  };
}

function createTimingReport() {
  return {
    items: [
      {
        segmentId: "seg_1",
        status: "good",
        metrics: {
          coverageRatio: 1,
        },
      },
      {
        segmentId: "seg_2",
        status: "needs_adjustment",
        metrics: {
          coverageRatio: 0.82,
        },
      },
    ],
  };
}

test("buildDeepSquatExplainableSuggestion maps feature ratings to scores", () => {
  const suggestion = buildDeepSquatExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.status, "ok");
  assert.equal(suggestion.summary.segmentsTotal, 2);
  assert.equal(suggestion.summary.minSuggestedScore, 2);

  assert.equal(suggestion.items[0].totalScore, 3);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 3,
    torsoControl: 3,
  });
  assert.equal(suggestion.items[0].confidenceLabel, "high");

  assert.equal(suggestion.items[1].totalScore, 2);
  assert.equal(suggestion.items[1].subscores.torsoControl, 2);
  assert.ok(
    suggestion.items[1].reasons.some((reason) =>
      reason.includes("forward lean watch"),
    ),
  );
  assert.ok(
    suggestion.items[1].reasons.some((reason) =>
      reason.includes("Timing QA indicates"),
    ),
  );
});

test("buildDeepSquatExplainableSuggestion returns null without feature items", () => {
  assert.equal(
    buildDeepSquatExplainableSuggestion({
      featureReport: null,
      timingReport: createTimingReport(),
    }),
    null,
  );
});
