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

const ACTION_RUBRIC_CRITERIA = {
  deep_squat: [
    { criterionKey: "deep_squat_depth", label: "Depth" },
    { criterionKey: "deep_squat_knee_alignment", label: "Knee Alignment" },
    { criterionKey: "deep_squat_torso_control", label: "Torso Control" },
  ],
  hurdle_step: [
    { criterionKey: "hurdle_step_hip_mobility", label: "Hip Mobility" },
    { criterionKey: "hurdle_step_balance_control", label: "Balance Control" },
    { criterionKey: "hurdle_step_knee_ankle_line", label: "Knee-ankle Line" },
  ],
  in_line_lunge: [
    { criterionKey: "in_line_lunge_depth", label: "Lunge Depth" },
    { criterionKey: "in_line_lunge_trunk_stability", label: "Trunk Stability" },
    {
      criterionKey: "in_line_lunge_foot_knee_alignment",
      label: "Foot-knee Alignment",
    },
  ],
  shoulder_mobility: [
    {
      criterionKey: "shoulder_mobility_reach_symmetry",
      label: "Reach Symmetry",
    },
    {
      criterionKey: "shoulder_mobility_thoracic_mobility",
      label: "Thoracic Mobility",
    },
    { criterionKey: "shoulder_mobility_compensation", label: "Compensation" },
  ],
  active_straight_leg_raise: [
    { criterionKey: "aslr_hip_flexion", label: "Hip Flexion" },
    { criterionKey: "aslr_pelvic_stability", label: "Pelvic Stability" },
    { criterionKey: "aslr_leg_symmetry", label: "Leg Symmetry" },
  ],
  trunk_stability_push_up: [
    { criterionKey: "trunk_push_up_core_stability", label: "Core Stability" },
    { criterionKey: "trunk_push_up_pattern", label: "Push-Up Pattern" },
    { criterionKey: "trunk_push_up_compensation", label: "Compensation" },
  ],
  rotary_stability: [
    {
      criterionKey: "rotary_stability_diagonal_control",
      label: "Diagonal Control",
    },
    {
      criterionKey: "rotary_stability_trunk_rotation",
      label: "Trunk Rotation",
    },
    {
      criterionKey: "rotary_stability_balance_stability",
      label: "Balance Stability",
    },
  ],
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

export function createDefaultSegmentMetadata() {
  return {
    side: "none",
    painFlag: false,
    clearingTest: "not_applicable",
    rubricVersion: DEFAULT_RUBRIC_VERSION,
  };
}

export function deriveTotalScore(subscores) {
  const scores = Object.values(subscores ?? {}).filter(
    (score) => typeof score === "number" && Number.isFinite(score),
  );

  return scores.length > 0 ? Math.min(...scores) : null;
}

export function getActionRubricCriteria(actionType) {
  const criteria =
    ACTION_RUBRIC_CRITERIA[actionType] ?? ACTION_RUBRIC_CRITERIA.deep_squat;

  return CRITERIA_KEYS.map((genericKey, index) => ({
    genericKey,
    ...criteria[index],
  }));
}

export function createCriteriaScoresFromSubscores(actionType, subscores = {}) {
  return getActionRubricCriteria(actionType).map((criterion) => ({
    ...criterion,
    score: subscores?.[criterion.genericKey] ?? null,
  }));
}

export function criteriaScoresToSubscores(criteriaScores = []) {
  return criteriaScores.reduce((subscores, criterion) => {
    if (criterion.genericKey) {
      subscores[criterion.genericKey] = criterion.score;
    }

    return subscores;
  }, {});
}

export function deriveTotalScoreFromCriteriaScores(criteriaScores = []) {
  const scores = criteriaScores
    .map((criterion) => criterion.score)
    .filter((score) => typeof score === "number" && Number.isFinite(score));

  return scores.length > 0 ? Math.min(...scores) : null;
}

export function createScoreFromSubscores(actionType, subscores, extra = {}) {
  const criteriaScores = createCriteriaScoresFromSubscores(
    actionType,
    subscores,
  );
  const totalScore = deriveTotalScoreFromCriteriaScores(criteriaScores);

  return {
    ...extra,
    totalScore,
    subscores: criteriaScoresToSubscores(criteriaScores),
    criteriaScores,
  };
}

export function createScoreFromTotal(actionType, totalScore, extra = {}) {
  const subscores = Object.fromEntries(
    CRITERIA_KEYS.map((key) => [key, totalScore]),
  );

  return createScoreFromSubscores(actionType, subscores, extra);
}

export function normalizeScoreForAction(score, actionType) {
  if (!score) {
    return null;
  }

  const criteriaScores =
    Array.isArray(score.criteriaScores) && score.criteriaScores.length > 0
      ? score.criteriaScores
      : createCriteriaScoresFromSubscores(actionType, score.subscores ?? {});
  const subscores =
    score.subscores ?? criteriaScoresToSubscores(criteriaScores);
  const totalScore =
    score.totalScore ??
    deriveTotalScoreFromCriteriaScores(criteriaScores) ??
    deriveTotalScore(subscores);

  return {
    ...score,
    totalScore,
    subscores,
    criteriaScores,
  };
}

export function createEmptyScore(actionType = "deep_squat") {
  return {
    ...createScoreFromTotal(actionType, 3),
    comment: "",
  };
}

export function getSubscoreItems(actionType) {
  return getActionRubricCriteria(actionType).map((criterion) => ({
    key: criterion.genericKey,
    criterionKey: criterion.criterionKey,
    label: criterion.label,
  }));
}
