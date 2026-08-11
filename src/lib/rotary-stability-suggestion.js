export const ROTARY_STABILITY_EXPERIMENTAL_MODEL_VERSION =
  "pose-cycle-rules-v1.1-rotary-experimental";

export const ROTARY_STABILITY_FIRST_PASS_MODEL_VERSION =
  "pose-cycle-rules-v1.0-rotary-first-pass";
export const ROTARY_STABILITY_FIRST_PASS_EVIDENCE_VERSION =
  "pose-cycle-evidence-v1.0-rotary";

const COMPLETION_CRITERIA = [
  "movementAmplitude",
  "firstAnkleTouch",
  "secondAnkleTouch",
  "elbowExtension",
  "kneeExtension",
  "returnControl",
];

function confidenceLabel(confidence) {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

function getProtocolValue(item, protocolMetadataBySegment, key) {
  return (
    protocolMetadataBySegment?.[item.segmentId]?.[key] ??
    item.segmentMetadata?.[key] ??
    null
  );
}

function hasPositiveClearing(item, protocolMetadataBySegment) {
  const painFlag = getProtocolValue(
    item,
    protocolMetadataBySegment,
    "painFlag",
  );
  const clearingTest = getProtocolValue(
    item,
    protocolMetadataBySegment,
    "clearingTest",
  );
  return painFlag === true || ["positive", "pain"].includes(clearingTest);
}

function buildConfidence(item, score, failureCount = 0) {
  const visibility = item.metrics?.averageVisibility ?? 0;
  const frameCoverage = item.metrics?.usableFrameRatio ?? 0;
  const phaseCoverage =
    Object.values(item.phases ?? {}).filter(Number.isFinite).length / 7;
  const evidenceStrength =
    score === 1 ? Math.min(1, 0.65 + failureCount * 0.12) : 0.72;
  return Number(
    Math.max(
      0,
      Math.min(
        1,
        visibility * 0.35 +
          frameCoverage * 0.25 +
          phaseCoverage * 0.2 +
          evidenceStrength * 0.2,
      ),
    ).toFixed(2),
  );
}

function criterionReason(name, criterion) {
  return `${name}: ${criterion?.status ?? "unknown"} (${criterion?.value ?? "N/A"} ${criterion?.unit ?? ""}).`;
}

function insufficientItem(item, reason) {
  return {
    segmentId: item.segmentId,
    repetitionIndex: item.repetitionIndex,
    status: "insufficient_evidence",
    scoringStatus: "not_scored",
    totalScore: null,
    rawPoseScore: null,
    confidence: 0,
    confidenceLabel: "low",
    reasons: [reason, ...(item.issues ?? [])],
    modelVersion: ROTARY_STABILITY_EXPERIMENTAL_MODEL_VERSION,
    experimental: true,
  };
}

function buildSuggestionItem(item, protocolMetadataBySegment) {
  if (item.status !== "ok") {
    return insufficientItem(
      item,
      "A complete, ordered Rotary Stability pose cycle is not available.",
    );
  }

  const failedCriteria = COMPLETION_CRITERIA.filter(
    (name) => item.criteria?.[name]?.status === "fail",
  );
  const unresolvedCriteria = COMPLETION_CRITERIA.filter((name) =>
    ["watch", "unknown"].includes(item.criteria?.[name]?.status),
  );
  let rawPoseScore = null;
  let status = "suggested";
  let scoreSource = "pose_cycle_rule";
  const reasons = [];

  if (failedCriteria.length) {
    rawPoseScore = 1;
    reasons.push(
      `Updated FMS Rotary score-1 evidence: ${failedCriteria.join(", ")}.`,
      ...failedCriteria.map((name) =>
        criterionReason(name, item.criteria[name]),
      ),
    );
  } else if (unresolvedCriteria.length) {
    rawPoseScore = 2;
    status = "needs_manual_review";
    scoreSource = "pose_cycle_rule_borderline";
    reasons.push(
      `The cycle is visible, but ${unresolvedCriteria.join(", ")} remains borderline; review before accepting the conservative score-2 proposal.`,
      ...unresolvedCriteria.map((name) =>
        criterionReason(name, item.criteria[name]),
      ),
    );
  } else {
    const boardAlignment = getProtocolValue(
      item,
      protocolMetadataBySegment,
      "rotaryBoardAlignment",
    );
    const simultaneousLift = item.criteria.simultaneousLift?.status;
    if (boardAlignment === "confirmed" && simultaneousLift === "pass") {
      rawPoseScore = 3;
      reasons.push(
        "Updated FMS Rotary score-3 path: the full cycle passed, lift onset was simultaneous, and board alignment was independently confirmed.",
      );
    } else {
      rawPoseScore = 2;
      scoreSource = "pose_cycle_rule_conservative_cap";
      reasons.push(
        "The full cycle passed the pose checks, but score 3 was not proven because simultaneous lift and board-parallel alignment were not both confirmed; the AI proposal is conservatively capped at 2.",
        criterionReason("simultaneousLift", item.criteria.simultaneousLift),
        `rotaryBoardAlignment: ${boardAlignment ?? "unknown"}.`,
      );
    }
  }

  const positiveClearing = hasPositiveClearing(item, protocolMetadataBySegment);
  const confidence = buildConfidence(item, rawPoseScore, failedCriteria.length);
  if (positiveClearing) {
    reasons.unshift(
      "Human-supplied pain/clearing metadata is positive. The FMS final score is 0; pose still reports the separate raw movement score.",
    );
  } else {
    reasons.push(
      "Pain and the flexion clearing test are human gates; pose does not infer them.",
    );
  }

  return {
    segmentId: item.segmentId,
    repetitionIndex: item.repetitionIndex,
    status,
    scoringStatus: status === "suggested" ? "scored" : "review_required",
    scoreSource,
    scoreScope: "rep_raw_score",
    totalScore: positiveClearing ? 0 : rawPoseScore,
    rawPoseScore,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    finalScoreRequiresHumanClearing: !positiveClearing,
    evidenceVersion: item.evidenceVersion,
    criteria: item.criteria,
    reasons,
    modelVersion: ROTARY_STABILITY_EXPERIMENTAL_MODEL_VERSION,
    experimental: true,
    evaluationClass: "post_audit_internal_only",
  };
}

export function buildRotaryStabilityExperimentalSuggestion({
  cycleEvidenceReport,
  protocolMetadataBySegment = {},
} = {}) {
  if (!cycleEvidenceReport?.items?.length) return null;
  const items = cycleEvidenceReport.items.map((item) =>
    buildSuggestionItem(item, protocolMetadataBySegment),
  );
  const scored = items.filter((item) => Number.isInteger(item.totalScore));
  return {
    status: "ok",
    actionType: "rotary_stability",
    modelVersion: ROTARY_STABILITY_EXPERIMENTAL_MODEL_VERSION,
    experimental: true,
    evaluationClass: "post_audit_internal_only",
    items,
    summary: {
      segmentsTotal: items.length,
      scoredSegments: scored.length,
      suggestedSegments: items.filter((item) => item.status === "suggested")
        .length,
      manualReviewSegments: items.filter(
        (item) => item.status === "needs_manual_review",
      ).length,
      abstainedSegments: items.filter(
        (item) => item.status === "insufficient_evidence",
      ).length,
      byRawPoseScore: Object.fromEntries(
        [1, 2, 3].map((score) => [
          score,
          items.filter((item) => item.rawPoseScore === score).length,
        ]),
      ),
    },
  };
}

export function buildRotaryStabilityFirstPassSuggestion(options = {}) {
  const report = buildRotaryStabilityExperimentalSuggestion(options);
  if (!report) return null;

  return {
    ...report,
    modelVersion: ROTARY_STABILITY_FIRST_PASS_MODEL_VERSION,
    experimental: false,
    evaluationClass: "first_pass_reviewer_support",
    productStatus: "first_pass",
    items: report.items.map((item) => ({
      ...item,
      modelVersion: ROTARY_STABILITY_FIRST_PASS_MODEL_VERSION,
      evidenceVersion: item.evidenceVersion
        ? ROTARY_STABILITY_FIRST_PASS_EVIDENCE_VERSION
        : item.evidenceVersion,
      experimental: false,
      evaluationClass: "first_pass_reviewer_support",
      productStatus: "first_pass",
    })),
  };
}
