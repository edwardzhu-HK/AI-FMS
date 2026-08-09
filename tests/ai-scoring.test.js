import assert from "node:assert/strict";
import test from "node:test";
import { createAIScoreForSegment } from "../src/lib/ai-scoring.js";

test("segment bootstrap never infers AI scores from labels in file names or notes", () => {
  const contexts = [
    {
      actionType: "deep_squat",
      fileName: "5reps score 2.mp4",
      notes: "最后两个2分",
    },
    {
      actionType: "hurdle_step",
      fileName: "first 3 score 3 then 1 score 1.mp4",
      notes: "reference score 3",
    },
    {
      actionType: "active_straight_leg_raise",
      fileName: "1 rep score 1.mp4",
      notes: "人工复核为1分",
    },
  ];

  for (const { actionType, ...context } of contexts) {
    const score = createAIScoreForSegment(actionType, context);

    assert.equal(score.totalScore, null);
    assert.equal(score.scoringStatus, "not_scored");
    assert.equal(score.scoreBasis, "pose_evidence_required");
    assert.equal(score.modelVersion, "unscored-segment-v1");
  }
});

test("Rotary Stability starts feature-only without a synthetic score", () => {
  const score = createAIScoreForSegment("rotary_stability", {
    fileName: "score 3.mp4",
  });

  assert.equal(score.totalScore, null);
  assert.equal(score.scoringStatus, "not_scored");
});
