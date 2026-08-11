import assert from "node:assert/strict";
import test from "node:test";

import { applyLegacyRoundABlindAttestation } from "../src/lib/legacy-round-a-blind-attestation.js";

const HASH = "a".repeat(64);

function legacyPayload() {
  return {
    pilotId: "pilot-test",
    studyRound: "round_a",
    reviewerId: "Ronnie",
    exportedAt: "2026-08-09T00:00:00.000Z",
    events: [
      {
        studyRound: "round_a",
        status: "scored",
        blindReview: {
          historicalHumanScoresHidden: true,
          legacyAiSuggestionHidden: true,
          sourceFileNameHidden: true,
          audioMuted: true,
          labelCueDetected: false,
          eligibleForBlindAnalysis: true,
        },
      },
    ],
  };
}

function attestation() {
  return {
    schemaVersion: "ai_fms_round_a_legacy_blind_attestation_v1",
    scope: { pilotId: "pilot-test" },
    originalContract: {
      requiredBlindReviewValues: {
        historicalHumanScoresHidden: true,
        legacyAiSuggestionHidden: true,
        sourceFileNameHidden: true,
        audioMuted: true,
        labelCueDetected: false,
      },
      requiredAbsentEventFields: ["evidenceReview"],
      requiredAbsentBlindReviewFields: [
        "priorRoundReviewHidden",
        "otherReviewerResultsHidden",
        "reviewMode",
        "currentPoseEvidenceShown",
        "currentAiSuggestionShown",
      ],
    },
    normalizedAnalysisContract: {
      priorRoundReviewHidden: true,
      otherReviewerResultsHidden: true,
      reviewMode: "blind",
      currentPoseEvidenceShown: false,
      currentAiSuggestionShown: false,
    },
    exports: [
      {
        reviewerId: "Ronnie",
        exportedAt: "2026-08-09T00:00:00.000Z",
        eventCount: 1,
        sha256: HASH,
      },
    ],
  };
}

test("normalizes only an exactly attested legacy Round A export", () => {
  const original = legacyPayload();
  const result = applyLegacyRoundABlindAttestation({
    payload: original,
    sha256: HASH,
    attestation: attestation(),
  });

  assert.equal(result.applied, true);
  assert.equal(result.payload.events[0].blindReview.reviewMode, "blind");
  assert.equal(
    result.payload.events[0].blindReview.currentPoseEvidenceShown,
    false,
  );
  assert.equal(result.payload.events[0].evidenceReview, null);
  assert.equal("reviewMode" in original.events[0].blindReview, false);
  assert.equal("evidenceReview" in original.events[0], false);
});

test("rejects an unlisted legacy export checksum", () => {
  assert.throws(
    () =>
      applyLegacyRoundABlindAttestation({
        payload: legacyPayload(),
        sha256: "b".repeat(64),
        attestation: attestation(),
      }),
    /SHA-256 is not attested/,
  );
});

test("rejects legacy metadata that says the AI suggestion was visible", () => {
  const payload = legacyPayload();
  payload.events[0].blindReview.legacyAiSuggestionHidden = false;

  assert.throws(
    () =>
      applyLegacyRoundABlindAttestation({
        payload,
        sha256: HASH,
        attestation: attestation(),
      }),
    /legacyAiSuggestionHidden/,
  );
});

test("does not rewrite a current-contract export", () => {
  const payload = legacyPayload();
  payload.events[0].evidenceReview = null;
  Object.assign(payload.events[0].blindReview, {
    priorRoundReviewHidden: true,
    otherReviewerResultsHidden: true,
    reviewMode: "blind",
    currentPoseEvidenceShown: false,
    currentAiSuggestionShown: false,
  });

  const result = applyLegacyRoundABlindAttestation({
    payload,
    sha256: "not-attested",
    attestation: null,
  });

  assert.equal(result.applied, false);
  assert.equal(result.payload, payload);
});
