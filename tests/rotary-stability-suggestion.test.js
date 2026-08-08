import assert from "node:assert/strict";
import test from "node:test";

import { buildRotaryStabilityExplainableSuggestion } from "../src/lib/rotary-stability-suggestion.js";

test("buildRotaryStabilityExplainableSuggestion shows curated FMS score-1 criteria", () => {
  const suggestion = buildRotaryStabilityExplainableSuggestion({
    featureReport: {
      items: [
        {
          segmentId: "seg_1",
          repetitionIndex: 1,
          status: "ok",
          manualScoreOverride: 1,
          manualScoreSource: "curated_visual_fms_review",
          manualScoreReason:
            "FMS manual score-1 criteria apply: knee/elbow do not fully extend.",
          metrics: {
            timingVisibility: 0.9,
            sideVisibility: 0.9,
          },
        },
      ],
    },
    timingReport: {
      items: [
        {
          segmentId: "seg_1",
          status: "good",
          metrics: {
            coverageRatio: 1,
          },
        },
      ],
    },
  });

  assert.equal(suggestion.status, "ok");
  assert.equal(suggestion.summary.scoredSegments, 1);
  assert.equal(suggestion.summary.minSuggestedScore, 1);
  assert.equal(suggestion.items[0].status, "suggested");
  assert.equal(suggestion.items[0].totalScore, 1);
  assert.equal(suggestion.items[0].scoreBasis, "curated_visual_fms_review");
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("loss of balance"),
    ),
  );
  assert.ok(
    suggestion.items[0].reasons.some((reason) =>
      reason.includes("knee/elbow do not fully extend"),
    ),
  );
});
