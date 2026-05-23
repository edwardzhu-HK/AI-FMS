export const ACTIONS = [
  {
    id: "deep_squat",
    displayName: "Deep Squat",
    enabled: true,
    phase: "v1",
  },
  {
    id: "hurdle_step",
    displayName: "Hurdle Step",
    enabled: true,
    phase: "v1",
  },
  {
    id: "in_line_lunge",
    displayName: "In-Line Lunge",
    enabled: true,
    phase: "v1",
  },
  {
    id: "shoulder_mobility",
    displayName: "Shoulder Mobility",
    enabled: true,
    phase: "v1",
  },
  {
    id: "active_straight_leg_raise",
    displayName: "Active Straight Leg Raise",
    enabled: true,
    phase: "v1",
  },
  {
    id: "trunk_stability_push_up",
    displayName: "Trunk Stability Push-Up",
    enabled: true,
    phase: "v1",
  },
  {
    id: "rotary_stability",
    displayName: "Rotary Stability",
    enabled: true,
    phase: "v1",
  },
];

const CRITERIA_KEYS = ["depth", "kneeAlignment", "torsoControl"];

const ACTION_SUBSCORE_LABELS = {
  deep_squat: ["Depth", "Knee Alignment", "Torso Control"],
  hurdle_step: ["Hip Mobility", "Balance Control", "Knee-ankle Line"],
  in_line_lunge: ["Lunge Depth", "Trunk Stability", "Foot-knee Alignment"],
  shoulder_mobility: ["Reach Symmetry", "Thoracic Mobility", "Compensation"],
  active_straight_leg_raise: [
    "Hip Flexion",
    "Pelvic Stability",
    "Leg Symmetry",
  ],
  trunk_stability_push_up: [
    "Core Stability",
    "Push-Up Pattern",
    "Compensation",
  ],
  rotary_stability: ["Diagonal Control", "Trunk Rotation", "Balance Stability"],
};

export const CAMERA_VIEWS = ["front", "side"];
export const SCORE_VALUES = [0, 1, 2, 3];
export const SEGMENT_SIDES = ["none", "left", "right", "bilateral", "unknown"];
export const CLEARING_TEST_OPTIONS = [
  "not_applicable",
  "pass",
  "fail",
  "unknown",
];
export const DEFAULT_RUBRIC_VERSION = "fms_v1.0";

export function createEmptyScore() {
  return {
    totalScore: 3,
    subscores: {
      depth: 3,
      kneeAlignment: 3,
      torsoControl: 3,
    },
    comment: "",
  };
}

export function createDefaultSegmentMetadata() {
  return {
    side: "none",
    painFlag: false,
    clearingTest: "not_applicable",
    rubricVersion: DEFAULT_RUBRIC_VERSION,
  };
}

export function deriveTotalScore(subscores) {
  return Math.min(...Object.values(subscores));
}

export function getSubscoreItems(actionType) {
  const labels =
    ACTION_SUBSCORE_LABELS[actionType] ?? ACTION_SUBSCORE_LABELS.deep_squat;
  return CRITERIA_KEYS.map((key, index) => ({
    key,
    label: labels[index],
  }));
}
