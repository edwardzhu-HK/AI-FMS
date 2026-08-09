import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeakageFreeAiSuggestions,
  summarizeAiConsensusEvidence,
} from "../src/lib/round-a-ai-consensus-analysis.js";

function aslrFeatureRow() {
  return {
    repetitionId: "rep_aslr",
    ingestId: "ing_aslr",
    videoId: "vid_aslr",
    actionType: "active_straight_leg_raise",
    repetitionIndex: 1,
    cameraView: "side",
    side: "left",
    startSecond: 1,
    endSecond: 2,
    features: {
      avgVisibility: 0.95,
      timingCoverageRatio: 1,
    },
    qualifiers: {},
    ratings: {
      activeLegRaise: "good",
      kneeExtension: "good",
      stationaryLegControl: "good",
      pelvicStability: "good",
      sideConfidence: "good",
    },
    quality: {
      analysisReadiness: "ready",
      reasons: [],
      featureStatus: "ok",
      timingStatus: "good",
      timingCoverageRatio: 1,
    },
  };
}

function deepSquatFeatureRow() {
  return {
    repetitionId: "rep_deep",
    ingestId: "ing_deep",
    videoId: "vid_deep",
    actionType: "deep_squat",
    repetitionIndex: 1,
    cameraView: "side",
    side: "none",
    startSecond: 1,
    endSecond: 2,
    features: { avgVisibility: 0.95, timingCoverageRatio: 1 },
    qualifiers: {},
    ratings: {
      depth: "good",
      torsoControl: "good",
      kneeAlignment: "not_applicable",
      hipAngle: "good",
      kneeAngle: "good",
      ankleAngle: "good",
    },
    quality: {
      analysisReadiness: "ready",
      reasons: [],
      featureStatus: "ok",
      timingStatus: "good",
      timingCoverageRatio: 1,
    },
  };
}

function deepSquatWatchFeatureRow() {
  return {
    ...deepSquatFeatureRow(),
    ratings: {
      ...deepSquatFeatureRow().ratings,
      depth: "watch",
    },
  };
}

function agreementRow(repetitionId, actionType, score) {
  return {
    repetitionId,
    actionType,
    leftReviewerId: "Ronnie",
    rightReviewerId: "Other Reviewer",
    leftStatus: "scored",
    rightStatus: "scored",
    leftScore: score,
    rightScore: score,
  };
}

test("leakage-free suggestions ignore score-bearing canonical fields", () => {
  const featureMatrix = { rows: [aslrFeatureRow()] };
  const clean = buildLeakageFreeAiSuggestions({
    featureMatrix,
    canonical: {
      repetitions: [{ repetitionId: "rep_aslr", attemptCondition: null }],
    },
  });
  const contaminated = buildLeakageFreeAiSuggestions({
    featureMatrix,
    canonical: {
      repetitions: [
        {
          repetitionId: "rep_aslr",
          attemptCondition: null,
          videoFileName: "score 1.mp4",
          humanReviewSummary: { consensusScore: 1 },
          legacyAiSuggestion: { totalScore: 1 },
        },
      ],
    },
  });

  assert.deepEqual(contaminated, clean);
  assert.equal(clean.rows[0].aiSuggestedScore, 3);
  assert.equal(clean.rows[0].comparisonEligible, true);
});

test("protocol metadata reaches the Deep Squat staged-attempt rule", () => {
  const result = buildLeakageFreeAiSuggestions({
    featureMatrix: { rows: [deepSquatFeatureRow()] },
    canonical: {
      repetitions: [{ repetitionId: "rep_deep", attemptCondition: null }],
    },
    protocolMetadataAudit: {
      rows: [
        {
          repetitionId: "rep_deep",
          protocolMetadata: { attemptCondition: "heels_elevated_board" },
        },
      ],
    },
  });

  assert.equal(result.rows[0].rawPoseScore, 3);
  assert.equal(result.rows[0].aiSuggestedScore, 2);
  assert.equal(result.rows[0].attemptCondition, "heels_elevated_board");
  assert.equal(
    result.rows[0].protocolMetadataSource,
    "post_round_a_targeted_audit",
  );
});

test("known floor attempts request staged follow-up instead of missing metadata", () => {
  const result = buildLeakageFreeAiSuggestions({
    featureMatrix: { rows: [deepSquatWatchFeatureRow()] },
    canonical: {
      repetitions: [{ repetitionId: "rep_deep", attemptCondition: null }],
    },
    protocolMetadataAudit: {
      rows: [
        {
          repetitionId: "rep_deep",
          protocolMetadata: { attemptCondition: "floor" },
        },
      ],
    },
  });

  assert.equal(result.rows[0].aiSuggestedScore, null);
  assert.equal(result.rows[0].rawPoseScore, 2);
  assert.equal(
    result.rows[0].exclusionReason,
    "staged_followup_attempt_required",
  );
});

test("AI consensus analysis separates scored, protocol-gated, and feature-only rows", () => {
  const suggestions = {
    rows: [
      {
        repetitionId: "rep_scored",
        actionType: "hurdle_step",
        featureReady: true,
        comparisonEligible: true,
        exclusionReason: null,
        aiSuggestedScore: 3,
      },
      {
        repetitionId: "rep_protocol",
        actionType: "deep_squat",
        featureReady: true,
        comparisonEligible: false,
        exclusionReason: "protocol_metadata_required",
        aiSuggestedScore: null,
      },
      {
        repetitionId: "rep_rotary",
        actionType: "rotary_stability",
        featureReady: true,
        comparisonEligible: false,
        exclusionReason: "feature_only_action",
        aiSuggestedScore: null,
      },
    ],
  };
  const result = summarizeAiConsensusEvidence({
    agreement: {
      analysis: {
        pilotId: "pilot",
        studyRound: "round_a",
        comparisonRows: [
          agreementRow("rep_scored", "hurdle_step", 2),
          agreementRow("rep_protocol", "deep_squat", 2),
          agreementRow("rep_rotary", "rotary_stability", 1),
        ],
      },
    },
    suggestions,
  });

  assert.equal(result.consensusCount, 3);
  assert.equal(result.featureReadyCount, 3);
  assert.equal(result.comparisonEligibleCount, 1);
  assert.equal(result.metrics.exactRate, 0);
  assert.equal(result.metrics.withinOneRate, 1);
  assert.equal(result.metrics.meanAbsoluteDifference, 1);
  assert.deepEqual(result.excludedByReason, {
    feature_only_action: 1,
    protocol_metadata_required: 1,
  });
  assert.equal(result.followUpQueue.length, 3);
  assert.equal(result.actionableFollowUpCount, 2);
  assert.equal(result.followUpQueue[1].priority, "high");
  assert.equal(result.followUpQueue[2].priority, "expected_boundary");
});
