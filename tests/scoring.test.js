import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultSegmentMetadata,
  deriveClearingTestFromFindings,
  createReviewerRawScore,
  createScoreFromSubscores,
  createScoreFromTotal,
  getActionRepPolicy,
  getActionRubricCriteria,
  getSubscoreItems,
  normalizeClearingFindings,
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

test("createReviewerRawScore marks human scores as scoresheet-like raw scores", () => {
  const score = createReviewerRawScore("shoulder_mobility", 2, {
    reviewerId: "coach",
    comment: "overall movement quality",
  });

  assert.equal(score.totalScore, 2);
  assert.equal(score.scoreScope, "rep_raw_score");
  assert.equal(score.scoreBasis, "scoresheet_like_raw_score");
  assert.equal(score.usesCriteriaScores, false);
  assert.equal(score.criteriaScores.length, 3);
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

test("getActionRepPolicy describes rep-level side and clearing semantics", () => {
  assert.deepEqual(getActionRepPolicy("active_straight_leg_raise"), {
    scoringUnit: "rep",
    scoreScope: "rep_raw_score",
    aggregationPolicy: "none_in_current_scope",
    sidePolicy: "left_right",
    expectedSideValues: ["left", "right"],
    defaultSide: "unknown",
    aiSideInference: "pose_supported",
    clearingPolicy: "none",
    clearingTests: [],
    painPolicy: "human_observed_or_reported",
  });

  assert.equal(
    getActionRepPolicy("shoulder_mobility").clearingTests[0].key,
    "shoulder_clearing",
  );
  assert.equal(
    getActionRepPolicy("in_line_lunge").clearingTests[1].resultType,
    "red_yellow_green",
  );
  assert.equal(
    getActionRepPolicy("trunk_stability_push_up").sidePolicy,
    "not_lateralized",
  );
});

test("createDefaultSegmentMetadata defaults lateralized actions to unknown side", () => {
  assert.equal(createDefaultSegmentMetadata("hurdle_step").side, "unknown");
  assert.equal(createDefaultSegmentMetadata("deep_squat").side, "none");
  assert.equal(
    createDefaultSegmentMetadata("deep_squat").attemptCondition,
    "floor",
  );
  assert.deepEqual(
    createDefaultSegmentMetadata("shoulder_mobility").clearingFindings,
    [
      {
        key: "shoulder_clearing",
        label: "Shoulder Clearing",
        resultType: "positive_negative_pain",
        result: "not_tested",
        affectsRawScore: true,
      },
    ],
  );
});

test("clearing findings normalize action-specific clearing details", () => {
  assert.deepEqual(
    normalizeClearingFindings("in_line_lunge", [
      {
        key: "ankle_clearing_pain",
        result: "positive",
      },
      {
        key: "ankle_clearing_mobility",
        result: "yellow",
      },
    ]),
    [
      {
        key: "ankle_clearing_pain",
        label: "Ankle Clearing - Pain",
        resultType: "positive_negative_pain",
        result: "positive",
        affectsRawScore: true,
      },
      {
        key: "ankle_clearing_mobility",
        label: "Ankle Clearing - Mobility",
        resultType: "red_yellow_green",
        result: "yellow",
        affectsRawScore: false,
      },
    ],
  );

  assert.equal(
    deriveClearingTestFromFindings("in_line_lunge", [
      {
        key: "ankle_clearing_pain",
        result: "positive",
      },
    ]),
    "fail",
  );
  assert.equal(
    deriveClearingTestFromFindings("shoulder_mobility", [
      {
        key: "shoulder_clearing",
        result: "negative",
      },
    ]),
    "pass",
  );
});
