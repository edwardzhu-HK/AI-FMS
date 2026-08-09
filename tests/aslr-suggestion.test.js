import assert from "node:assert/strict";
import test from "node:test";
import { buildAslrExplainableSuggestion } from "../src/lib/aslr-suggestion.js";

function createFeatureReport() {
  return {
    status: "ok",
    items: [
      {
        segmentId: "seg_1",
        repetitionIndex: 1,
        status: "ok",
        ratings: {
          activeLegRaise: {
            status: "good",
            label: "score 3 raise zone",
          },
          hipFlexion: {
            status: "good",
            label: "leg reaches high",
          },
          kneeExtension: {
            status: "good",
            label: "straight leg line",
          },
          pelvicStability: {
            status: "watch",
            label: "pelvic shift watch",
          },
          stationaryLegControl: {
            status: "good",
            label: "stable down leg",
          },
          sideConfidence: {
            status: "good",
            label: "right side detected",
          },
        },
        metrics: {
          avgVisibility: 0.9,
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
    ],
  };
}

test("buildAslrExplainableSuggestion maps ASLR features to compatible subscores", () => {
  const suggestion = buildAslrExplainableSuggestion({
    featureReport: createFeatureReport(),
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.status, "ok");
  assert.equal(suggestion.modelVersion, "pose-features-v0.3-aslr");
  assert.equal(suggestion.items.length, 1);
  assert.equal(suggestion.items[0].totalScore, 2);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 2,
    torsoControl: 3,
  });
  assert.equal(suggestion.items[0].confidenceLabel, "high");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Active leg raise suggested 3"),
    ),
  );
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Stationary leg control suggested 3"),
    ),
  );
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Pelvic stability suggested 2"),
    ),
  );
});

test("buildAslrExplainableSuggestion does not let mild moving-leg proxy override ASLR score-3 path", () => {
  const featureReport = createFeatureReport();
  featureReport.items[0].ratings.pelvicStability = {
    status: "good",
    label: "stable pelvis proxy",
  };
  featureReport.items[0].ratings.kneeExtension = {
    status: "watch",
    label: "mild knee bend",
  };

  const suggestion = buildAslrExplainableSuggestion({
    featureReport,
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.items[0].totalScore, 3);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 3,
    torsoControl: 3,
  });
});

test("buildAslrExplainableSuggestion ignores curated reference labels", () => {
  const featureReport = createFeatureReport();
  featureReport.items[0].manualScoreOverride = 2;
  featureReport.items[0].manualScoreSource = "curated_visual_fms_review";
  featureReport.items[0].manualScoreReason =
    "Valid ASLR rep in the manual score-2 zone.";

  const suggestion = buildAslrExplainableSuggestion({
    featureReport,
    timingReport: createTimingReport(),
  });

  assert.equal(suggestion.items[0].totalScore, 2);
  assert.deepEqual(suggestion.items[0].subscores, {
    depth: 3,
    kneeAlignment: 2,
    torsoControl: 3,
  });
  assert.equal(suggestion.items[0].scoreBasis, undefined);
  assert.ok(
    suggestion.items[0].reasons.every(
      (reason) => !reason.includes("manual visual review"),
    ),
  );
});

test("buildAslrExplainableSuggestion returns null without features", () => {
  assert.equal(
    buildAslrExplainableSuggestion({
      featureReport: null,
      timingReport: createTimingReport(),
    }),
    null,
  );
});

test("buildAslrExplainableSuggestion reports insufficient evidence", () => {
  const suggestion = buildAslrExplainableSuggestion({
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
