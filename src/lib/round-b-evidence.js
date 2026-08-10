const EVIDENCE_STATUSES = new Set([
  "ai_score_available",
  "features_only",
  "protocol_metadata_required",
  "quality_limited",
  "suggestion_unavailable",
]);

const PROHIBITED_KEY_PATTERN =
  /^(human|reviewer|historical|legacy|reference|fileName|sourceFileName|videoPath|comment|note)/i;

const FEATURE_LABELS = {
  peakDepthRatio: "Depth ratio",
  hipKneeVerticalGap: "Hip-knee vertical gap",
  hipAngleDegrees: "Hip angle",
  kneeAngleDegrees: "Knee angle",
  ankleShankLeanDegrees: "Shank lean",
  trunkLeanDegrees: "Trunk lean",
  maxKneeAnkleOffset: "Knee-ankle offset",
  ankleAboveHip: "Ankle above hip",
  footAboveHip: "Foot above hip",
  stationaryKneeAngleDegrees: "Stationary knee angle",
  stationaryAnkleDrift: "Stationary ankle drift",
  hipHeightGap: "Hip height gap",
  peakElevation: "Peak elevation",
  peakClearance: "Peak clearance",
  stanceAnkleDrift: "Stance ankle drift",
  stanceKneeAngleDegrees: "Stance knee angle",
  stepKneeAngleDegrees: "Step knee angle",
  stepKneeLineOffset: "Step-knee line offset",
  trunkCenterOffset: "Trunk center offset",
  rotaryReachScore: "Rotary reach proxy",
  trunkTwistDegrees: "Trunk twist",
  sideConfidence: "Side confidence",
  timingVisibility: "Timing visibility",
  avgVisibility: "Landmark visibility",
  timingCoverageRatio: "Timing coverage",
  sideVisibility: "Side visibility",
};

function countBy(rows, key) {
  return Object.fromEntries(
    [...new Set(rows.map((row) => row[key]))]
      .sort()
      .map((value) => [value, rows.filter((row) => row[key] === value).length]),
  );
}

function uniqueMap(rows, key, label) {
  const result = new Map();
  for (const row of rows ?? []) {
    if (!row?.[key]) {
      throw new Error(`${label} row is missing ${key}`);
    }
    if (result.has(row[key])) {
      throw new Error(`duplicate ${label} row ${row[key]}`);
    }
    result.set(row[key], row);
  }
  return result;
}

function evidenceStatus(featureRow, aiRow) {
  if (featureRow.quality?.analysisReadiness !== "ready") {
    return "quality_limited";
  }
  if (aiRow.comparisonEligible && aiRow.aiSuggestedScore != null) {
    return "ai_score_available";
  }
  if (aiRow.exclusionReason === "feature_only_action") {
    return "features_only";
  }
  if (
    aiRow.exclusionReason === "protocol_metadata_required" ||
    aiRow.exclusionReason === "staged_followup_attempt_required"
  ) {
    return "protocol_metadata_required";
  }
  return "suggestion_unavailable";
}

function featureLabel(name) {
  return (
    FEATURE_LABELS[name] ??
    name
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/^./, (value) => value.toUpperCase())
  );
}

function buildFeatures(featureRow, actionContract) {
  return actionContract.features.map((definition) => ({
    name: definition.name,
    label: featureLabel(definition.name),
    value: featureRow.features?.[definition.name] ?? null,
    unit: definition.unit,
    direction: definition.direction,
  }));
}

function buildSummary(items) {
  const byAction = Object.fromEntries(
    [...new Set(items.map((item) => item.actionType))]
      .sort()
      .map((actionType) => {
        const rows = items.filter((item) => item.actionType === actionType);
        return [
          actionType,
          {
            total: rows.length,
            featureReady: rows.filter(
              (row) => row.quality.analysisReadiness === "ready",
            ).length,
            aiScoreAvailable: rows.filter(
              (row) => row.evidenceStatus === "ai_score_available",
            ).length,
            byEvidenceStatus: countBy(rows, "evidenceStatus"),
          },
        ];
      }),
  );
  return {
    totalItems: items.length,
    featureReady: items.filter(
      (item) => item.quality.analysisReadiness === "ready",
    ).length,
    aiScoreAvailable: items.filter(
      (item) => item.evidenceStatus === "ai_score_available",
    ).length,
    byEvidenceStatus: countBy(items, "evidenceStatus"),
    byAction,
  };
}

export function buildRoundBEvidenceManifest({
  formalManifest,
  featureMatrix,
  aiEvidence,
  featureContract,
  sourceArtifacts,
  freezeId,
  frozenAt,
  fingerprint,
}) {
  if (!Array.isArray(formalManifest?.items)) {
    throw new Error("formal study manifest items are required");
  }
  if (!Array.isArray(featureMatrix?.rows)) {
    throw new Error("camera-audited feature rows are required");
  }
  if (!Array.isArray(aiEvidence?.suggestionUniverse?.rows)) {
    throw new Error("AI suggestion universe rows are required");
  }
  if (!featureContract?.actions) {
    throw new Error("feature contract actions are required");
  }
  if (typeof fingerprint !== "function") {
    throw new Error("fingerprint function is required");
  }

  const featuresById = uniqueMap(featureMatrix.rows, "repetitionId", "feature");
  const suggestionsById = uniqueMap(
    aiEvidence.suggestionUniverse.rows,
    "repetitionId",
    "AI suggestion",
  );
  const seen = new Set();

  const items = formalManifest.items.map((formalItem) => {
    const repetitionId = formalItem.repetitionId;
    if (seen.has(repetitionId)) {
      throw new Error(`duplicate formal study row ${repetitionId}`);
    }
    seen.add(repetitionId);
    const featureRow = featuresById.get(repetitionId);
    const aiRow = suggestionsById.get(repetitionId);
    if (!featureRow || !aiRow) {
      throw new Error(`evidence is missing for ${repetitionId}`);
    }
    if (
      featureRow.actionType !== formalItem.actionType ||
      aiRow.actionType !== formalItem.actionType
    ) {
      throw new Error(`actionType mismatch for ${repetitionId}`);
    }
    const actionContract = featureContract.actions[formalItem.actionType];
    if (!actionContract) {
      throw new Error(`feature contract is missing ${formalItem.actionType}`);
    }
    const status = evidenceStatus(featureRow, aiRow);
    const item = {
      repetitionId,
      actionType: formalItem.actionType,
      evidenceStatus: status,
      quality: {
        analysisReadiness: featureRow.quality?.analysisReadiness ?? "limited",
        reasons: featureRow.quality?.reasons ?? [],
        timingStatus: featureRow.quality?.timingStatus ?? "missing",
        poseAverageVisibility:
          featureRow.quality?.poseAverageVisibility ?? null,
        poseMissingFramesRatio:
          featureRow.quality?.poseMissingFramesRatio ?? null,
      },
      features: buildFeatures(featureRow, actionContract),
      ratings: Object.entries(featureRow.ratings ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, rating]) => ({ name, label: featureLabel(name), rating })),
      qualifiers: Object.entries(featureRow.qualifiers ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => ({ name, label: featureLabel(name), value })),
      aiSuggestion:
        status === "ai_score_available"
          ? {
              totalScore: aiRow.aiSuggestedScore,
              confidence: aiRow.confidence,
              confidenceLabel: aiRow.confidenceLabel,
              modelVersion: aiRow.modelVersion,
              scoreSource: aiRow.scoreSource,
            }
          : null,
      exposure: {
        poseFeaturesShown: true,
        aiRawScoreShown: status === "ai_score_available",
      },
    };
    return { ...item, itemFingerprint: fingerprint(JSON.stringify(item)) };
  });

  const manifest = {
    schemaVersion: "ai_fms_round_b_evidence_manifest_v1",
    builderVersion: "round-b-evidence-builder-v1",
    pilotId: formalManifest.pilotId,
    studyRound: "round_b",
    frozenAt,
    freezeId,
    sourceSnapshotDate: formalManifest.sourceSnapshotDate,
    sourcePoolFingerprint: formalManifest.sourcePoolFingerprint,
    sourceFeatureMatrixFingerprint:
      formalManifest.sourceFeatureMatrixFingerprint,
    featureContractVersion: featureContract.contractVersion,
    sourceArtifacts,
    modelFreeze: {
      ruleFingerprint: aiEvidence.ruleFingerprint,
      interpretation: "reviewer_aid_not_autonomous_validation",
      thresholdsChangedAfterRoundA: false,
      rotaryStabilityPolicy: "features_only_no_ai_raw_score",
      independentHeldOutValidation: false,
    },
    exposurePolicy: {
      poseDerivedFeaturesShown: true,
      currentAiSuggestionShownWhenAvailable: true,
      historicalHumanScoresHidden: true,
      otherReviewerResultsHidden: true,
      sourceFileNamesHidden: true,
    },
    summary: buildSummary(items),
    items,
  };
  return {
    ...manifest,
    manifestFingerprint: fingerprint(JSON.stringify(manifest)),
  };
}

function findProhibitedKeys(value, path = "manifest", findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findProhibitedKeys(item, `${path}[${index}]`, findings),
    );
    return findings;
  }
  if (!value || typeof value !== "object") {
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    if (!key.endsWith("Hidden") && PROHIBITED_KEY_PATTERN.test(key)) {
      findings.push(`${path}.${key}`);
    }
    findProhibitedKeys(child, `${path}.${key}`, findings);
  }
  return findings;
}

export function validateRoundBEvidenceManifest(
  evidence,
  { pilot = null } = {},
) {
  const errors = [];
  const warnings = [];
  if (evidence?.schemaVersion !== "ai_fms_round_b_evidence_manifest_v1") {
    errors.push("schemaVersion is invalid.");
  }
  if (evidence?.studyRound !== "round_b") {
    errors.push("studyRound must be round_b.");
  }
  if (!evidence?.manifestFingerprint) {
    errors.push("manifestFingerprint is required.");
  }
  if (!evidence?.modelFreeze?.ruleFingerprint) {
    errors.push("modelFreeze.ruleFingerprint is required.");
  }
  if (!Array.isArray(evidence?.items)) {
    errors.push("items must be an array.");
  }

  const itemIds = new Set();
  for (const [index, item] of (evidence?.items ?? []).entries()) {
    const prefix = `items[${index}]`;
    if (!item?.repetitionId || itemIds.has(item.repetitionId)) {
      errors.push(`${prefix}.repetitionId is missing or duplicated.`);
    } else {
      itemIds.add(item.repetitionId);
    }
    if (!EVIDENCE_STATUSES.has(item?.evidenceStatus)) {
      errors.push(`${prefix}.evidenceStatus is invalid.`);
    }
    if (!Array.isArray(item?.features) || item.features.length === 0) {
      errors.push(`${prefix}.features are required.`);
    }
    if (!item?.itemFingerprint) {
      errors.push(`${prefix}.itemFingerprint is required.`);
    }
    const shouldShowScore = item?.evidenceStatus === "ai_score_available";
    if (shouldShowScore !== Boolean(item?.aiSuggestion)) {
      errors.push(`${prefix}.aiSuggestion does not match evidenceStatus.`);
    }
    if (
      item?.actionType === "rotary_stability" &&
      (item?.aiSuggestion || item?.exposure?.aiRawScoreShown)
    ) {
      errors.push(`${prefix} exposes a Rotary Stability AI RAW SCORE.`);
    }
  }

  if (pilot) {
    if (evidence?.pilotId !== pilot.pilotId) {
      errors.push("pilotId does not match the formal manifest.");
    }
    const expectedIds = new Set(
      (pilot.items ?? []).map((item) => item.repetitionId),
    );
    for (const repetitionId of expectedIds) {
      if (!itemIds.has(repetitionId)) {
        errors.push(`evidence is missing ${repetitionId}.`);
      }
    }
    for (const repetitionId of itemIds) {
      if (!expectedIds.has(repetitionId)) {
        errors.push(`unexpected evidence row ${repetitionId}.`);
      }
    }
  }

  const prohibitedKeys = findProhibitedKeys(evidence);
  if (prohibitedKeys.length) {
    errors.push(
      `prohibited reviewer-unsafe keys: ${prohibitedKeys.join(", ")}`,
    );
  }
  if (evidence?.summary?.aiScoreAvailable === 0) {
    warnings.push("No AI RAW SCORE is available in the evidence manifest.");
  }
  return { valid: errors.length === 0, errors, warnings };
}
