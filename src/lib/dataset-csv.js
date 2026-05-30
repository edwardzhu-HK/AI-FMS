function formatCriteriaScores(criteriaScores = []) {
  return criteriaScores
    .map(
      (criterion) =>
        `${criterion.genericKey}:${criterion.criterionKey}:${criterion.label}:${criterion.score}`,
    )
    .join(";");
}

const CSV_COLUMNS = [
  ["video_id", (record) => record.videoId],
  ["segment_id", (record) => record.segmentId],
  ["action_type", (record) => record.actionType],
  ["repetition_index", (record) => record.repetitionIndex],
  ["score_scope", (record) => record.scoreScope],
  ["score_aggregation", (record) => record.scoreAggregation],
  ["side_policy", (record) => record.repPolicy?.sidePolicy],
  ["clearing_policy", (record) => record.repPolicy?.clearingPolicy],
  ["pain_policy", (record) => record.repPolicy?.painPolicy],
  ["camera_view", (record) => record.cameraView],
  ["side", (record) => record.side],
  ["side_source", (record) => record.sideSource],
  ["ai_inferred_side", (record) => record.aiSideSuggestion?.side],
  ["ai_side_confidence_status", (record) => record.aiSideSuggestion?.status],
  ["start_second", (record) => record.startSecond],
  ["end_second", (record) => record.endSecond],
  ["original_start_second", (record) => record.originalStartSecond],
  ["original_end_second", (record) => record.originalEndSecond],
  ["segment_source", (record) => record.segmentSource],
  ["pain_flag", (record) => record.painFlag],
  ["clearing_test", (record) => record.clearingTest],
  ["rubric_version", (record) => record.rubricVersion],
  [
    "rubric_criteria",
    (record) =>
      record.rubricCriteria
        ?.map(
          (criterion) =>
            `${criterion.genericKey}:${criterion.criterionKey}:${criterion.label}`,
        )
        .join(";") ?? "",
  ],
  ["ai_total", (record) => record.aiSuggestion?.totalScore],
  [
    "ai_criteria_scores",
    (record) => formatCriteriaScores(record.aiSuggestion?.criteriaScores),
  ],
  ["reviewer_a_total", (record) => record.reviewerA?.totalScore],
  [
    "reviewer_a_criteria_scores",
    (record) => formatCriteriaScores(record.reviewerA?.criteriaScores),
  ],
  ["reviewer_b_total", (record) => record.reviewerB?.totalScore],
  [
    "reviewer_b_criteria_scores",
    (record) => formatCriteriaScores(record.reviewerB?.criteriaScores),
  ],
  ["final_total", (record) => record.finalLabel?.totalScore],
  [
    "final_criteria_scores",
    (record) => formatCriteriaScores(record.finalLabel?.criteriaScores),
  ],
  ["label_status", (record) => record.labelStatus],
  ["adjudication_source", (record) => record.adjudicationSource],
  ["review_status", (record) => record.reviewStatus],
  ["pose_timing_status", (record) => record.poseTiming?.status],
  [
    "pose_suggested_start_second",
    (record) => record.poseTiming?.suggestedStartSecond,
  ],
  [
    "pose_suggested_end_second",
    (record) => record.poseTiming?.suggestedEndSecond,
  ],
  [
    "pose_lowest_point_second",
    (record) => record.poseTiming?.lowestPointSecond,
  ],
  [
    "pose_timing_coverage",
    (record) => record.poseTiming?.metrics?.coverageRatio,
  ],
  [
    "pose_timing_issues",
    (record) =>
      record.poseTiming?.issues?.map((issue) => issue.code).join(";") ?? "",
  ],
  [
    "pose_depth_status",
    (record) => record.poseFeatures?.ratings?.depth?.status,
  ],
  [
    "pose_torso_status",
    (record) => record.poseFeatures?.ratings?.torsoControl?.status,
  ],
  [
    "pose_knee_status",
    (record) => record.poseFeatures?.ratings?.kneeAlignment?.status,
  ],
  [
    "pose_peak_depth_ratio",
    (record) => record.poseFeatures?.metrics?.peakDepthRatio,
  ],
  [
    "pose_trunk_lean_degrees",
    (record) => record.poseFeatures?.metrics?.trunkLeanDegrees,
  ],
  [
    "pose_knee_ankle_offset",
    (record) => record.poseFeatures?.metrics?.maxKneeAnkleOffset,
  ],
  ["pose_suggestion_total", (record) => record.poseSuggestion?.totalScore],
  [
    "pose_suggestion_criteria_scores",
    (record) => formatCriteriaScores(record.poseSuggestion?.criteriaScores),
  ],
  ["pose_suggestion_confidence", (record) => record.poseSuggestion?.confidence],
  [
    "pose_suggestion_reasons",
    (record) => record.poseSuggestion?.reasons?.join(" | ") ?? "",
  ],
];

function formatCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function buildDatasetCsv(dataset) {
  const records = dataset?.records ?? [];
  const header = CSV_COLUMNS.map(([name]) => name).join(",");
  const rows = records.map((record) =>
    CSV_COLUMNS.map(([, getter]) => formatCsvValue(getter(record))).join(","),
  );

  return [header, ...rows].join("\n");
}
