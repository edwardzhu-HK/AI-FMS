import { latestStudyReviews } from "./study-review.js";

const SCORE_CATEGORIES = [0, 1, 2, 3];

function rate(numerator, denominator) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : null;
}

function sameStringSet(left, right) {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}

function confusionMatrix(scorePairs) {
  const matrix = SCORE_CATEGORIES.map(() => SCORE_CATEGORIES.map(() => 0));
  for (const pair of scorePairs) {
    matrix[pair.leftScore][pair.rightScore] += 1;
  }
  return { labels: SCORE_CATEGORIES, matrix };
}

export function weightedCohenKappa(scorePairs, weighting = "quadratic") {
  if (!scorePairs.length) {
    return null;
  }
  if (!new Set(["linear", "quadratic"]).has(weighting)) {
    throw new Error("weighting must be linear or quadratic.");
  }

  const rowTotals = SCORE_CATEGORIES.map(() => 0);
  const columnTotals = SCORE_CATEGORIES.map(() => 0);
  let observedPenalty = 0;

  for (const { leftScore, rightScore } of scorePairs) {
    if (
      !SCORE_CATEGORIES.includes(leftScore) ||
      !SCORE_CATEGORIES.includes(rightScore)
    ) {
      throw new Error("weighted kappa requires FMS scores from 0 to 3.");
    }
    rowTotals[leftScore] += 1;
    columnTotals[rightScore] += 1;
    const distance = Math.abs(leftScore - rightScore) / 3;
    observedPenalty += weighting === "quadratic" ? distance ** 2 : distance;
  }

  observedPenalty /= scorePairs.length;
  let expectedPenalty = 0;
  for (const leftScore of SCORE_CATEGORIES) {
    for (const rightScore of SCORE_CATEGORIES) {
      const distance = Math.abs(leftScore - rightScore) / 3;
      const penalty = weighting === "quadratic" ? distance ** 2 : distance;
      expectedPenalty +=
        penalty *
        (rowTotals[leftScore] / scorePairs.length) *
        (columnTotals[rightScore] / scorePairs.length);
    }
  }

  if (expectedPenalty === 0) {
    return null;
  }
  return Number((1 - observedPenalty / expectedPenalty).toFixed(4));
}

function summarizeRows(rows) {
  const statusAgreementCount = rows.filter(
    (row) => row.leftStatus === row.rightStatus,
  ).length;
  const bothScoredRows = rows.filter(
    (row) => row.leftStatus === "scored" && row.rightStatus === "scored",
  );
  const bothUnscorableRows = rows.filter(
    (row) =>
      row.leftStatus === "unscorable" && row.rightStatus === "unscorable",
  );
  const scorePairs = bothScoredRows.map((row) => ({
    repetitionId: row.repetitionId,
    leftScore: row.leftScore,
    rightScore: row.rightScore,
  }));
  const exactScoreAgreementCount = scorePairs.filter(
    (pair) => pair.leftScore === pair.rightScore,
  ).length;
  const absoluteDifferences = scorePairs.map((pair) =>
    Math.abs(pair.leftScore - pair.rightScore),
  );
  const reasonAgreementCount = bothUnscorableRows.filter(
    (row) => row.leftUnscorableReason === row.rightUnscorableReason,
  ).length;

  return {
    expectedCount: rows.length,
    statusAgreementCount,
    statusAgreementRate: rate(statusAgreementCount, rows.length),
    bothScoredCount: bothScoredRows.length,
    bothUnscorableCount: bothUnscorableRows.length,
    scoreabilityMismatchCount: rows.length - statusAgreementCount,
    exactScoreAgreementCount,
    rawScoreAgreementRate: rate(
      exactScoreAgreementCount,
      bothScoredRows.length,
    ),
    meanAbsoluteScoreDifference: absoluteDifferences.length
      ? Number(
          (
            absoluteDifferences.reduce((sum, value) => sum + value, 0) /
            absoluteDifferences.length
          ).toFixed(4),
        )
      : null,
    linearWeightedKappa: weightedCohenKappa(scorePairs, "linear"),
    quadraticWeightedKappa: weightedCohenKappa(scorePairs, "quadratic"),
    unscorableReasonAgreementCount: reasonAgreementCount,
    unscorableReasonAgreementRate: rate(
      reasonAgreementCount,
      bothUnscorableRows.length,
    ),
    confusionMatrix: confusionMatrix(scorePairs),
  };
}

function buildQueue(rows) {
  const queue = [];
  for (const row of rows) {
    let disagreementType = null;
    if (row.leftStatus !== row.rightStatus) {
      disagreementType = "scoreability_mismatch";
    } else if (
      row.leftStatus === "scored" &&
      row.leftScore !== row.rightScore
    ) {
      disagreementType = "score_disagreement";
    } else if (
      row.leftStatus === "unscorable" &&
      row.leftUnscorableReason !== row.rightUnscorableReason
    ) {
      disagreementType = "unscorable_reason_disagreement";
    }
    if (disagreementType) {
      queue.push({ disagreementType, ...row });
    }
  }
  return queue;
}

export function summarizeStudyReviewAgreement(leftExport, rightExport) {
  if (leftExport?.pilotId !== rightExport?.pilotId) {
    throw new Error("review exports must use the same pilotId.");
  }
  if (leftExport?.studyRound !== rightExport?.studyRound) {
    throw new Error("review exports must use the same studyRound.");
  }
  if (leftExport?.reviewerId === rightExport?.reviewerId) {
    throw new Error("review exports must come from different reviewers.");
  }
  if (
    !sameStringSet(
      leftExport?.expectedRepetitionIds ?? [],
      rightExport?.expectedRepetitionIds ?? [],
    )
  ) {
    throw new Error("review exports must use the same repetition set.");
  }

  const leftLatest = latestStudyReviews(leftExport.events ?? []);
  const rightLatest = latestStudyReviews(rightExport.events ?? []);
  const comparisonRows = leftExport.expectedRepetitionIds.map(
    (repetitionId) => {
      const left = leftLatest.get(repetitionId);
      const right = rightLatest.get(repetitionId);
      if (!left || !right) {
        throw new Error(`missing latest review for ${repetitionId}.`);
      }
      return {
        repetitionId,
        ingestId: left.ingestId,
        actionType: left.actionType,
        leftReviewerId: leftExport.reviewerId,
        leftStatus: left.status,
        leftScore: left.score,
        leftConfidence: left.confidence,
        leftUnscorableReason: left.unscorableReason,
        leftComment: left.comment,
        rightReviewerId: rightExport.reviewerId,
        rightStatus: right.status,
        rightScore: right.score,
        rightConfidence: right.confidence,
        rightUnscorableReason: right.unscorableReason,
        rightComment: right.comment,
      };
    },
  );

  const actionTypes = [
    ...new Set(comparisonRows.map((row) => row.actionType)),
  ].sort();
  const byAction = Object.fromEntries(
    actionTypes.map((actionType) => [
      actionType,
      summarizeRows(
        comparisonRows.filter((row) => row.actionType === actionType),
      ),
    ]),
  );

  return {
    pilotId: leftExport.pilotId,
    studyRound: leftExport.studyRound,
    reviewers: [leftExport.reviewerId, rightExport.reviewerId],
    overall: summarizeRows(comparisonRows),
    byAction,
    disagreementQueue: buildQueue(comparisonRows),
    comparisonRows,
  };
}
