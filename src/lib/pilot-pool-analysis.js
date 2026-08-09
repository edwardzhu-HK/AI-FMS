const TIER_ORDER = [
  "gold_consensus",
  "formal_non_consensus",
  "expansion_candidate",
  "feature_ready_not_blindable",
  "blindable_feature_limited",
  "not_blindable_feature_limited",
];

const QUALITY_FEATURE_NAMES = new Set([
  "avgVisibility",
  "timingCoverageRatio",
  "sideVisibility",
  "sideConfidence",
  "timingVisibility",
]);

function round(value, digits = 6) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(sortedValues, probability) {
  if (!sortedValues.length) {
    return null;
  }
  const position = (sortedValues.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }
  const weight = position - lowerIndex;
  return (
    sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
  );
}

function describeValues(values, totalCount) {
  const sorted = values
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (!sorted.length) {
    return {
      count: 0,
      missingCount: totalCount,
      min: null,
      q1: null,
      median: null,
      mean: null,
      q3: null,
      max: null,
      standardDeviation: null,
    };
  }
  const average = mean(sorted);
  const variance =
    sorted.length > 1
      ? sorted.reduce((sum, value) => sum + (value - average) ** 2, 0) /
        (sorted.length - 1)
      : null;
  return {
    count: sorted.length,
    missingCount: totalCount - sorted.length,
    min: round(sorted[0]),
    q1: round(quantile(sorted, 0.25)),
    median: round(quantile(sorted, 0.5)),
    mean: round(average),
    q3: round(quantile(sorted, 0.75)),
    max: round(sorted.at(-1)),
    standardDeviation: variance == null ? null : round(Math.sqrt(variance)),
  };
}

function uniqueIndex(rows, key, label) {
  const index = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!value) {
      throw new Error(`${label} row is missing ${key}.`);
    }
    if (index.has(value)) {
      throw new Error(`${label} contains duplicate ${key} ${value}.`);
    }
    index.set(value, row);
  }
  return index;
}

function sameIdSet(leftIndex, rightIndex, label) {
  if (leftIndex.size !== rightIndex.size) {
    throw new Error(`${label} repetition count does not match canonical pool.`);
  }
  for (const repetitionId of leftIndex.keys()) {
    if (!rightIndex.has(repetitionId)) {
      throw new Error(`${label} is missing ${repetitionId}.`);
    }
  }
}

function classifyTier({
  formalSelected,
  roundAConsensusScored,
  blindable,
  featureReady,
}) {
  if (roundAConsensusScored) {
    return "gold_consensus";
  }
  if (formalSelected) {
    return "formal_non_consensus";
  }
  if (blindable && featureReady) {
    return "expansion_candidate";
  }
  if (featureReady) {
    return "feature_ready_not_blindable";
  }
  if (blindable) {
    return "blindable_feature_limited";
  }
  return "not_blindable_feature_limited";
}

function recommendedUse(tier) {
  return {
    gold_consensus: "score_linked_gold_analysis",
    formal_non_consensus: "scoreability_and_protocol_analysis",
    expansion_candidate: "future_blinded_review_and_profile_expansion",
    feature_ready_not_blindable: "label_free_quantitative_analysis_only",
    blindable_feature_limited: "human_review_or_feature_recovery",
    not_blindable_feature_limited:
      "quality_failure_and_collection_gap_analysis",
  }[tier];
}

function countBy(rows, keySelector) {
  return Object.fromEntries(
    Object.entries(Object.groupBy(rows, keySelector))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, groupedRows]) => [key, groupedRows.length]),
  );
}

function summarizeRows(rows) {
  return {
    total: rows.length,
    sourceVideos: new Set(rows.map((row) => row.videoId)).size,
    blindable: rows.filter((row) => row.blindable).length,
    featureReady: rows.filter((row) => row.featureReady).length,
    blindAndFeatureReady: rows.filter(
      (row) => row.blindable && row.featureReady,
    ).length,
    formalSelected: rows.filter((row) => row.formalSelected).length,
    roundAConsensusScored: rows.filter((row) => row.roundAConsensusScored)
      .length,
    historicalWeakLabelAvailable: rows.filter(
      (row) => row.historicalWeakLabelAvailable,
    ).length,
  };
}

function featureDefinitions(featureContract, actionType) {
  const action = featureContract.actions?.[actionType];
  if (!action) {
    throw new Error(`feature contract is missing ${actionType}.`);
  }
  return Object.fromEntries(
    action.features.map((feature) => [
      feature.name,
      {
        unit: feature.unit,
        direction: feature.direction,
        role: QUALITY_FEATURE_NAMES.has(feature.name) ? "quality" : "movement",
      },
    ]),
  );
}

function summarizeReadyFeatures(rows, featureContract) {
  const readyRows = rows.filter((row) => row.featureReady);
  const actions = [...new Set(rows.map((row) => row.actionType))].sort();
  return Object.fromEntries(
    actions.map((actionType) => {
      const actionRows = readyRows.filter(
        (row) => row.actionType === actionType,
      );
      const definitions = featureDefinitions(featureContract, actionType);
      return [
        actionType,
        {
          count: actionRows.length,
          sourceVideos: new Set(actionRows.map((row) => row.videoId)).size,
          features: Object.fromEntries(
            Object.entries(definitions).map(([featureName, definition]) => [
              featureName,
              {
                ...definition,
                ...describeValues(
                  actionRows.map((row) => row.features[featureName]),
                  actionRows.length,
                ),
              },
            ]),
          ),
        },
      ];
    }),
  );
}

function acquisitionAssessment(actionRows) {
  const expansionRows = actionRows.filter(
    (row) => row.researchTier === "expansion_candidate",
  );
  const limitedRows = actionRows.filter((row) => !row.featureReady);
  const limitationReasons = countBy(
    limitedRows.flatMap((row) => row.featureReasons),
    (reason) => reason,
  );
  const timingLimited = limitationReasons.timing_needs_adjustment ?? 0;
  const insufficientPose = limitationReasons.timing_insufficient_pose ?? 0;

  let nextAction = "analyze_existing_pool_first";
  if (!expansionRows.length && insufficientPose > 0) {
    nextAction = "pose_recovery_then_targeted_collection_if_gap_remains";
  } else if (expansionRows.length >= 8) {
    nextAction = "expand_review_with_existing_pool_first";
  } else if (timingLimited > expansionRows.length) {
    nextAction = "repair_timing_before_targeted_collection";
  } else if (expansionRows.length > 0) {
    nextAction = "review_small_existing_pool_then_reassess";
  }

  return {
    existingExpansionCandidateReps: expansionRows.length,
    existingExpansionCandidateVideos: new Set(
      expansionRows.map((row) => row.videoId),
    ).size,
    featureLimitedReps: limitedRows.length,
    limitationReasons,
    nextAction,
    collectionDecision: "not_yet_final",
  };
}

function validateInputs({
  canonical,
  blindability,
  featureMatrix,
  formalManifest,
  agreement,
  featureContract,
}) {
  if (!Array.isArray(canonical?.repetitions)) {
    throw new Error("canonical repetitions are required.");
  }
  if (!Array.isArray(blindability?.items)) {
    throw new Error("blindability items are required.");
  }
  if (!Array.isArray(featureMatrix?.rows)) {
    throw new Error("feature matrix rows are required.");
  }
  if (!Array.isArray(formalManifest?.items)) {
    throw new Error("formal manifest items are required.");
  }
  if (!Array.isArray(agreement?.analysis?.comparisonRows)) {
    throw new Error("agreement comparison rows are required.");
  }
  if (!featureContract?.actions) {
    throw new Error("feature contract actions are required.");
  }
}

export function summarizePilotPoolUtilization(inputs) {
  validateInputs(inputs);
  const {
    canonical,
    blindability,
    featureMatrix,
    formalManifest,
    agreement,
    featureContract,
  } = inputs;
  const canonicalIndex = uniqueIndex(
    canonical.repetitions,
    "repetitionId",
    "canonical pool",
  );
  const blindabilityIndex = uniqueIndex(
    blindability.items,
    "repetitionId",
    "blindability manifest",
  );
  const featureIndex = uniqueIndex(
    featureMatrix.rows,
    "repetitionId",
    "feature matrix",
  );
  sameIdSet(canonicalIndex, blindabilityIndex, "blindability manifest");
  sameIdSet(canonicalIndex, featureIndex, "feature matrix");

  const formalIds = new Set(
    formalManifest.items.map((item) => item.repetitionId),
  );
  const consensusIds = new Set(
    agreement.analysis.comparisonRows
      .filter(
        (row) =>
          row.leftStatus === "scored" &&
          row.rightStatus === "scored" &&
          row.leftScore === row.rightScore,
      )
      .map((row) => row.repetitionId),
  );
  for (const repetitionId of [...formalIds, ...consensusIds]) {
    if (!canonicalIndex.has(repetitionId)) {
      throw new Error(`formal evidence references unknown ${repetitionId}.`);
    }
  }

  const rows = canonical.repetitions.map((canonicalRow) => {
    const blindabilityRow = blindabilityIndex.get(canonicalRow.repetitionId);
    const featureRow = featureIndex.get(canonicalRow.repetitionId);
    const blindable = blindabilityRow.blindability.status === "eligible";
    const featureReady = featureRow.quality.analysisReadiness === "ready";
    const formalSelected = formalIds.has(canonicalRow.repetitionId);
    const roundAConsensusScored = consensusIds.has(canonicalRow.repetitionId);
    const researchTier = classifyTier({
      formalSelected,
      roundAConsensusScored,
      blindable,
      featureReady,
    });
    const historicalConsensusScore =
      canonicalRow.humanReviewSummary?.consensusScore ?? null;
    return {
      repetitionId: canonicalRow.repetitionId,
      ingestId: canonicalRow.ingestId,
      videoId: canonicalRow.videoId,
      actionType: canonicalRow.actionType,
      repetitionIndex: canonicalRow.repetitionIndex,
      startSecond: canonicalRow.startSecond,
      endSecond: canonicalRow.endSecond,
      cameraView: canonicalRow.cameraView,
      side: canonicalRow.side,
      blindabilityStatus: blindabilityRow.blindability.status,
      blindabilityReasons: blindabilityRow.blindability.exclusionReasons ?? [],
      blindable,
      featureReadiness: featureRow.quality.analysisReadiness,
      featureReasons: featureRow.quality.reasons ?? [],
      featureReady,
      features: featureRow.features,
      formalSelected,
      roundAConsensusScored,
      historicalConsensusScore,
      historicalWeakLabelAvailable: Number.isInteger(historicalConsensusScore),
      historicalLabelUse: Number.isInteger(historicalConsensusScore)
        ? "legacy_weak_label_pending_gold_audit"
        : "none",
      researchTier,
      recommendedUse: recommendedUse(researchTier),
    };
  });

  const actionTypes = [...new Set(rows.map((row) => row.actionType))].sort();
  const byAction = Object.fromEntries(
    actionTypes.map((actionType) => {
      const actionRows = rows.filter((row) => row.actionType === actionType);
      return [
        actionType,
        {
          ...summarizeRows(actionRows),
          tierCounts: countBy(actionRows, (row) => row.researchTier),
          acquisitionAssessment: acquisitionAssessment(actionRows),
        },
      ];
    }),
  );
  const tierCounts = Object.fromEntries(
    TIER_ORDER.map((tier) => [
      tier,
      rows.filter((row) => row.researchTier === tier).length,
    ]),
  );
  const featureLimitedRows = rows.filter((row) => !row.featureReady);
  const expansionRows = rows.filter(
    (row) => row.researchTier === "expansion_candidate",
  );

  return {
    pilotId: canonical.pilotId,
    sourceSnapshotDate: canonical.snapshotSourceDate,
    fullPool: summarizeRows(rows),
    tierCounts,
    byAction,
    featureLimitationReasons: countBy(
      featureLimitedRows.flatMap((row) => row.featureReasons),
      (reason) => reason,
    ),
    expansionPool: {
      reps: expansionRows.length,
      sourceVideos: new Set(expansionRows.map((row) => row.videoId)).size,
      byAction: Object.fromEntries(
        actionTypes.map((actionType) => [
          actionType,
          summarizeRows(
            expansionRows.filter((row) => row.actionType === actionType),
          ),
        ]),
      ),
    },
    historicalLabelBoundary: {
      available: rows.filter((row) => row.historicalWeakLabelAvailable).length,
      unavailable: rows.filter((row) => !row.historicalWeakLabelAvailable)
        .length,
      permittedUse: "stratification_and_exploratory_analysis_only",
      promotionRequirement:
        "compare_against_blinded_gold_consensus_after_round_b",
    },
    readyFeatureSummary: summarizeReadyFeatures(rows, featureContract),
    rows,
  };
}

export { TIER_ORDER };
