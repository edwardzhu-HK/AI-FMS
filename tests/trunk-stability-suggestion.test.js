import assert from "node:assert/strict";
import test from "node:test";

import { buildTrunkStabilityExplainableSuggestion } from "../src/lib/trunk-stability-suggestion.js";

const GOOD_RATING = { status: "good", label: "good evidence" };
const LIMITED_RATING = { status: "limited", label: "limited evidence" };

test("buildTrunkStabilityExplainableSuggestion maps trunk features to compatible subscores", () => {
  const suggestion = buildTrunkStabilityExplainableSuggestion({
    featureReport: {
      items: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          status: "ok",
          ratings: {
            pushUpPattern: GOOD_RATING,
            coreStability: GOOD_RATING,
            armExtension: GOOD_RATING,
            compensation: GOOD_RATING,
            trunkVisibility: GOOD_RATING,
          },
          metrics: {
            shoulderWristLift: 0.7,
            hipLineOffset: 0.02,
            hipLineOffsetRange: 0.01,
            avgElbowAngle: 178,
            avgVisibility: 0.94,
          },
        },
      ],
    },
    timingReport: {
      items: [{ segmentId: "seg_1", status: "good", coverageRatio: 1 }],
    },
  });

  assert.equal(suggestion.items[0].totalScore, 3);
  assert.equal(suggestion.items[0].criteriaScores.length, 3);
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("Extension clearing pain is not inferred"),
    ),
  );
});

test("buildTrunkStabilityExplainableSuggestion lowers score for limited body-line evidence", () => {
  const suggestion = buildTrunkStabilityExplainableSuggestion({
    featureReport: {
      items: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          status: "ok",
          ratings: {
            pushUpPattern: GOOD_RATING,
            coreStability: LIMITED_RATING,
            armExtension: GOOD_RATING,
            compensation: LIMITED_RATING,
            trunkVisibility: GOOD_RATING,
          },
          metrics: {
            shoulderWristLift: 0.7,
            hipLineOffset: 0.18,
            hipLineOffsetRange: 0.11,
            avgElbowAngle: 178,
            avgVisibility: 0.9,
          },
        },
      ],
    },
    timingReport: {
      items: [{ segmentId: "seg_1", status: "good", coverageRatio: 1 }],
    },
  });

  assert.equal(suggestion.items[0].totalScore, 1);
});

test("buildTrunkStabilityExplainableSuggestion returns null without features", () => {
  assert.equal(
    buildTrunkStabilityExplainableSuggestion({
      featureReport: { items: [] },
      timingReport: { items: [] },
    }),
    null,
  );
});
