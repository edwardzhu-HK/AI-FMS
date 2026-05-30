import assert from "node:assert/strict";
import test from "node:test";
import {
  exportVideoDataset,
  getVideoSegments,
  updateSegmentMetadata,
  uploadVideoAndCreateAnalysisJob,
} from "../src/api/mockCalibrationApi.js";

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

test("mock api deep squat scoring follows calibration expectation", async () => {
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
    [2, 2, 2, 2],
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
    [3, 3, 3, 3, 3, 3, 2],
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
    segments.items.every((segment) => segment.aiScore.totalScore === 3),
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
  assert.equal(result.segment.rubricVersion, "fms_v1.1_test");
  assert.equal(result.segment.segmentSource, "manual_adjusted");
  assert.equal(result.segment.originalStartSecond, target.startSecond);
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
