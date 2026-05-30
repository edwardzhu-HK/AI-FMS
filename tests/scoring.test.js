import assert from "node:assert/strict";
import test from "node:test";
import {
  createScoreFromSubscores,
  createScoreFromTotal,
  getActionRubricCriteria,
  getSubscoreItems,
  normalizeScoreForAction,
} from "../src/constants/scoring.js";

test("getActionRubricCriteria maps compatible fields to movement-specific criteria", () => {
  assert.deepEqual(getActionRubricCriteria("active_straight_leg_raise"), [
    {
      genericKey: "depth",
      criterionKey: "aslr_hip_flexion",
      label: "Hip Flexion",
    },
    {
      genericKey: "kneeAlignment",
      criterionKey: "aslr_pelvic_stability",
      label: "Pelvic Stability",
    },
    {
      genericKey: "torsoControl",
      criterionKey: "aslr_leg_symmetry",
      label: "Leg Symmetry",
    },
  ]);
});

test("getSubscoreItems preserves UI-compatible subscore keys", () => {
  assert.deepEqual(getSubscoreItems("in_line_lunge"), [
    {
      key: "depth",
      criterionKey: "in_line_lunge_depth",
      label: "Lunge Depth",
    },
    {
      key: "kneeAlignment",
      criterionKey: "in_line_lunge_trunk_stability",
      label: "Trunk Stability",
    },
    {
      key: "torsoControl",
      criterionKey: "in_line_lunge_foot_knee_alignment",
      label: "Foot-knee Alignment",
    },
  ]);
});

test("createScoreFromSubscores creates flexible criteriaScores alongside legacy subscores", () => {
  const score = createScoreFromSubscores("hurdle_step", {
    depth: 3,
    kneeAlignment: 2,
    torsoControl: 3,
  });

  assert.equal(score.totalScore, 2);
  assert.deepEqual(score.subscores, {
    depth: 3,
    kneeAlignment: 2,
    torsoControl: 3,
  });
  assert.deepEqual(score.criteriaScores[1], {
    genericKey: "kneeAlignment",
    criterionKey: "hurdle_step_balance_control",
    label: "Balance Control",
    score: 2,
  });
});

test("createScoreFromTotal supports reviewer total-only scoring during migration", () => {
  const score = createScoreFromTotal("rotary_stability", 1, {
    reviewerId: "coach",
  });

  assert.equal(score.totalScore, 1);
  assert.equal(score.reviewerId, "coach");
  assert.equal(score.criteriaScores.length, 3);
  assert.equal(
    score.criteriaScores[0].criterionKey,
    "rotary_stability_diagonal_control",
  );
});

test("normalizeScoreForAction backfills criteriaScores for legacy scores", () => {
  const score = normalizeScoreForAction(
    {
      totalScore: 2,
      subscores: {
        depth: 2,
        kneeAlignment: 3,
        torsoControl: 2,
      },
    },
    "active_straight_leg_raise",
  );

  assert.equal(score.criteriaScores[0].criterionKey, "aslr_hip_flexion");
  assert.equal(score.criteriaScores[0].score, 2);
});
