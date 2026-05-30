import assert from "node:assert/strict";
import test from "node:test";
import {
  getActionRubricCriteria,
  getSubscoreItems,
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
