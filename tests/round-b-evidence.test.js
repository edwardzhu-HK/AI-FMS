import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRoundBEvidenceManifest,
  validateRoundBEvidenceManifest,
} from "../src/lib/round-b-evidence.js";

const formalManifest = {
  pilotId: "pilot-test",
  sourceSnapshotDate: "2026-08-10",
  sourcePoolFingerprint: "pool-fingerprint",
  sourceFeatureMatrixFingerprint: "feature-fingerprint",
  items: [
    { repetitionId: "rep-score", actionType: "hurdle_step" },
    { repetitionId: "rep-rotary", actionType: "rotary_stability" },
  ],
};

const featureMatrix = {
  rows: [
    {
      repetitionId: "rep-score",
      actionType: "hurdle_step",
      features: { peakClearance: 0.22 },
      ratings: { hurdleClearance: "good" },
      quality: {
        analysisReadiness: "ready",
        reasons: [],
        timingStatus: "good",
        poseAverageVisibility: 0.9,
        poseMissingFramesRatio: 0,
      },
    },
    {
      repetitionId: "rep-rotary",
      actionType: "rotary_stability",
      features: { rotaryReachScore: 0.48 },
      ratings: { rotaryReach: "watch" },
      quality: {
        analysisReadiness: "ready",
        reasons: [],
        timingStatus: "good",
        poseAverageVisibility: 0.8,
        poseMissingFramesRatio: 0.01,
      },
    },
  ],
};

const aiEvidence = {
  ruleFingerprint: "rule-fingerprint",
  suggestionUniverse: {
    rows: [
      {
        repetitionId: "rep-score",
        actionType: "hurdle_step",
        comparisonEligible: true,
        exclusionReason: null,
        aiSuggestedScore: 2,
        confidence: 0.9,
        confidenceLabel: "high",
        modelVersion: "pose-test-v1",
        scoreSource: "pose_proxy",
      },
      {
        repetitionId: "rep-rotary",
        actionType: "rotary_stability",
        comparisonEligible: false,
        exclusionReason: "feature_only_action",
        aiSuggestedScore: null,
      },
    ],
  },
};

const featureContract = {
  contractVersion: "test-v1",
  actions: {
    hurdle_step: {
      features: [
        {
          name: "peakClearance",
          unit: "normalized_image_height",
          direction: "higher indicates more clearance",
        },
      ],
    },
    rotary_stability: {
      features: [
        {
          name: "rotaryReachScore",
          unit: "normalized_reach_proxy",
          direction: "not an FMS RAW SCORE",
        },
      ],
    },
  },
};

function buildFixture() {
  return buildRoundBEvidenceManifest({
    formalManifest,
    featureMatrix,
    aiEvidence,
    featureContract,
    sourceArtifacts: { fixture: "sha256" },
    freezeId: "freeze-test",
    frozenAt: "2026-08-10T00:00:00.000Z",
    fingerprint: (value) => `fingerprint-${value.length}`,
  });
}

test("builds reviewer-safe Round B evidence with score coverage separated", () => {
  const manifest = buildFixture();
  assert.equal(manifest.summary.totalItems, 2);
  assert.equal(manifest.summary.featureReady, 2);
  assert.equal(manifest.summary.aiScoreAvailable, 1);
  assert.equal(manifest.items[0].aiSuggestion.totalScore, 2);
  assert.equal(manifest.items[1].evidenceStatus, "features_only");
  assert.equal(manifest.items[1].aiSuggestion, null);
  assert.equal(manifest.items[1].exposure.aiRawScoreShown, false);
  assert.equal(
    validateRoundBEvidenceManifest(manifest, { pilot: formalManifest }).valid,
    true,
  );
});

test("fails closed when a formal item has no evidence row", () => {
  assert.throws(
    () =>
      buildRoundBEvidenceManifest({
        formalManifest,
        featureMatrix: { rows: featureMatrix.rows.slice(0, 1) },
        aiEvidence,
        featureContract,
        sourceArtifacts: {},
        freezeId: "freeze-test",
        frozenAt: "2026-08-10T00:00:00.000Z",
        fingerprint: () => "fingerprint",
      }),
    /evidence is missing for rep-rotary/,
  );
});

test("validator rejects reviewer-unsafe keys and Rotary RAW SCORE exposure", () => {
  const manifest = buildFixture();
  manifest.items[0].historicalHumanScore = 2;
  manifest.items[1].aiSuggestion = { totalScore: 3 };
  manifest.items[1].exposure.aiRawScoreShown = true;
  const validation = validateRoundBEvidenceManifest(manifest, {
    pilot: formalManifest,
  });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /reviewer-unsafe/);
  assert.match(validation.errors.join("\n"), /Rotary Stability/);
});
