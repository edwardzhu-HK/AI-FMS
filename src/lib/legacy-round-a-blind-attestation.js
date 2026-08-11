const CURRENT_BLIND_FIELDS = [
  "priorRoundReviewHidden",
  "otherReviewerResultsHidden",
  "reviewMode",
  "currentPoseEvidenceShown",
  "currentAiSuggestionShown",
];

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function usesLegacyRoundAContract(payload) {
  return (
    payload?.studyRound === "round_a" &&
    payload.events?.length > 0 &&
    payload.events.every((event) =>
      CURRENT_BLIND_FIELDS.every(
        (field) => !hasOwn(event.blindReview ?? {}, field),
      ),
    )
  );
}

function validateLegacyEvent(event, contract, index) {
  const prefix = `legacy Round A events[${index}]`;
  assert(event.studyRound === "round_a", `${prefix} is not Round A`);
  for (const [field, expected] of Object.entries(
    contract.requiredBlindReviewValues,
  )) {
    assert(
      event.blindReview?.[field] === expected,
      `${prefix}.blindReview.${field} does not match the attested contract`,
    );
  }
  for (const field of contract.requiredAbsentEventFields) {
    assert(!hasOwn(event, field), `${prefix}.${field} must be absent`);
  }
  for (const field of contract.requiredAbsentBlindReviewFields) {
    assert(
      !hasOwn(event.blindReview ?? {}, field),
      `${prefix}.blindReview.${field} must be absent`,
    );
  }
  const expectedEligibility =
    event.status !== "unscorable" &&
    event.blindReview?.labelCueDetected !== true;
  assert(
    event.blindReview?.eligibleForBlindAnalysis === expectedEligibility,
    `${prefix}.blindReview eligibility is inconsistent`,
  );
}

export function applyLegacyRoundABlindAttestation({
  payload,
  sha256,
  attestation,
}) {
  if (!usesLegacyRoundAContract(payload)) {
    return { payload, applied: false, attestedExport: null };
  }

  assert(
    attestation?.schemaVersion === "ai_fms_round_a_legacy_blind_attestation_v1",
    "Legacy Round A blind attestation is missing or invalid",
  );
  assert(
    payload.pilotId === attestation.scope?.pilotId,
    "Legacy Round A pilot does not match the attestation",
  );
  const attestedExport = attestation.exports?.find(
    (item) => item.sha256 === sha256,
  );
  assert(attestedExport, "Legacy Round A export SHA-256 is not attested");
  assert(
    attestedExport.reviewerId === payload.reviewerId &&
      attestedExport.exportedAt === payload.exportedAt &&
      attestedExport.eventCount === payload.events.length,
    "Legacy Round A export metadata does not match the attestation",
  );
  payload.events.forEach((event, index) =>
    validateLegacyEvent(event, attestation.originalContract, index),
  );

  const normalized = {
    ...payload,
    events: payload.events.map((event) => ({
      ...event,
      evidenceReview: null,
      blindReview: {
        ...event.blindReview,
        priorRoundReviewHidden:
          attestation.normalizedAnalysisContract.priorRoundReviewHidden,
        otherReviewerResultsHidden:
          attestation.normalizedAnalysisContract.otherReviewerResultsHidden,
        reviewMode: attestation.normalizedAnalysisContract.reviewMode,
        currentPoseEvidenceShown:
          attestation.normalizedAnalysisContract.currentPoseEvidenceShown,
        currentAiSuggestionShown:
          attestation.normalizedAnalysisContract.currentAiSuggestionShown,
      },
    })),
  };

  return { payload: normalized, applied: true, attestedExport };
}

export function isLegacyRoundAExport(payload) {
  return usesLegacyRoundAContract(payload);
}
