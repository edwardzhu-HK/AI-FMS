import assert from "node:assert/strict";
import test from "node:test";
import { buildShoulderMobilityExplainableSuggestion } from "../src/lib/shoulder-mobility-suggestion.js";

function rating(status, label) {
  return { status, label };
}

function createFeatureReport(overrides = {}) {
  return {
    status: "ok",
    items: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        status: "ok",
        ratings: {
          reachDistance: rating("good", "hands close proxy"),
          handVisibility: rating("good", "hands visible"),
          shoulderReference: rating("good", "body reference available"),
          sideContext: rating("good", "right side context"),
        },
        metrics: {
          side: "right",
          wristDistanceRatio: 0.11,
          handVisibility: 0.94,
          timingVisibility: 0.9,
        },
        ...overrides,
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

test("buildShoulderMobilityExplainableSuggestion maps Shoulder features to compatible subscores", () => {
  const suggestion = buildShoulderMobilityExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.status, "ok");
  assert.equal(suggestion.modelVersion, "pose-features-v0.1-shoulder");
  assert.equal(suggestion.summary.scoredSegments, 1);
  assert.equal(suggestion.items[0].totalScore, 3);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 3,
    torsoControl: 3,
  });
  assert.equal(suggestion.items[0].criteriaScores[0].label, "Reach Symmetry");
  assert.equal(suggestion.items[0].confidenceLabel, "high");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Shoulder clearing pain is not inferred"),
    ),
  );
});

test("buildShoulderMobilityExplainableSuggestion lowers score for watch reach evidence", () => {
  const suggestion = buildShoulderMobilityExplainableSuggestion({
    featureReport: createFeatureReport({
      ratings: {
        reachDistance: rating("watch", "moderate hand gap"),
        handVisibility: rating("good", "hands visible"),
        shoulderReference: rating("good", "body reference available"),
        sideContext: rating("watch", "side needs reviewer metadata"),
      },
    }),
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.items[0].totalScore, 2);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 2,
    kneeAlignment: 2,
    torsoControl: 2,
  });
});

test("buildShoulderMobilityExplainableSuggestion returns null without features", () => {
  assert.equal(
    buildShoulderMobilityExplainableSuggestion({
      featureReport: null,
      timingReport: createTimingReport(),
    }),
    null,
  );
});

test("buildShoulderMobilityExplainableSuggestion reports insufficient evidence", () => {
  const suggestion = buildShoulderMobilityExplainableSuggestion({
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
