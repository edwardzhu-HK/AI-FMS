import assert from "node:assert/strict";
import test from "node:test";
import {
  attachPoseEvidenceToDataset,
  buildDatasetExport,
} from "../src/lib/dataset-export.js";

function makeScore(totalScore) {
  return {
    totalScore,
    subscores: {
      depth: totalScore,
      kneeAlignment: totalScore,
      torsoControl: totalScore,
    },
    comment: "",
  };
}

test("dataset export preserves reviewer consensus and traceability fields", () => {
  const exported = buildDatasetExport(
    {
      videoId: "vid_1",
      actionType: "deep_squat",
      fileName: "sample.mp4",
      startSecond: 0,
      endSecond: 10,
      expectedReps: 1,
      notes: "front view",
    },
    [
      {
        segmentId: "seg_1",
        videoId: "vid_1",
        actionType: "deep_squat",
        repetitionIndex: 1,
        cameraView: "front",
        side: "bilateral",
        startSecond: 0.2,
        endSecond: 4.8,
        originalStartSecond: 0,
        originalEndSecond: 5,
        segmentSource: "manual_adjusted",
        painFlag: false,
        clearingTest: "not_applicable",
        clearingFindings: [],
        rubricVersion: "fms_v1.0",
        aiScore: makeScore(3),
        reviewerScores: {
          reviewer_a: makeScore(2),
          reviewer_b: makeScore(2),
        },
        reviewStatus: "completed",
      },
    ],
  );

  assert.equal(exported.schemaVersion, "ai_fms_dataset_v1_5_draft");
  assert.equal(exported.video.scoreScope, "rep_raw_score");
  assert.equal(exported.video.repPolicy.sidePolicy, "not_lateralized");
  assert.equal(exported.records[0].finalLabel.totalScore, 2);
  assert.equal(exported.records[0].scoreScope, "rep_raw_score");
  assert.equal(exported.records[0].scoreAggregation, "none");
  assert.equal(exported.records[0].repPolicy.clearingPolicy, "none");
  assert.equal(exported.records[0].sideSource, "reviewer_or_metadata");
  assert.deepEqual(exported.records[0].clearingFindings, []);
  assert.equal(exported.records[0].labelStatus, "valid");
  assert.equal(exported.records[0].adjudicationSource, "human_consensus");
  assert.equal(exported.records[0].segmentSource, "manual_adjusted");
  assert.equal(exported.records[0].originalStartSecond, 0);
  assert.deepEqual(exported.video.rubricCriteria[0], {
    genericKey: "depth",
    criterionKey: "deep_squat_depth",
    label: "Depth",
  });
  assert.equal(
    exported.records[0].rubricCriteria[1].criterionKey,
    "deep_squat_knee_alignment",
  );
  assert.equal(
    exported.records[0].aiSuggestion.criteriaScores[0].criterionKey,
    "deep_squat_depth",
  );
  assert.equal(
    exported.records[0].finalLabel.criteriaScores[0].criterionKey,
    "deep_squat_depth",
  );
  assert.equal(exported.records[0].reviewerA.scoreScope, "rep_raw_score");
  assert.equal(
    exported.records[0].reviewerA.scoreBasis,
    "scoresheet_like_raw_score",
  );
  assert.equal(exported.records[0].reviewerA.usesCriteriaScores, false);
});

test("attachPoseEvidenceToDataset adds lightweight pose-derived evidence", () => {
  const exported = buildDatasetExport(
    {
      videoId: "vid_1",
      actionType: "deep_squat",
      fileName: "sample.mp4",
      startSecond: 0,
      endSecond: 10,
      expectedReps: 1,
      notes: "",
    },
    [
      {
        segmentId: "seg_1",
        videoId: "vid_1",
        actionType: "deep_squat",
        repetitionIndex: 1,
        cameraView: "side",
        startSecond: 1,
        endSecond: 4,
        aiScore: makeScore(3),
        reviewerScores: {
          reviewer_a: null,
          reviewer_b: null,
        },
        reviewStatus: "pending",
      },
    ],
  );

  const augmented = attachPoseEvidenceToDataset(exported, {
    poseFileName: "sample.pose.json",
    poseSummary: {
      framesTotal: 42,
      framesWithPose: 42,
    },
    timingReport: {
      summary: {
        detectedCycles: 1,
      },
      items: [
        {
          segmentId: "seg_1",
          status: "good",
          label: "Timing looks complete",
          currentStartSecond: 1,
          currentEndSecond: 4,
          cycle: {
            startSecond: 1.1,
            endSecond: 3.9,
            lowestPointSecond: 2.4,
          },
          issues: [],
          metrics: {
            coverageRatio: 1,
          },
        },
      ],
    },
    featureReport: {
      summary: {
        usableRepetitions: 1,
      },
      items: [
        {
          segmentId: "seg_1",
          status: "ok",
          sourceSecond: 2.4,
          ratings: {
            torsoControl: {
              status: "watch",
              label: "forward lean watch",
            },
          },
          metrics: {
            side: "right",
            trunkLeanDegrees: 31.8,
          },
        },
      ],
    },
    suggestionReport: {
      summary: {
        minSuggestedScore: 2,
      },
      items: [
        {
          segmentId: "seg_1",
          status: "suggested",
          totalScore: 2,
          subscores: {
            depth: 3,
            kneeAlignment: 3,
            torsoControl: 2,
          },
          confidence: 0.88,
          confidenceLabel: "high",
          reasons: ["Torso control suggested 2: forward lean watch."],
          modelVersion: "pose-features-v0.1",
        },
      ],
    },
    implementedPoseActionTypes: ["deep_squat"],
    plannedActionTypes: ["deep_squat", "hurdle_step"],
  });

  assert.equal(
    augmented.poseEvidence.schemaVersion,
    "ai_fms_pose_evidence_v1_draft",
  );
  assert.equal(augmented.poseEvidence.poseFileName, "sample.pose.json");
  assert.deepEqual(augmented.poseEvidence.plannedActionTypes, [
    "deep_squat",
    "hurdle_step",
  ]);
  assert.equal(augmented.records[0].poseTiming.suggestedStartSecond, 1.1);
  assert.equal(
    augmented.records[0].poseFeatures.ratings.torsoControl.label,
    "forward lean watch",
  );
  assert.deepEqual(augmented.records[0].aiSideSuggestion, {
    source: "pose_features",
    side: "right",
    status: null,
    label: null,
    sourceSecond: 2.4,
  });
  assert.equal(augmented.records[0].sideSource, "ai_suggested");
  assert.equal(augmented.records[0].poseSuggestion.totalScore, 2);
  assert.deepEqual(augmented.records[0].poseSuggestion.criteriaScores, []);
});

test("dataset export includes action-specific clearing findings", () => {
  const exported = buildDatasetExport(
    {
      videoId: "vid_2",
      actionType: "in_line_lunge",
      fileName: "inline.mp4",
      startSecond: 0,
      endSecond: 12,
      expectedReps: 1,
      notes: "",
    },
    [
      {
        segmentId: "seg_2",
        videoId: "vid_2",
        actionType: "in_line_lunge",
        repetitionIndex: 1,
        cameraView: "front",
        side: "left",
        startSecond: 1,
        endSecond: 4,
        painFlag: false,
        clearingTest: "fail",
        clearingFindings: [
          {
            key: "ankle_clearing_pain",
            result: "positive",
          },
          {
            key: "ankle_clearing_mobility",
            result: "red",
          },
        ],
        aiScore: makeScore(2),
        reviewerScores: {
          reviewer_a: null,
          reviewer_b: null,
        },
        reviewStatus: "pending",
      },
    ],
  );

  assert.equal(
    exported.video.repPolicy.clearingPolicy,
    "ankle_pain_and_mobility",
  );
  assert.equal(exported.records[0].clearingTest, "fail");
  assert.deepEqual(exported.records[0].clearingFindings, [
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
      result: "red",
      affectsRawScore: false,
    },
  ]);
});
