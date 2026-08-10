import {
  summarizeStudyReviewAgreement,
  weightedCohenKappa,
} from "./study-review-agreement.js";
import { latestStudyReviews } from "./study-review.js";

const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 };

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function rate(numerator, denominator) {
  return denominator > 0 ? round(numerator / denominator) : null;
}

function mean(values) {
  return values.length
    ? round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function byReviewer(exports) {
  return new Map(exports.map((payload) => [payload.reviewerId, payload]));
}

function assertBlindReviewExports(exports) {
  for (const payload of exports) {
    for (const review of latestStudyReviews(payload.events).values()) {
      if (
        review.blindReview?.reviewMode !== "blind" ||
        review.blindReview?.currentPoseEvidenceShown !== false ||
        review.blindReview?.currentAiSuggestionShown !== false
      ) {
        throw new Error(
          `${payload.studyRound} export contains a non-blind review event`,
        );
      }
    }
  }
}

function buildReviewerChanges(roundAExport, roundBExport) {
  const roundA = latestStudyReviews(roundAExport.events);
  const roundB = latestStudyReviews(roundBExport.events);
  const rows = roundAExport.expectedRepetitionIds.map((repetitionId) => {
    const before = roundA.get(repetitionId);
    const after = roundB.get(repetitionId);
    if (!before || !after) {
      throw new Error(`reviewer change row is missing ${repetitionId}`);
    }
    const bothScored = before.status === "scored" && after.status === "scored";
    const confidenceDelta =
      CONFIDENCE_RANK[before.confidence] && CONFIDENCE_RANK[after.confidence]
        ? CONFIDENCE_RANK[after.confidence] - CONFIDENCE_RANK[before.confidence]
        : null;
    return {
      repetitionId,
      actionType: before.actionType,
      roundAStatus: before.status,
      roundBStatus: after.status,
      roundAScore: before.score,
      roundBScore: after.score,
      statusChanged: before.status !== after.status,
      scoreComparable: bothScored,
      scoreChanged: bothScored ? before.score !== after.score : null,
      confidenceDelta,
      reviewDurationDeltaMs: after.reviewDurationMs - before.reviewDurationMs,
      blindReview: after.blindReview?.reviewMode === "blind",
    };
  });
  const scoreComparableRows = rows.filter((row) => row.scoreComparable);
  const scoreChangedCount = scoreComparableRows.filter(
    (row) => row.scoreChanged,
  ).length;
  return {
    reviewerId: roundAExport.reviewerId,
    summary: {
      totalItems: rows.length,
      statusChangedCount: rows.filter((row) => row.statusChanged).length,
      scoreComparableCount: scoreComparableRows.length,
      scoreChangedCount,
      scoreChangeRate: rate(scoreChangedCount, scoreComparableRows.length),
      meanConfidenceDelta: mean(
        rows.map((row) => row.confidenceDelta).filter(Number.isFinite),
      ),
      meanReviewDurationDeltaMs: mean(
        rows.map((row) => row.reviewDurationDeltaMs).filter(Number.isFinite),
      ),
      blindReviewCount: rows.filter((row) => row.blindReview).length,
    },
    rows,
  };
}

function consensusByRepetition(agreement) {
  return new Map(
    agreement.comparisonRows
      .filter(
        (row) =>
          row.leftStatus === "scored" &&
          row.rightStatus === "scored" &&
          row.leftScore === row.rightScore,
      )
      .map((row) => [row.repetitionId, row.leftScore]),
  );
}

function summarizeAiPairs(rows) {
  if (!rows.length) {
    return {
      comparedCount: 0,
      exactCount: 0,
      exactRate: null,
      withinOneCount: 0,
      withinOneRate: null,
      meanAbsoluteDifference: null,
      linearWeightedKappa: null,
      quadraticWeightedKappa: null,
    };
  }
  const exactCount = rows.filter((row) => row.absoluteDifference === 0).length;
  const withinOneCount = rows.filter(
    (row) => row.absoluteDifference <= 1,
  ).length;
  const pairs = rows.map((row) => ({
    leftScore: row.humanConsensusScore,
    rightScore: row.aiSuggestedScore,
  }));
  return {
    comparedCount: rows.length,
    exactCount,
    exactRate: rate(exactCount, rows.length),
    withinOneCount,
    withinOneRate: rate(withinOneCount, rows.length),
    meanAbsoluteDifference: mean(rows.map((row) => row.absoluteDifference)),
    linearWeightedKappa: weightedCohenKappa(pairs, "linear"),
    quadraticWeightedKappa: weightedCohenKappa(pairs, "quadratic"),
  };
}

function compareAiToConsensus(evidence, agreement) {
  const consensus = consensusByRepetition(agreement);
  const eligibleItems = evidence.items.filter((item) => item.aiSuggestion);
  const rows = eligibleItems
    .filter((item) => consensus.has(item.repetitionId))
    .map((item) => {
      const humanConsensusScore = consensus.get(item.repetitionId);
      const aiSuggestedScore = item.aiSuggestion.totalScore;
      return {
        repetitionId: item.repetitionId,
        actionType: item.actionType,
        humanConsensusScore,
        aiSuggestedScore,
        absoluteDifference: Math.abs(humanConsensusScore - aiSuggestedScore),
      };
    });
  const byAction = Object.fromEntries(
    [...new Set(rows.map((row) => row.actionType))]
      .sort()
      .map((actionType) => [
        actionType,
        summarizeAiPairs(rows.filter((row) => row.actionType === actionType)),
      ]),
  );
  return {
    aiScoreAvailableCount: eligibleItems.length,
    humanConsensusCount: consensus.size,
    consensusComparableCount: rows.length,
    coverageRate: rate(rows.length, evidence.summary.totalItems),
    metrics: summarizeAiPairs(rows),
    byAction,
    rows,
  };
}

function comparePredictionPackageToConsensus(predictions, agreement) {
  const consensus = consensusByRepetition(agreement);
  const eligibleItems = predictions.rows.filter(
    (item) =>
      item.comparisonEligible && Number.isInteger(item.aiSuggestedScore),
  );
  const rows = eligibleItems
    .filter((item) => consensus.has(item.repetitionId))
    .map((item) => {
      const humanConsensusScore = consensus.get(item.repetitionId);
      return {
        repetitionId: item.repetitionId,
        actionType: item.actionType,
        humanConsensusScore,
        aiSuggestedScore: item.aiSuggestedScore,
        absoluteDifference: Math.abs(
          humanConsensusScore - item.aiSuggestedScore,
        ),
      };
    });
  return {
    aiScoreAvailableCount: eligibleItems.length,
    humanConsensusCount: consensus.size,
    consensusComparableCount: rows.length,
    coverageRate: rate(rows.length, predictions.summary.formalItems),
    metrics: summarizeAiPairs(rows),
    byAction: Object.fromEntries(
      [...new Set(rows.map((row) => row.actionType))]
        .sort()
        .map((actionType) => [
          actionType,
          summarizeAiPairs(rows.filter((row) => row.actionType === actionType)),
        ]),
    ),
    rows,
  };
}

export function summarizeRoundBCloseout({
  roundAExports,
  roundBExports,
  evidence,
  finalPredictions = null,
}) {
  if (roundAExports.length !== 2 || roundBExports.length !== 2) {
    throw new Error("Round A and Round B each require two reviewer exports.");
  }
  assertBlindReviewExports([...roundAExports, ...roundBExports]);
  const roundAByReviewer = byReviewer(roundAExports);
  const roundBByReviewer = byReviewer(roundBExports);
  const reviewerIds = [...roundAByReviewer.keys()].sort();
  if (
    reviewerIds.length !== 2 ||
    reviewerIds.some((reviewerId) => !roundBByReviewer.has(reviewerId))
  ) {
    throw new Error("Round A and Round B reviewer identities must match.");
  }
  const roundAAgreement = summarizeStudyReviewAgreement(
    roundAExports[0],
    roundAExports[1],
  );
  const roundBAgreement = summarizeStudyReviewAgreement(
    roundBExports[0],
    roundBExports[1],
  );
  return {
    schemaVersion: "ai_fms_round_b_closeout_analysis_v2",
    pilotId: roundAAgreement.pilotId,
    aiBenchmarkFreeze: {
      freezeId: evidence.freezeId,
      manifestFingerprint: evidence.manifestFingerprint,
      ruleFingerprint: evidence.modelFreeze.ruleFingerprint,
    },
    roundAAgreement,
    roundBAgreement,
    reviewerChanges: reviewerIds.map((reviewerId) =>
      buildReviewerChanges(
        roundAByReviewer.get(reviewerId),
        roundBByReviewer.get(reviewerId),
      ),
    ),
    aiComparison: {
      roundAConsensus: compareAiToConsensus(evidence, roundAAgreement),
      roundBConsensus: compareAiToConsensus(evidence, roundBAgreement),
      finalV11: finalPredictions
        ? {
            packageVersion: finalPredictions.packageVersion,
            packageFingerprint: finalPredictions.packageFingerprint,
            roundAConsensus: comparePredictionPackageToConsensus(
              finalPredictions,
              roundAAgreement,
            ),
            roundBConsensus: comparePredictionPackageToConsensus(
              finalPredictions,
              roundBAgreement,
            ),
            interpretation: "post_audit_internal_benchmark_not_held_out",
          }
        : null,
      interpretation: "exploratory_concordance_not_clinical_validation",
      roundBReviewersBlindedToAi: true,
      roundBAssistedByDisplayedEvidence: false,
    },
  };
}
