import assert from "node:assert/strict";
import test from "node:test";
import { buildInlineLungeExplainableSuggestion } from "../src/lib/inline-lunge-suggestion.js";

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
          lungeDepth: rating("good", "deep lunge proxy"),
          trunkAlignment: rating("watch", "trunk shift watch"),
          kneeFootAlignment: rating("good", "knee tracks foot proxy"),
          sideConfidence: rating("good", "left side detected"),
        },
        metrics: {
          avgVisibility: 0.88,
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

test("buildInlineLungeExplainableSuggestion maps In-Line Lunge features to compatible subscores", () => {
  const suggestion = buildInlineLungeExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.status, "ok");
  assert.equal(suggestion.modelVersion, "pose-features-v0.1-inline-lunge");
  assert.equal(suggestion.summary.scoredSegments, 1);
  assert.equal(suggestion.items[0].totalScore, 2);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 2,
    torsoControl: 3,
  });
  assert.equal(suggestion.items[0].confidenceLabel, "high");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Lunge depth suggested 3"),
    ),
  );
});

test("buildInlineLungeExplainableSuggestion returns null without features", () => {
  assert.equal(
    buildInlineLungeExplainableSuggestion({
      featureReport: null,
      timingReport: createTimingReport(),
    }),
    null,
  );
});

test("buildInlineLungeExplainableSuggestion reports timing adjustment reason", () => {
  const suggestion = buildInlineLungeExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport("needs_adjustment"),
  });

  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Timing QA indicates"),
    ),
  );
});

test("buildInlineLungeExplainableSuggestion reports insufficient evidence", () => {
  const suggestion = buildInlineLungeExplainableSuggestion({
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
