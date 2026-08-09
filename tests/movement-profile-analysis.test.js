import assert from "node:assert/strict";
import test from "node:test";
import { summarizeMovementProfiles } from "../src/lib/movement-profile-analysis.js";

function comparisonRow(repetitionId, score, actionType = "deep_squat") {
  return {
    repetitionId,
    ingestId: `ing_${repetitionId}`,
    actionType,
    leftReviewerId: "Ronnie",
    leftStatus: "scored",
    leftScore: score,
    leftConfidence: "high",
    rightReviewerId: "Other Reviewer",
    rightStatus: "scored",
    rightScore: score,
    rightConfidence: "medium",
  };
}

function featureRow({
  repetitionId,
  videoId,
  movementA,
  movementB,
  visibility,
  actionType = "deep_squat",
}) {
  return {
    repetitionId,
    ingestId: `ing_${repetitionId}`,
    videoId,
    actionType,
    repetitionIndex: 1,
    cameraView: "side",
    side: "right",
    startSecond: 1,
    endSecond: 2,
    poseSha256: `sha_${repetitionId}`,
    poseModel: { name: "test" },
    featureContractVersion: "test-v1",
    featureSourceSecond: 1.5,
    features: {
      movementA,
      movementB,
      avgVisibility: visibility,
    },
    qualifiers: {},
    ratings: {},
    quality: { analysisReadiness: "ready" },
  };
}

const featureContract = {
  actions: {
    deep_squat: {
      features: [
        { name: "movementA", unit: "degrees", direction: "higher" },
        { name: "movementB", unit: "ratio", direction: "lower" },
        {
          name: "avgVisibility",
          unit: "ratio_0_1",
          direction: "higher",
        },
      ],
    },
    rotary_stability: {
      features: [
        { name: "movementA", unit: "degrees", direction: "higher" },
        { name: "movementB", unit: "ratio", direction: "lower" },
      ],
    },
  },
};

test("movement profiles keep consensus rows and prefer cross-video candidates", () => {
  const agreement = {
    analysis: {
      pilotId: "pilot",
      studyRound: "round_a",
      reviewers: ["Ronnie", "Other Reviewer"],
      comparisonRows: [
        comparisonRow("rep_1", 2),
        comparisonRow("rep_2", 2),
        comparisonRow("rep_3", 2),
        comparisonRow("rep_4", 3),
        {
          ...comparisonRow("rep_5", 3),
          rightScore: 2,
        },
      ],
    },
  };
  const featureMatrix = {
    rows: [
      featureRow({
        repetitionId: "rep_1",
        videoId: "video_a",
        movementA: 0,
        movementB: 0,
        visibility: 0.99,
      }),
      featureRow({
        repetitionId: "rep_2",
        videoId: "video_a",
        movementA: 100,
        movementB: 100,
        visibility: 0.1,
      }),
      featureRow({
        repetitionId: "rep_3",
        videoId: "video_b",
        movementA: 1,
        movementB: 1,
        visibility: 0.5,
      }),
      featureRow({
        repetitionId: "rep_4",
        videoId: "video_c",
        movementA: 50,
        movementB: 50,
        visibility: 0.8,
      }),
      featureRow({
        repetitionId: "rep_5",
        videoId: "video_d",
        movementA: 50,
        movementB: 50,
        visibility: 0.8,
      }),
    ],
  };

  const result = summarizeMovementProfiles({
    agreement,
    featureMatrix,
    featureContract,
  });

  assert.equal(result.consensusCount, 4);
  assert.equal(result.featureReadyCount, 4);
  assert.equal(result.byAction.deep_squat.scoreGroups[2].count, 3);
  assert.equal(
    result.byAction.deep_squat.featureDefinitions.avgVisibility.role,
    "quality",
  );
  const candidate = result.byAction.deep_squat.caseStudyCandidates.find(
    (row) => row.score === 2,
  );
  assert.equal(candidate.crossVideoPreferred, true);
  assert.equal(candidate.sameVideoLimitation, false);
  assert.ok(
    candidate.topDifferences.every(
      (difference) => difference.featureName !== "avgVisibility",
    ),
  );
});

test("same-video candidate limitation is explicit when no other source exists", () => {
  const agreement = {
    analysis: {
      pilotId: "pilot",
      studyRound: "round_a",
      reviewers: ["Ronnie", "Other Reviewer"],
      comparisonRows: [
        comparisonRow("rep_1", 1, "rotary_stability"),
        comparisonRow("rep_2", 1, "rotary_stability"),
      ],
    },
  };
  const featureMatrix = {
    rows: [
      featureRow({
        repetitionId: "rep_1",
        videoId: "video_a",
        movementA: 0,
        movementB: 0,
        visibility: 1,
        actionType: "rotary_stability",
      }),
      featureRow({
        repetitionId: "rep_2",
        videoId: "video_a",
        movementA: 1,
        movementB: 2,
        visibility: 1,
        actionType: "rotary_stability",
      }),
    ],
  };

  const result = summarizeMovementProfiles({
    agreement,
    featureMatrix,
    featureContract,
  });
  const candidate = result.byAction.rotary_stability.caseStudyCandidates[0];

  assert.equal(candidate.crossVideoPreferred, false);
  assert.equal(candidate.sameVideoLimitation, true);
});

test("movement profile analysis fails when consensus evidence has no feature row", () => {
  assert.throws(
    () =>
      summarizeMovementProfiles({
        agreement: {
          analysis: {
            pilotId: "pilot",
            studyRound: "round_a",
            reviewers: ["Ronnie", "Other Reviewer"],
            comparisonRows: [comparisonRow("rep_missing", 2)],
          },
        },
        featureMatrix: { rows: [] },
        featureContract,
      }),
    /feature matrix is missing rep_missing/,
  );
});
