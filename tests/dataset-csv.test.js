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
        repetitionIndex: 1,
        cameraView: "side",
        side: "bilateral",
        startSecond: 1,
        endSecond: 4,
        originalStartSecond: 0.8,
        originalEndSecond: 4.2,
        segmentSource: "manual_adjusted",
        painFlag: false,
        clearingTest: "not_applicable",
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
        },
        reviewerA: {
          totalScore: 2,
        },
        reviewerB: {
          totalScore: 2,
        },
        finalLabel: {
          totalScore: 2,
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
          confidence: 0.88,
          reasons: ["Torso, reason", "Needs review"],
        },
      },
    ],
  });

  const lines = csv.split("\n");
  assert.ok(lines[0].includes("pose_suggestion_reasons"));
  assert.ok(lines[0].includes("rubric_criteria"));
  assert.ok(lines[1].includes("seg_1"));
  assert.ok(lines[1].includes("depth:deep_squat_depth:Depth"));
  assert.ok(lines[1].includes("watch"));
  assert.ok(lines[1].includes('"Torso, reason | Needs review"'));
});
