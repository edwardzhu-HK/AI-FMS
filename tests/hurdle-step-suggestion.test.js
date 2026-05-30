import assert from "node:assert/strict";
import test from "node:test";
import { buildHurdleStepExplainableSuggestion } from "../src/lib/hurdle-step-suggestion.js";

function rating(status, label) {
  return { status, label };
}

function createFeatureReport() {
  return {
    status: "ok",
    items: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        status: "ok",
        ratings: {
          stepClearance: rating("good", "clear step height proxy"),
          stanceStability: rating("good", "stable stance proxy"),
          trunkControl: rating("watch", "trunk shift watch"),
          sideConfidence: rating("good", "left side detected"),
        },
        metrics: {
          avgVisibility: 0.92,
        },
      },
    ],
  };
}

function createTimingReport(status = "good") {
  return {
    items: [
      {
        segmentId: "seg_1",
        status,
        metrics: {
          coverageRatio: 1,
        },
      },
    ],
  };
}

test("buildHurdleStepExplainableSuggestion maps Hurdle features to compatible subscores", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.status, "ok");
  assert.equal(suggestion.modelVersion, "pose-features-v0.1-hurdle");
  assert.equal(suggestion.summary.scoredSegments, 1);
  assert.equal(suggestion.items[0].totalScore, 2);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 3,
    torsoControl: 2,
  });
  assert.equal(suggestion.items[0].confidenceLabel, "high");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Step clearance suggested 3"),
    ),
  );
});

test("buildHurdleStepExplainableSuggestion returns null without features", () => {
  assert.equal(
    buildHurdleStepExplainableSuggestion({
      featureReport: null,
      timingReport: createTimingReport(),
    }),
    null,
  );
});

test("buildHurdleStepExplainableSuggestion reports timing adjustment reason", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport("needs_adjustment"),
  });

  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Timing QA indicates"),
    ),
  );
});

test("buildHurdleStepExplainableSuggestion reports insufficient evidence", () => {
  const suggestion = buildHurdleStepExplainableSuggestion({
    featureReport: {
      items: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          status: "no_cycle",
          ratings: {},
          metrics: {},
        },
      ],
    },
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.items[0].status, "insufficient_evidence");
  assert.equal(suggestion.items[0].totalScore, null);
  assert.equal(suggestion.summary.scoredSegments, 0);
});
