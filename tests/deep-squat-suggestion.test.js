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
    segments: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        attemptCondition: "floor",
      },
      {
        segmentId: "seg_2",
        repetitionIndex: 2,
        attemptCondition: "heels_elevated_board",
      },
    ],
  });

  assert.equal(suggestion.status, "ok");
  assert.equal(suggestion.summary.segmentsTotal, 2);
  assert.equal(suggestion.summary.stagedReviewCount, 0);
  assert.equal(suggestion.summary.minSuggestedScore, 2);

  assert.equal(suggestion.items[0].totalScore, 3);
  assert.equal(suggestion.items[0].attemptCondition, "floor");
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 3,
    torsoControl: 3,
  });
  assert.equal(suggestion.items[0].confidenceLabel, "high");

  assert.equal(suggestion.items[1].totalScore, 2);
  assert.equal(suggestion.items[1].attemptCondition, "heels_elevated_board");
  assert.equal(suggestion.items[1].rawAttemptScore, 2);
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

test("buildDeepSquatExplainableSuggestion does not score floor attempts below 3", () => {
  const suggestion = buildDeepSquatExplainableSuggestion({
    featureReport: {
      items: [
        {
          segmentId: "seg_floor",
          repetitionIndex: 1,
          status: "ok",
          ratings: {
            depth: rating("good", "hip below knee"),
            kneeAlignment: rating("good", "knees track feet"),
            torsoControl: rating("watch", "forward lean watch"),
          },
          metrics: {
            avgVisibility: 0.94,
          },
        },
      ],
    },
    timingReport: {
      items: [
        {
          segmentId: "seg_floor",
          status: "good",
          metrics: {
            coverageRatio: 1,
          },
        },
      ],
    },
    segments: [
      {
        segmentId: "seg_floor",
        repetitionIndex: 1,
        attemptCondition: "floor",
      },
    ],
  });

  assert.equal(suggestion.summary.scoredSegments, 0);
  assert.equal(suggestion.summary.stagedReviewCount, 1);
  assert.equal(suggestion.items[0].status, "needs_heel_elevated_attempt");
  assert.equal(suggestion.items[0].totalScore, null);
  assert.equal(suggestion.items[0].rawAttemptScore, 2);
});

test("buildDeepSquatExplainableSuggestion caps heel-elevated attempts at 2", () => {
  const suggestion = buildDeepSquatExplainableSuggestion({
    featureReport: {
      items: [
        {
          segmentId: "seg_board",
          repetitionIndex: 4,
          status: "ok",
          ratings: {
            depth: rating("good", "hip below knee"),
            kneeAlignment: rating("good", "knees track feet"),
            torsoControl: rating("good", "controlled trunk"),
          },
          metrics: {
            avgVisibility: 0.96,
          },
        },
      ],
    },
    timingReport: {
      items: [
        {
          segmentId: "seg_board",
          status: "good",
          metrics: {
            coverageRatio: 1,
          },
        },
      ],
    },
    segments: [
      {
        segmentId: "seg_board",
        repetitionIndex: 4,
        attemptCondition: "heels_elevated_board",
      },
    ],
  });

  assert.equal(suggestion.items[0].status, "suggested");
  assert.equal(suggestion.items[0].totalScore, 2);
  assert.equal(suggestion.items[0].rawAttemptScore, 3);
});

test("buildDeepSquatExplainableSuggestion never raises a pose score from reference labels", () => {
  const suggestion = buildDeepSquatExplainableSuggestion({
    featureReport: {
      items: [
        {
          segmentId: "seg_4",
          repetitionIndex: 4,
          status: "ok",
          ratings: {
            depth: rating("limited", "limited depth"),
            kneeAlignment: rating("good", "knees track feet"),
            torsoControl: rating("good", "controlled trunk"),
          },
          metrics: {
            avgVisibility: 0.94,
          },
        },
      ],
    },
    timingReport: {
      items: [
        {
          segmentId: "seg_4",
          status: "good",
          metrics: {
            coverageRatio: 1,
          },
        },
      ],
    },
    fileName: "5reps score 2.mp4",
    segments: [1, 2, 3, 4, 5].map((repetitionIndex) => ({
      segmentId: `seg_${repetitionIndex}`,
      repetitionIndex,
      attemptCondition: repetitionIndex >= 4 ? "heels_elevated_board" : "floor",
    })),
  });

  assert.equal(suggestion.items[0].attemptCondition, "heels_elevated_board");
  assert.equal(suggestion.items[0].rawAttemptScore, 1);
  assert.equal(suggestion.items[0].totalScore, 1);
  assert.equal(suggestion.items[0].scoreSource, "pose_features");
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
