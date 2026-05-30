import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDatasetPackageFiles,
  buildStoredZipBytes,
} from "../src/lib/dataset-package.js";

function createDataset() {
  return {
    schemaVersion: "ai_fms_dataset_v1_5_draft",
    generatedAt: "2026-05-23T00:00:00.000Z",
    video: {
      videoId: "vid_0001",
      actionType: "deep_squat",
      fileName: "Sample-1.mp4",
      startSecond: 1,
      endSecond: 45,
      expectedReps: 7,
      notes: "demo",
      scoreScope: "rep_raw_score",
      repPolicy: {
        scoringUnit: "rep",
        sidePolicy: "not_lateralized",
        clearingPolicy: "none",
        painPolicy: "human_observed_or_reported",
      },
      rubricCriteria: [
        {
          genericKey: "depth",
          criterionKey: "deep_squat_depth",
          label: "Depth",
        },
      ],
    },
    records: [
      {
        videoId: "vid_0001",
        segmentId: "seg_0001",
        actionType: "deep_squat",
        repetitionIndex: 1,
        scoreScope: "rep_raw_score",
        scoreAggregation: "none",
        cameraView: "front",
        side: "none",
        startSecond: 1,
        endSecond: 8.7,
        originalStartSecond: 1,
        originalEndSecond: 8.7,
        segmentSource: "suggested",
        painFlag: false,
        clearingTest: "not_applicable",
        rubricVersion: "fms_v1.0",
        aiSuggestion: { totalScore: 3 },
        reviewerA: null,
        reviewerB: null,
        finalLabel: null,
        labelStatus: "pending",
        adjudicationSource: "none",
        reviewStatus: "pending",
      },
    ],
  };
}

function createQualitySummary() {
  return {
    recordsTotal: 1,
    validLabels: 0,
    pendingLabels: 1,
    invalidLabels: 0,
    reviewerAgreementRate: null,
    aiMatchesFinalRate: null,
    poseEvidenceAttached: true,
    pose: {
      framesWithPose: 441,
      framesTotal: 441,
      timingGood: 1,
      timingTotal: 1,
      cycleCountQaStatus: "ok",
      expectedSegments: 1,
      candidateCycles: 1,
      assignedCycles: 1,
      featureUsable: 1,
      featureTotal: 1,
      suggestionReady: 1,
      suggestionTotal: 1,
    },
  };
}

test("buildDatasetPackageFiles creates application-ready export files", () => {
  const files = buildDatasetPackageFiles({
    dataset: createDataset(),
    qualitySummary: createQualitySummary(),
  });
  const fileNames = files.map((file) => file.fileName);

  assert.deepEqual(fileNames, [
    "dataset.json",
    "dataset.csv",
    "dataset_card.md",
    "run_summary.json",
    "README_export.md",
  ]);
  assert.match(
    files.find((file) => file.fileName === "dataset_card.md").contents,
    /not medical diagnosis|不是医疗诊断/,
  );
  assert.match(
    files.find((file) => file.fileName === "dataset_card.md").contents,
    /Rubric Criteria/,
  );
  assert.match(
    files.find((file) => file.fileName === "dataset_card.md").contents,
    /Score Scope/,
  );
  assert.match(
    files.find((file) => file.fileName === "dataset_card.md").contents,
    /rep\/segment 的 RAW SCORE/,
  );
  assert.match(
    files.find((file) => file.fileName === "dataset_card.md").contents,
    /scoresheet-like basis/,
  );
  assert.match(
    files.find((file) => file.fileName === "README_export.md").contents,
    /dataset\.json/,
  );
});

test("buildStoredZipBytes writes a valid stored zip container", () => {
  const zipBytes = buildStoredZipBytes([
    { fileName: "hello.txt", contents: "hello" },
  ]);

  assert.equal(zipBytes[0], 0x50);
  assert.equal(zipBytes[1], 0x4b);
  assert.equal(zipBytes[2], 0x03);
  assert.equal(zipBytes[3], 0x04);
  assert.ok(zipBytes.length > 22);
});
