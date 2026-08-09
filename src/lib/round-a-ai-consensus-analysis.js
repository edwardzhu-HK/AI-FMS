import { getMovementAdapter } from "./movement-adapters.js";
import { weightedCohenKappa } from "./study-review-agreement.js";

const SCORE_CATEGORIES = [0, 1, 2, 3];

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function rate(numerator, denominator) {
  return denominator > 0 ? round(numerator / denominator) : null;
}

function countBy(rows, key) {
  return Object.fromEntries(
    [...new Set(rows.map((row) => row[key]))]
      .sort()
      .map((value) => [value, rows.filter((row) => row[key] === value).length]),
  );
}

function buildFeatureItem(row) {
  return {
    segmentId: row.repetitionId,
    repetitionIndex: row.repetitionIndex,
    status: row.quality?.featureStatus ?? "missing",
    metrics: { ...row.features, ...row.qualifiers },
    ratings: Object.fromEntries(
      Object.entries(row.ratings ?? {}).map(([name, status]) => [
        name,
        { status, label: status },
      ]),
    ),
  };
}

function buildTimingReport(row) {
  return {
    items: [
      {
        segmentId: row.repetitionId,
        status: row.quality?.timingStatus ?? "missing",
        metrics: {
          coverageRatio: row.quality?.timingCoverageRatio ?? null,
        },
      },
    ],
  };
}

function buildSegment(row, protocolMetadata) {
  const attemptCondition = protocolMetadata?.attemptCondition ?? null;
  return {
    segmentId: row.repetitionId,
    repetitionIndex: row.repetitionIndex,
    actionType: row.actionType,
    startSecond: row.startSecond,
    endSecond: row.endSecond,
    cameraView: row.cameraView,
    side: row.side,
    attemptCondition,
    metadata: {
      attemptCondition,
    },
  };
}

function auditedProtocolMetadata(protocolMetadataAudit) {
  if (!protocolMetadataAudit) return new Map();
  if (!Array.isArray(protocolMetadataAudit.rows)) {
    throw new Error("protocol metadata audit rows are required");
  }

  const rows = protocolMetadataAudit.rows.filter(
    (row) => row.protocolMetadata?.attemptCondition,
  );
  const result = new Map();
  for (const row of rows) {
    if (result.has(row.repetitionId)) {
      throw new Error(
        `duplicate protocol metadata audit row ${row.repetitionId}`,
      );
    }
    result.set(row.repetitionId, {
      attemptCondition: row.protocolMetadata.attemptCondition,
      source: "post_round_a_targeted_audit",
    });
  }
  return result;
}

function exclusionReason(row, suggestionItem, protocolMetadata) {
  if (row.quality?.analysisReadiness !== "ready") {
    return "quality_limited";
  }
  if (!suggestionItem) {
    return row.actionType === "rotary_stability"
      ? "feature_only_action"
      : "suggestion_unavailable";
  }
  if (suggestionItem.totalScore !== null) {
    return null;
  }
  if (suggestionItem.status === "needs_heel_elevated_attempt") {
    return protocolMetadata?.attemptCondition === "floor"
      ? "staged_followup_attempt_required"
      : "protocol_metadata_required";
  }
  return suggestionItem.status ?? "suggestion_unavailable";
}

function summarizeSuggestionUniverse(rows) {
  const byAction = Object.fromEntries(
    [...new Set(rows.map((row) => row.actionType))].sort().map((actionType) => {
      const actionRows = rows.filter((row) => row.actionType === actionType);
      return [
        actionType,
        {
          total: actionRows.length,
          featureReady: actionRows.filter((row) => row.featureReady).length,
          comparisonEligible: actionRows.filter((row) => row.comparisonEligible)
            .length,
          excludedByReason: countBy(
            actionRows.filter((row) => !row.comparisonEligible),
            "exclusionReason",
          ),
        },
      ];
    }),
  );
  return {
    total: rows.length,
    featureReady: rows.filter((row) => row.featureReady).length,
    comparisonEligible: rows.filter((row) => row.comparisonEligible).length,
    excludedByReason: countBy(
      rows.filter((row) => !row.comparisonEligible),
      "exclusionReason",
    ),
    byAction,
  };
}

export function buildLeakageFreeAiSuggestions({
  featureMatrix,
  canonical,
  protocolMetadataAudit = null,
}) {
  if (!Array.isArray(featureMatrix?.rows)) {
    throw new Error("feature matrix rows are required");
  }
  if (!Array.isArray(canonical?.repetitions)) {
    throw new Error("canonical repetitions are required");
  }

  const protocolByRepetition = new Map(
    canonical.repetitions.map((row) => [
      row.repetitionId,
      {
        attemptCondition: row.attemptCondition ?? null,
        source: row.attemptCondition ? "canonical" : "missing",
      },
    ]),
  );
  for (const [repetitionId, metadata] of auditedProtocolMetadata(
    protocolMetadataAudit,
  )) {
    if (!protocolByRepetition.has(repetitionId)) {
      throw new Error(
        `protocol metadata audit references unknown repetition ${repetitionId}`,
      );
    }
    protocolByRepetition.set(repetitionId, metadata);
  }
  const rows = featureMatrix.rows.map((row) => {
    if (!protocolByRepetition.has(row.repetitionId)) {
      throw new Error(`canonical protocol row is missing ${row.repetitionId}`);
    }
    const adapter = getMovementAdapter(row.actionType);
    if (!adapter) {
      throw new Error(`movement adapter is missing ${row.actionType}`);
    }
    const featureItem = buildFeatureItem(row);
    const timingReport = buildTimingReport(row);
    const protocolMetadata = protocolByRepetition.get(row.repetitionId);
    const segment = buildSegment(row, protocolMetadata);
    const report = adapter.buildSuggestionReport({
      featureReport: { items: [featureItem] },
      timingReport,
      segments: [segment],
      notes: "",
      fileName: "",
    });
    const suggestionItem = report?.items?.[0] ?? null;
    const reason = exclusionReason(row, suggestionItem, protocolMetadata);
    return {
      repetitionId: row.repetitionId,
      ingestId: row.ingestId,
      videoId: row.videoId,
      actionType: row.actionType,
      repetitionIndex: row.repetitionIndex,
      cameraView: row.cameraView,
      side: row.side,
      startSecond: row.startSecond,
      endSecond: row.endSecond,
      featureReady: row.quality?.analysisReadiness === "ready",
      featureQualityReasons: row.quality?.reasons ?? [],
      suggestionStatus: suggestionItem?.status ?? "feature_only",
      scoringStatus: suggestionItem?.scoringStatus ?? "not_scored",
      scoreSource: suggestionItem?.scoreSource ?? null,
      aiSuggestedScore: suggestionItem?.totalScore ?? null,
      rawPoseScore:
        suggestionItem?.rawAttemptScore ?? suggestionItem?.rawPoseScore ?? null,
      confidence: suggestionItem?.confidence ?? null,
      confidenceLabel: suggestionItem?.confidenceLabel ?? null,
      modelVersion:
        suggestionItem?.modelVersion ?? report?.modelVersion ?? null,
      protocolMetadataSource: protocolMetadata.source,
      attemptCondition: protocolMetadata.attemptCondition,
      comparisonEligible: reason === null,
      exclusionReason: reason,
    };
  });

  return { summary: summarizeSuggestionUniverse(rows), rows };
}

function confusionMatrix(rows) {
  const matrix = SCORE_CATEGORIES.map(() => SCORE_CATEGORIES.map(() => 0));
  for (const row of rows) {
    matrix[row.humanConsensusScore][row.aiSuggestedScore] += 1;
  }
  return { labels: SCORE_CATEGORIES, matrix };
}

function comparisonMetrics(rows) {
  if (!rows.length) {
    return {
      comparedCount: 0,
      exactCount: 0,
      exactRate: null,
      withinOneCount: 0,
      withinOneRate: null,
      meanAbsoluteDifference: null,
      meanSignedDifference: null,
      aiHigherCount: 0,
      aiLowerCount: 0,
      linearWeightedKappa: null,
      quadraticWeightedKappa: null,
      confusionMatrix: confusionMatrix([]),
    };
  }
  const exactCount = rows.filter((row) => row.absoluteDifference === 0).length;
  const withinOneCount = rows.filter(
    (row) => row.absoluteDifference <= 1,
  ).length;
  const scorePairs = rows.map((row) => ({
    leftScore: row.humanConsensusScore,
    rightScore: row.aiSuggestedScore,
  }));
  return {
    comparedCount: rows.length,
    exactCount,
    exactRate: rate(exactCount, rows.length),
    withinOneCount,
    withinOneRate: rate(withinOneCount, rows.length),
    meanAbsoluteDifference: round(
      rows.reduce((sum, row) => sum + row.absoluteDifference, 0) / rows.length,
    ),
    meanSignedDifference: round(
      rows.reduce((sum, row) => sum + row.signedDifference, 0) / rows.length,
    ),
    aiHigherCount: rows.filter((row) => row.signedDifference > 0).length,
    aiLowerCount: rows.filter((row) => row.signedDifference < 0).length,
    linearWeightedKappa: weightedCohenKappa(scorePairs, "linear"),
    quadraticWeightedKappa: weightedCohenKappa(scorePairs, "quadratic"),
    confusionMatrix: confusionMatrix(rows),
  };
}

function followUpReason(row) {
  if (!row.comparisonEligible) {
    return row.exclusionReason;
  }
  if (row.signedDifference >= 2) return "ai_higher_by_2_or_more";
  if (row.signedDifference === 1) return "ai_higher_by_1";
  if (row.signedDifference <= -2) return "ai_lower_by_2_or_more";
  if (row.signedDifference === -1) return "ai_lower_by_1";
  return null;
}

function followUpPriority(row) {
  if (
    row.exclusionReason === "protocol_metadata_required" ||
    Math.abs(row.signedDifference ?? 0) >= 2
  ) {
    return "high";
  }
  if (row.exclusionReason === "feature_only_action") {
    return "expected_boundary";
  }
  return "medium";
}

export function summarizeAiConsensusEvidence({ agreement, suggestions }) {
  if (!Array.isArray(agreement?.analysis?.comparisonRows)) {
    throw new Error("agreement comparison rows are required");
  }
  if (!Array.isArray(suggestions?.rows)) {
    throw new Error("AI suggestion rows are required");
  }
  const suggestionsByRepetition = new Map(
    suggestions.rows.map((row) => [row.repetitionId, row]),
  );
  const consensusRows = agreement.analysis.comparisonRows.filter(
    (row) =>
      row.leftStatus === "scored" &&
      row.rightStatus === "scored" &&
      row.leftScore === row.rightScore,
  );
  const rows = consensusRows.map((reviewRow) => {
    const suggestion = suggestionsByRepetition.get(reviewRow.repetitionId);
    if (!suggestion) {
      throw new Error(`AI suggestion is missing ${reviewRow.repetitionId}`);
    }
    const comparable = suggestion.comparisonEligible;
    const signedDifference = comparable
      ? suggestion.aiSuggestedScore - reviewRow.leftScore
      : null;
    return {
      ...suggestion,
      humanConsensusScore: reviewRow.leftScore,
      leftReviewerId: reviewRow.leftReviewerId,
      rightReviewerId: reviewRow.rightReviewerId,
      signedDifference,
      absoluteDifference: comparable ? Math.abs(signedDifference) : null,
      exactMatch: comparable ? signedDifference === 0 : null,
      withinOnePoint: comparable ? Math.abs(signedDifference) <= 1 : null,
    };
  });
  const comparedRows = rows.filter((row) => row.comparisonEligible);
  const actionTypes = [...new Set(rows.map((row) => row.actionType))].sort();
  const byAction = Object.fromEntries(
    actionTypes.map((actionType) => {
      const actionRows = rows.filter((row) => row.actionType === actionType);
      const actionCompared = actionRows.filter((row) => row.comparisonEligible);
      return [
        actionType,
        {
          consensusCount: actionRows.length,
          comparisonEligibleCount: actionCompared.length,
          excludedByReason: countBy(
            actionRows.filter((row) => !row.comparisonEligible),
            "exclusionReason",
          ),
          metrics: comparisonMetrics(actionCompared),
        },
      ];
    }),
  );
  const followUpQueue = rows
    .filter((row) => !row.comparisonEligible || row.absoluteDifference > 0)
    .map((row) => ({
      priority: followUpPriority(row),
      followUpReason: followUpReason(row),
      repetitionId: row.repetitionId,
      videoId: row.videoId,
      actionType: row.actionType,
      humanConsensusScore: row.humanConsensusScore,
      aiSuggestedScore: row.aiSuggestedScore,
      signedDifference: row.signedDifference,
      cameraView: row.cameraView,
      startSecond: row.startSecond,
      endSecond: row.endSecond,
    }));

  return {
    pilotId: agreement.analysis.pilotId,
    studyRound: agreement.analysis.studyRound,
    consensusCount: rows.length,
    featureReadyCount: rows.filter((row) => row.featureReady).length,
    comparisonEligibleCount: comparedRows.length,
    excludedCount: rows.length - comparedRows.length,
    excludedByReason: countBy(
      rows.filter((row) => !row.comparisonEligible),
      "exclusionReason",
    ),
    metrics: comparisonMetrics(comparedRows),
    byAction,
    actionableFollowUpCount: followUpQueue.filter(
      (row) => row.priority !== "expected_boundary",
    ).length,
    followUpQueue,
    rows,
  };
}
