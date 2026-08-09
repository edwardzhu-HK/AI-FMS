import assert from "node:assert/strict";
import test from "node:test";
import {
  checkVideoReadiness,
  exportVideoDataset,
  getVideoSegments,
  ingestVideo,
  saveSegmentReview,
  updateSegmentMetadata,
  uploadVideoAndCreateAnalysisJob,
} from "../src/api/mockCalibrationApi.js";
import { createReviewerRawScore } from "../src/constants/scoring.js";

test("mock api respects expectedReps when creating segments", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "front.mp4",
    startSecond: 0,
    endSecond: 20,
    expectedReps: 3,
  });

  const segments = await getVideoSegments(created.videoId);
  assert.equal(segments.items.length, 3);
});

test("mock api uses smoother default segmentation heuristic", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "sample.mp4",
    startSecond: 0,
    endSecond: 42,
  });

  const segments = await getVideoSegments(created.videoId);
  assert.equal(segments.items.length, 7);
});

test("mock api infers expected reps from sample file names", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "5reps score 2.mp4",
    startSecond: 0,
    endSecond: 59.97,
  });

  const segments = await getVideoSegments(created.videoId);
  assert.equal(segments.items.length, 5);
  assert.deepEqual(
    segments.items.map((segment) => segment.attemptCondition),
    ["floor", "floor", "floor", "floor", "floor"],
  );
});

test("mock api creates slight overlap between adjacent segments", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "front.mp4",
    startSecond: 0,
    endSecond: 18,
    expectedReps: 3,
  });

  const segments = await getVideoSegments(created.videoId);
  assert.equal(segments.items.length, 3);

  const first = segments.items[0];
  const second = segments.items[1];

  assert.ok(first.endSecond > second.startSecond);
});

test("mock api infers front/side from notes mixed pattern", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "Sample-1.mp4",
    startSecond: 0,
    endSecond: 42,
    expectedReps: 7,
    notes: "前三个正面，后四个侧面",
  });

  const segments = await getVideoSegments(created.videoId);
  const views = segments.items.map((segment) => segment.cameraView);

  assert.deepEqual(views, [
    "front",
    "front",
    "front",
    "side",
    "side",
    "side",
    "side",
  ]);
});

test("mock api does not synthesize scores from file names", async () => {
  const sideCreated = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "side.mp4",
    startSecond: 0,
    endSecond: 26,
    expectedReps: 4,
  });

  const sideSegments = await getVideoSegments(sideCreated.videoId);
  assert.deepEqual(
    sideSegments.items.map((segment) => segment.aiScore.totalScore),
    [null, null, null, null],
  );

  const mixedCreated = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "Sample-1.mp4",
    startSecond: 1,
    endSecond: 45,
    expectedReps: 7,
  });
  const mixedSegments = await getVideoSegments(mixedCreated.videoId);
  assert.deepEqual(
    mixedSegments.items.map((segment) => segment.aiScore.totalScore),
    [null, null, null, null, null, null, null],
  );
  assert.ok(
    [...sideSegments.items, ...mixedSegments.items].every(
      (segment) => segment.aiScore.scoringStatus === "not_scored",
    ),
  );
});

test("mock api supports all FMS actions with actionType stored on segments", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "rotary_stability",
    fileName: "rotary.mp4",
    startSecond: 0,
    endSecond: 18,
    expectedReps: 3,
  });

  const segments = await getVideoSegments(created.videoId);
  assert.equal(segments.items.length, 3);
  assert.ok(
    segments.items.every(
      (segment) => segment.actionType === "rotary_stability",
    ),
  );
  assert.ok(
    segments.items.every(
      (segment) =>
        segment.aiScore.totalScore === null &&
        segment.aiScore.scoringStatus === "not_scored",
    ),
  );
});

test("mock api supports manual segment metadata correction", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "front.mp4",
    startSecond: 0,
    endSecond: 18,
    expectedReps: 3,
  });

  const segments = await getVideoSegments(created.videoId);
  const target = segments.items[0];

  const result = await updateSegmentMetadata({
    segmentId: target.segmentId,
    startSecond: "0.25",
    endSecond: "4.75",
    side: "bilateral",
    painFlag: true,
    clearingTest: "pass",
    rubricVersion: "fms_v1.1_test",
  });

  assert.equal(result.saved, true);
  assert.equal(result.segment.startSecond, 0.25);
  assert.equal(result.segment.endSecond, 4.75);
  assert.equal(result.segment.side, "bilateral");
  assert.equal(result.segment.painFlag, true);
  assert.equal(result.segment.clearingTest, "not_applicable");
  assert.deepEqual(result.segment.clearingFindings, []);
  assert.equal(result.segment.attemptCondition, "floor");
  assert.equal(result.segment.rubricVersion, "fms_v1.1_test");
  assert.equal(result.segment.segmentSource, "manual_adjusted");
  assert.equal(result.segment.originalStartSecond, target.startSecond);
});

test("mock api supports manual Deep Squat attempt condition correction", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "front.mp4",
    startSecond: 0,
    endSecond: 18,
    expectedReps: 3,
  });

  const segments = await getVideoSegments(created.videoId);
  const target = segments.items[1];

  const result = await updateSegmentMetadata({
    segmentId: target.segmentId,
    startSecond: target.startSecond,
    endSecond: target.endSecond,
    side: target.side,
    painFlag: false,
    clearingTest: "not_applicable",
    attemptCondition: "heels_elevated_board",
    rubricVersion: target.rubricVersion,
  });

  assert.equal(result.segment.attemptCondition, "heels_elevated_board");
});

test("mock api stores action-specific clearing findings", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "shoulder_mobility",
    fileName: "shoulder.mp4",
    startSecond: 0,
    endSecond: 12,
    expectedReps: 1,
  });
  const segments = await getVideoSegments(created.videoId);

  const result = await updateSegmentMetadata({
    segmentId: segments.items[0].segmentId,
    startSecond: 0.5,
    endSecond: 4.5,
    side: "right",
    painFlag: true,
    clearingFindings: [
      {
        key: "shoulder_clearing",
        result: "positive",
      },
    ],
    rubricVersion: "fms_v1.0",
  });

  assert.equal(result.segment.clearingTest, "fail");
  assert.deepEqual(result.segment.clearingFindings, [
    {
      key: "shoulder_clearing",
      label: "Shoulder Clearing",
      resultType: "positive_negative_pain",
      result: "positive",
      affectsRawScore: true,
    },
  ]);
});

test("mock api readiness requires clearing confirmation for clearing actions", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "shoulder_mobility",
    fileName: "shoulder.mp4",
    startSecond: 0,
    endSecond: 12,
    expectedReps: 1,
  });
  let segments = (await getVideoSegments(created.videoId)).items;
  const segment = segments[0];
  const score = createReviewerRawScore("shoulder_mobility", 3, {
    reviewerId: "coach",
  });

  await saveSegmentReview({
    segmentId: segment.segmentId,
    reviewerRole: "reviewer_a",
    reviewerId: "coach_a",
    score,
  });
  await saveSegmentReview({
    segmentId: segment.segmentId,
    reviewerRole: "reviewer_b",
    reviewerId: "coach_b",
    score,
  });

  const blockedReadiness = await checkVideoReadiness(created.videoId);

  assert.equal(blockedReadiness.completedSegmentsCount, 1);
  assert.equal(blockedReadiness.readyForIngest, false);
  assert.equal(blockedReadiness.clearingReadyForIngest, false);
  assert.equal(blockedReadiness.clearingBlockerCount, 1);

  await updateSegmentMetadata({
    segmentId: segment.segmentId,
    startSecond: segment.startSecond,
    endSecond: segment.endSecond,
    side: "right",
    painFlag: false,
    clearingFindings: [{ key: "shoulder_clearing", result: "negative" }],
    rubricVersion: segment.rubricVersion,
  });

  segments = (await getVideoSegments(created.videoId)).items;
  assert.equal(segments[0].clearingTest, "pass");

  const ready = await checkVideoReadiness(created.videoId);

  assert.equal(ready.readyForIngest, true);
  assert.equal(ready.clearingReadyForIngest, true);
  assert.equal(ready.clearingBlockerCount, 0);
});

test("mock api preserves reviewer score basis metadata", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "active_straight_leg_raise",
    fileName: "aslr.mp4",
    startSecond: 0,
    endSecond: 12,
    expectedReps: 1,
  });
  const segments = await getVideoSegments(created.videoId);

  await saveSegmentReview({
    segmentId: segments.items[0].segmentId,
    reviewerRole: "reviewer_a",
    reviewerId: "coach",
    score: createReviewerRawScore("active_straight_leg_raise", 2, {
      reviewerId: "coach",
      comment: "overall raw score",
    }),
  });

  const updatedSegments = await getVideoSegments(created.videoId);

  assert.equal(
    updatedSegments.items[0].reviewerScores.reviewer_a.scoreBasis,
    "scoresheet_like_raw_score",
  );
  assert.equal(
    updatedSegments.items[0].reviewerScores.reviewer_a.usesCriteriaScores,
    false,
  );
});

test("mock api ignores score-bearing file names for board detection", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "4reps score 2.mp4",
    startSecond: 0,
    endSecond: 279.3,
    expectedReps: 4,
  });
  const segments = (await getVideoSegments(created.videoId)).items;

  assert.deepEqual(
    segments.map((segment) => segment.attemptCondition),
    ["floor", "floor", "floor", "floor"],
  );
  assert.deepEqual(
    segments.map((segment) => segment.boardDetection?.status),
    ["unknown", "unknown", "unknown", "unknown"],
  );
  assert.deepEqual(
    segments.map((segment) => segment.boardDetection?.source),
    [
      "insufficient_visual_evidence",
      "insufficient_visual_evidence",
      "insufficient_visual_evidence",
      "insufficient_visual_evidence",
    ],
  );
});

test("mock api keeps temporarily unscored reviews out of completed readiness", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "front.mp4",
    startSecond: 0,
    endSecond: 18,
    expectedReps: 1,
  });
  const segment = (await getVideoSegments(created.videoId)).items[0];

  await saveSegmentReview({
    segmentId: segment.segmentId,
    reviewerRole: "reviewer_a",
    reviewerId: "coach_a",
    score: createReviewerRawScore("deep_squat", null, {
      reviewerId: "coach_a",
      scoringStatus: "not_scored",
      comment: "floor attempt below 3; wait for board attempt",
    }),
  });

  await saveSegmentReview({
    segmentId: segment.segmentId,
    reviewerRole: "reviewer_b",
    reviewerId: "coach_b",
    score: createReviewerRawScore("deep_squat", 2, {
      reviewerId: "coach_b",
    }),
  });

  const updatedSegments = await getVideoSegments(created.videoId);
  const readiness = await checkVideoReadiness(created.videoId);

  assert.equal(updatedSegments.items[0].reviewStatus, "partial");
  assert.equal(
    updatedSegments.items[0].reviewerScores.reviewer_a.scoringStatus,
    "not_scored",
  );
  assert.equal(readiness.completedSegmentsCount, 0);
  assert.equal(readiness.readyForIngest, false);
});

test("mock api ingests protocol-evidence-only deep squat batches", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "3reps.mp4",
    startSecond: 0,
    endSecond: 24.97,
    expectedReps: 3,
  });
  const segments = (await getVideoSegments(created.videoId)).items;

  for (const segment of segments) {
    for (const reviewerRole of ["reviewer_a", "reviewer_b"]) {
      await saveSegmentReview({
        segmentId: segment.segmentId,
        reviewerRole,
        reviewerId: reviewerRole,
        score: createReviewerRawScore("deep_squat", null, {
          reviewerId: reviewerRole,
          scoringStatus: "not_scored",
          comment: "floor attempt below 3; no board attempt in this clip",
        }),
      });
    }
  }

  const updatedSegments = (await getVideoSegments(created.videoId)).items;
  const readiness = await checkVideoReadiness(created.videoId);
  const ingest = await ingestVideo(created.videoId, "coach");

  assert.deepEqual(
    updatedSegments.map((segment) => segment.reviewStatus),
    ["protocol_evidence", "protocol_evidence", "protocol_evidence"],
  );
  assert.equal(readiness.completedSegmentsCount, 3);
  assert.equal(readiness.scoreableCompletedSegmentsCount, 0);
  assert.equal(readiness.protocolEvidenceSegmentsCount, 3);
  assert.equal(readiness.readyForIngest, true);
  assert.equal(ingest.segmentsValid, 0);
  assert.equal(ingest.segmentsInvalid, 0);
  assert.equal(ingest.segmentsProtocolEvidence, 3);
});

test("mock api allows deep squat floor attempts as protocol evidence for ingest", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "5reps score 2.mp4",
    startSecond: 0,
    endSecond: 60,
    expectedReps: 5,
    notes:
      "前三个 floor attempt 不作为最终评分；后两个脚跟垫高后完成良好，可给2分。",
  });
  const segments = (await getVideoSegments(created.videoId)).items;

  assert.equal(segments.length, 5);
  assert.deepEqual(
    segments.map((segment) => segment.attemptCondition),
    ["floor", "floor", "floor", "heels_elevated_board", "heels_elevated_board"],
  );

  for (const segment of segments.slice(0, 3)) {
    for (const reviewerRole of ["reviewer_a", "reviewer_b"]) {
      await saveSegmentReview({
        segmentId: segment.segmentId,
        reviewerRole,
        reviewerId: reviewerRole,
        score: createReviewerRawScore("deep_squat", null, {
          reviewerId: reviewerRole,
          scoringStatus: "not_scored",
          comment: "floor attempt is protocol evidence only",
        }),
      });
    }
  }

  for (const segment of segments.slice(3)) {
    for (const reviewerRole of ["reviewer_a", "reviewer_b"]) {
      await saveSegmentReview({
        segmentId: segment.segmentId,
        reviewerRole,
        reviewerId: reviewerRole,
        score: createReviewerRawScore("deep_squat", 2, {
          reviewerId: reviewerRole,
        }),
      });
    }
  }

  const updatedSegments = (await getVideoSegments(created.videoId)).items;
  const readiness = await checkVideoReadiness(created.videoId);
  const ingest = await ingestVideo(created.videoId, "coach");

  assert.deepEqual(
    updatedSegments.map((segment) => segment.reviewStatus),
    [
      "protocol_evidence",
      "protocol_evidence",
      "protocol_evidence",
      "completed",
      "completed",
    ],
  );
  assert.equal(readiness.completedSegmentsCount, 5);
  assert.equal(readiness.scoreableCompletedSegmentsCount, 2);
  assert.equal(readiness.protocolEvidenceSegmentsCount, 3);
  assert.equal(readiness.readyForIngest, true);
  assert.equal(ingest.segmentsValid, 2);
  assert.equal(ingest.segmentsInvalid, 0);
  assert.equal(ingest.segmentsProtocolEvidence, 3);
});

test("mock api preserves AI draft timing provenance", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "active_straight_leg_raise",
    fileName: "2 reps score 3.mp4",
    startSecond: 0,
    endSecond: 23.8,
    expectedReps: 2,
  });

  const segments = await getVideoSegments(created.videoId);

  const result = await updateSegmentMetadata({
    segmentId: segments.items[0].segmentId,
    startSecond: 4.35,
    endSecond: 10.85,
    side: "right",
    painFlag: false,
    clearingTest: "not_applicable",
    rubricVersion: "fms_v1.0",
    segmentSource: "ai_draft",
  });

  assert.equal(result.segment.segmentSource, "ai_draft");
  assert.equal(
    result.segment.originalStartSecond,
    segments.items[0].startSecond,
  );
});

test("mock api exports a dataset package with segment metadata", async () => {
  const created = await uploadVideoAndCreateAnalysisJob({
    actionType: "deep_squat",
    fileName: "side.mp4",
    startSecond: 0,
    endSecond: 12,
    expectedReps: 2,
    notes: "都是侧面",
  });

  const segments = await getVideoSegments(created.videoId);
  await updateSegmentMetadata({
    segmentId: segments.items[0].segmentId,
    startSecond: 0.1,
    endSecond: 5.9,
    side: "bilateral",
    painFlag: false,
    clearingTest: "not_applicable",
    rubricVersion: "fms_v1.0",
  });

  const exported = await exportVideoDataset(created.videoId);

  assert.equal(exported.schemaVersion, "ai_fms_dataset_v1_5_draft");
  assert.equal(exported.video.fileName, "side.mp4");
  assert.equal(exported.records.length, 2);
  assert.equal(exported.records[0].segmentSource, "manual_adjusted");
  assert.equal(exported.records[0].side, "bilateral");
  assert.equal(exported.records[0].labelStatus, "pending");
});
