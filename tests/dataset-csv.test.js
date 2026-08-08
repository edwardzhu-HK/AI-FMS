import assert from "node:assert/strict";
import test from "node:test";
import { buildDatasetCsv } from "../src/lib/dataset-csv.js";

test("buildDatasetCsv flattens dataset records with pose evidence", () => {
  const csv = buildDatasetCsv({
    records: [
      {
        videoId: "vid_1",
        segmentId: "seg_1",
        actionType: "deep_squat",
        movementCapability: {
          posePipelineStatus: "implemented",
          aiScoringStatus: "pose_based_ai_suggestion",
        },
        poseEvidenceGate: {
          status: "ready",
          reasonCode: "ready",
        },
        repetitionIndex: 1,
        scoreScope: "rep_raw_score",
        scoreAggregation: "none",
        repPolicy: {
          sidePolicy: "not_lateralized",
          clearingPolicy: "none",
          painPolicy: "human_observed_or_reported",
        },
        cameraView: "side",
        side: "bilateral",
        sideSource: "reviewer_or_metadata",
        attemptCondition: "heels_elevated_board",
        boardDetection: {
          status: "detected",
          source: "segment_metadata",
          confidence: 0.96,
          reasonCodes: ["segment_attempt_condition_heels_elevated_board"],
        },
        aiSideSuggestion: {
          side: "right",
          status: "suggested",
          confidence: 0.91,
          confidenceStatus: "good",
          matchesReviewerSide: false,
          reasonCode: "pose_side_detected",
          evidence: {
            metricSide: "right",
            sideVisibility: 0.92,
          },
        },
        startSecond: 1,
        endSecond: 4,
        originalStartSecond: 0.8,
        originalEndSecond: 4.2,
        segmentSource: "manual_adjusted",
        painFlag: false,
        clearingTest: "not_applicable",
        clearingFindings: [
          {
            key: "shoulder_clearing",
            resultType: "positive_negative_pain",
            result: "negative",
          },
        ],
        rubricVersion: "fms_v1.0",
        rubricCriteria: [
          {
            genericKey: "depth",
            criterionKey: "deep_squat_depth",
            label: "Depth",
          },
        ],
        aiSuggestion: {
          totalScore: 3,
          criteriaScores: [
            {
              genericKey: "depth",
              criterionKey: "deep_squat_depth",
              label: "Depth",
              score: 3,
            },
          ],
        },
        reviewerA: {
          totalScore: 2,
          scoreScope: "rep_raw_score",
          scoreBasis: "scoresheet_like_raw_score",
          usesCriteriaScores: false,
          criteriaScores: [
            {
              genericKey: "depth",
              criterionKey: "deep_squat_depth",
              label: "Depth",
              score: 2,
            },
          ],
        },
        reviewerB: {
          totalScore: 2,
        },
        finalLabel: {
          totalScore: 2,
          criteriaScores: [
            {
              genericKey: "depth",
              criterionKey: "deep_squat_depth",
              label: "Depth",
              score: 2,
            },
          ],
        },
        labelStatus: "valid",
        adjudicationSource: "human_consensus",
        reviewStatus: "completed",
        poseTiming: {
          status: "good",
          suggestedStartSecond: 1.1,
          suggestedEndSecond: 3.9,
          lowestPointSecond: 2.4,
          metrics: {
            coverageRatio: 1,
          },
          issues: [],
        },
        poseFeatures: {
          ratings: {
            depth: {
              status: "good",
            },
            torsoControl: {
              status: "watch",
            },
            kneeAlignment: {
              status: "not_applicable",
            },
          },
          metrics: {
            peakDepthRatio: 0.6,
            trunkLeanDegrees: 31.8,
            maxKneeAnkleOffset: 0.035,
          },
        },
        poseSuggestion: {
          totalScore: 2,
          criteriaScores: [
            {
              genericKey: "torsoControl",
              criterionKey: "deep_squat_torso_control",
              label: "Torso Control",
              score: 2,
            },
          ],
          confidence: 0.88,
          reasons: ["Torso, reason", "Needs review"],
        },
      },
    ],
  });

  const lines = csv.split("\n");
  assert.ok(lines[0].includes("pose_suggestion_reasons"));
  assert.ok(lines[0].includes("rubric_criteria"));
  assert.ok(lines[0].includes("ai_criteria_scores"));
  assert.ok(lines[0].includes("score_scope"));
  assert.ok(lines[0].includes("side_policy"));
  assert.ok(lines[0].includes("ai_inferred_side"));
  assert.ok(lines[0].includes("ai_side_status"));
  assert.ok(lines[0].includes("ai_side_confidence"));
  assert.ok(lines[0].includes("ai_side_matches_reviewer"));
  assert.ok(lines[0].includes("ai_side_evidence"));
  assert.ok(lines[0].includes("attempt_condition"));
  assert.ok(lines[0].includes("board_detection_status"));
  assert.ok(lines[0].includes("board_detection_source"));
  assert.ok(lines[0].includes("pose_pipeline_status"));
  assert.ok(lines[0].includes("pose_evidence_gate_status"));
  assert.ok(lines[0].includes("clearing_findings"));
  assert.ok(lines[0].includes("reviewer_a_score_basis"));
  assert.ok(lines[0].includes("pose_suggestion_criteria_scores"));
  assert.ok(lines[1].includes("seg_1"));
  assert.ok(lines[1].includes("rep_raw_score"));
  assert.ok(lines[1].includes("not_lateralized"));
  assert.ok(lines[1].includes("right"));
  assert.ok(lines[1].includes("heels_elevated_board"));
  assert.ok(lines[1].includes("segment_metadata"));
  assert.ok(lines[1].includes("0.96"));
  assert.ok(lines[1].includes("suggested"));
  assert.ok(lines[1].includes("0.91"));
  assert.ok(lines[1].includes("false"));
  assert.ok(lines[1].includes('"{""metricSide"":""right""'));
  assert.ok(lines[1].includes("implemented"));
  assert.ok(lines[1].includes("pose_based_ai_suggestion"));
  assert.ok(
    lines[1].includes("shoulder_clearing:positive_negative_pain:negative"),
  );
  assert.ok(lines[1].includes("scoresheet_like_raw_score"));
  assert.ok(lines[1].includes("depth:deep_squat_depth:Depth"));
  assert.ok(
    lines[1].includes("torsoControl:deep_squat_torso_control:Torso Control:2"),
  );
  assert.ok(lines[1].includes("watch"));
  assert.ok(lines[1].includes('"Torso, reason | Needs review"'));
});
