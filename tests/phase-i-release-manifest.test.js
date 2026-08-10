import assert from "node:assert/strict";
import test from "node:test";
import {
  auditReleaseDocuments,
  summarizePhaseIEvidence,
  validateExpectedEvidence,
} from "../scripts/build-phase-i-release-manifest.js";

function artifact(id, payload) {
  return { id, payload };
}

test("Phase I release summary keeps study and AI evidence counts separate", () => {
  const summary = summarizePhaseIEvidence([
    artifact("canonical_pilot", {
      summary: { uniqueVideos: 28, repetitions: 110 },
    }),
    artifact("camera_audited_features", { summary: { ready: 66 } }),
    artifact("formal_study_manifest", { formalSampleSize: 32 }),
    artifact("round_a_agreement", {
      analysis: {
        overall: {
          statusAgreementCount: 31,
          bothScoredCount: 26,
          bothUnscorableCount: 5,
          scoreabilityMismatchCount: 1,
          exactScoreAgreementCount: 26,
          linearWeightedKappa: 1,
        },
      },
    }),
    artifact("round_a_movement_profiles", {
      analysis: { consensusCount: 26 },
    }),
    artifact("round_a_ai_evidence", {
      analysis: {
        comparisonEligibleCount: 16,
        metrics: {
          exactCount: 9,
          withinOneCount: 14,
          meanAbsoluteDifference: 0.5625,
        },
      },
      protocolSensitivity: {
        analysis: {
          comparisonEligibleCount: 17,
          metrics: {
            exactCount: 11,
            withinOneCount: 15,
            meanAbsoluteDifference: 0.4706,
          },
        },
      },
    }),
    artifact("aslr_side_peak_audit", {
      summary: {
        repetitions: 17,
        uniqueEvidenceWindows: 16,
        byUniqueWindowStatus: { good: 11, watch: 2, limited: 3 },
      },
    }),
    artifact("aslr_subject_sensitivity", {
      summary: {
        reextractedUniqueWindows: 3,
        noLongerLimited: 3,
        sensitivityStatus: { good: 1, watch: 2 },
        manualWatchReviews: 2,
      },
    }),
    artifact("round_b_ai_benchmark", {
      summary: {
        totalItems: 32,
        featureReady: 32,
        aiScoreAvailable: 18,
        byEvidenceStatus: { protocol_metadata_required: 6 },
        byAction: {
          rotary_stability: { byEvidenceStatus: { features_only: 8 } },
        },
      },
      modelFreeze: { ruleFingerprint: "rule-fingerprint" },
    }),
    artifact("rotary_v1_1_internal", {
      metrics: {
        formalItems: 8,
        scoredItems: 8,
        abstainedItems: 0,
        exactCount: 6,
        coverage: 1,
      },
      roundBIsolation: { experimentalScoreExposed: false },
    }),
    artifact("final_ai_v1_1_predictions", {
      summary: {
        formalItems: 32,
        scoreAvailable: 28,
        abstained: 4,
        byAction: {
          rotary_stability: { scoreAvailable: 8 },
          deep_squat: { scoreAvailable: 4 },
        },
      },
    }),
    artifact("phase_i_case_study_portfolio", {
      summary: { selectedCases: 4, applicationFigures: 2 },
    }),
  ]);

  assert.deepEqual(summary, {
    uniqueVideos: 28,
    canonicalRepetitions: 110,
    featureReady: 66,
    formalSampleSize: 32,
    roundAConsensus: 26,
    roundAStatusAgreement: 31,
    roundABothScored: 26,
    roundABothUnscorable: 5,
    roundAScoreabilityMismatch: 1,
    roundARawScoreExact: 26,
    roundAHumanLinearWeightedKappa: 1,
    roundAAiComparable: 16,
    roundAAiExact: 9,
    roundAAiWithinOne: 14,
    roundAAiMeanAbsoluteDifference: 0.5625,
    protocolSensitivityComparable: 17,
    protocolSensitivityExact: 11,
    protocolSensitivityWithinOne: 15,
    protocolSensitivityMeanAbsoluteDifference: 0.4706,
    aslrAuditRepetitions: 17,
    aslrAuditUniqueEvidenceWindows: 16,
    aslrAuditGoodWindows: 11,
    aslrAuditWatchWindows: 2,
    aslrAuditLimitedWindows: 3,
    aslrSensitivityReextractedWindows: 3,
    aslrSensitivityNoLongerLimited: 3,
    aslrSensitivityGoodWindows: 1,
    aslrSensitivityWatchWindows: 2,
    aslrSensitivityLimitedWindows: 0,
    aslrSensitivityManualWatchReviews: 2,
    roundBAiBenchmarkItems: 32,
    roundBAiBenchmarkFeatureReady: 32,
    roundBAiBenchmarkScoreAvailable: 18,
    roundBAiBenchmarkRotaryFeatureOnly: 8,
    roundBAiBenchmarkProtocolMetadataRequired: 6,
    roundBAiBenchmarkRuleFingerprint: "rule-fingerprint",
    rotaryV11FormalItems: 8,
    rotaryV11ScoredItems: 8,
    rotaryV11AbstainedItems: 0,
    rotaryV11Exact: 6,
    rotaryV11Coverage: 1,
    rotaryV11RoundBIsolation: true,
    finalAiV11FormalItems: 32,
    finalAiV11ScoreAvailable: 28,
    finalAiV11Abstained: 4,
    finalAiV11RotaryScoreAvailable: 8,
    finalAiV11DeepSquatScoreAvailable: 4,
    selectedCaseStudies: 4,
    applicationFigures: 2,
  });
});

test("release document audit blocks local absolute paths", () => {
  assert.throws(
    () =>
      auditReleaseDocuments([
        {
          path: "README.md",
          text: "Round B pending. Not a medical diagnosis. Does not replace reviewers. Rights/privacy review. /Users/example/private",
        },
      ]),
    /absolutePaths=1/,
  );
});

test("Phase I release validation fails closed on stale evidence", () => {
  assert.throws(
    () =>
      validateExpectedEvidence(
        { canonicalRepetitions: 109 },
        {
          canonicalRepetitions: 110,
        },
      ),
    /evidence drift/,
  );
});
