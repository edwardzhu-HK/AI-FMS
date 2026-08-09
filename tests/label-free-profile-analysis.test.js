import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeLabelFreeProfiles,
  summarizeConsensusOverlay,
} from "../src/lib/label-free-profile-analysis.js";

function row(index, group, ready = true) {
  const baseline = group === "a" ? 0 : 10;
  return {
    repetitionId: `rep_${String(index).padStart(2, "0")}`,
    videoId: `video_${group}`,
    actionType: "deep_squat",
    researchTier: "expansion_candidate",
    featureReady: ready,
    features: {
      movementA: baseline + index * 0.05,
      movementB: baseline + index * 0.1,
      avgVisibility: group === "a" ? 0.2 : 0.99,
    },
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
  },
};

test("label-free profile analysis separates source signatures without using quality fields", () => {
  const rows = [
    ...[0, 1, 2, 3].map((index) => row(index, "a")),
    ...[4, 5, 6, 7].map((index) => row(index, "b")),
    row(8, "c", false),
  ];

  const result = analyzeLabelFreeProfiles({ rows, featureContract });
  const action = result.actions.deep_squat;

  assert.equal(result.inputCount, 9);
  assert.equal(result.featureReadyCount, 8);
  assert.equal(result.historicalScoresUsed, false);
  assert.equal(result.qualityFeaturesUsedInDistance, false);
  assert.deepEqual(action.featureNames, ["movementA", "movementB"]);
  assert.equal(action.groupCount, 2);
  assert.equal(
    action.sourceVideoEffect.heuristicFlag,
    "strong_source_video_signature",
  );
  assert.equal(
    action.leaveOneVideoOut.status,
    "not_estimable_fewer_than_three_source_videos",
  );
  assert.ok(action.meanSilhouette > 0.5);
  assert.ok(
    Object.values(action.groups).every(
      (groupSummary) => groupSummary.sourceConcentrationFlag,
    ),
  );
});

test("label-free profile assignments are deterministic", () => {
  const rows = [
    ...[0, 1, 2, 3].map((index) => row(index, "a")),
    ...[4, 5, 6, 7].map((index) => row(index, "b")),
  ];
  const first = analyzeLabelFreeProfiles({ rows, featureContract });
  const second = analyzeLabelFreeProfiles({ rows, featureContract });

  assert.deepEqual(
    first.actions.deep_squat.assignments.map((assignment) => [
      assignment.repetitionId,
      assignment.profileGroup,
      assignment.medoidId,
    ]),
    second.actions.deep_squat.assignments.map((assignment) => [
      assignment.repetitionId,
      assignment.profileGroup,
      assignment.medoidId,
    ]),
  );
});

test("consensus scores are overlaid only after label-free groups are frozen", () => {
  const rows = [
    ...[0, 1, 2, 3].map((index) => row(index, "a")),
    ...[4, 5, 6, 7].map((index) => row(index, "b")),
  ];
  const analysis = analyzeLabelFreeProfiles({ rows, featureContract });
  const comparisonRows = rows.map((item) => ({
    repetitionId: item.repetitionId,
    leftStatus: "scored",
    rightStatus: "scored",
    leftScore: 2,
    rightScore: 2,
  }));

  const overlay = summarizeConsensusOverlay({ analysis, comparisonRows });

  assert.equal(analysis.roundAConsensusUsed, false);
  assert.equal(overlay.groupingUsedConsensusScores, false);
  assert.equal(overlay.consensusCount, 8);
  assert.equal(overlay.scoreStrataCount, 1);
  assert.equal(overlay.multiProfileScoreStrataCount, 1);
  assert.equal(overlay.scoreStrata[0].profileGroupCount, 2);
});
