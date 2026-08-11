import { weightedCohenKappa } from "./study-review-agreement.js";

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function rate(numerator, denominator) {
  return denominator > 0 ? round(numerator / denominator) : null;
}

function consensusMap(agreement) {
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

function classify({ roundAConsensus, roundBConsensus, historicalScore }) {
  if (
    !Number.isInteger(roundAConsensus) ||
    !Number.isInteger(roundBConsensus)
  ) {
    return "no_numeric_consensus_in_both_rounds";
  }
  if (roundAConsensus !== roundBConsensus) {
    return "blind_consensus_changed_between_rounds";
  }
  if (!Number.isInteger(historicalScore)) {
    return "stable_blind_historical_label_missing";
  }
  return roundAConsensus === historicalScore
    ? "confirmed_audited_weak_label"
    : "stable_blind_disagrees_with_historical";
}

function summarizeRows(rows) {
  const roundBComparable = rows.filter(
    (row) =>
      Number.isInteger(row.roundBConsensus) &&
      Number.isInteger(row.historicalScore),
  );
  const exactCount = roundBComparable.filter(
    (row) => row.roundBConsensus === row.historicalScore,
  ).length;
  const withinOneCount = roundBComparable.filter(
    (row) => Math.abs(row.roundBConsensus - row.historicalScore) <= 1,
  ).length;
  const pairs = roundBComparable.map((row) => ({
    leftScore: row.roundBConsensus,
    rightScore: row.historicalScore,
  }));
  return {
    formalItems: rows.length,
    roundAConsensusCount: rows.filter((row) =>
      Number.isInteger(row.roundAConsensus),
    ).length,
    roundBConsensusCount: rows.filter((row) =>
      Number.isInteger(row.roundBConsensus),
    ).length,
    stableBlindConsensusCount: rows.filter(
      (row) =>
        Number.isInteger(row.roundAConsensus) &&
        row.roundAConsensus === row.roundBConsensus,
    ).length,
    confirmedAuditedWeakLabelCount: rows.filter(
      (row) => row.classification === "confirmed_audited_weak_label",
    ).length,
    stableBlindHistoricalDisagreementCount: rows.filter(
      (row) => row.classification === "stable_blind_disagrees_with_historical",
    ).length,
    stableBlindHistoricalMissingCount: rows.filter(
      (row) => row.classification === "stable_blind_historical_label_missing",
    ).length,
    blindConsensusChangedCount: rows.filter(
      (row) => row.classification === "blind_consensus_changed_between_rounds",
    ).length,
    noNumericConsensusBothRoundsCount: rows.filter(
      (row) => row.classification === "no_numeric_consensus_in_both_rounds",
    ).length,
    roundBHistoricalComparableCount: roundBComparable.length,
    roundBHistoricalExactCount: exactCount,
    roundBHistoricalExactRate: rate(exactCount, roundBComparable.length),
    roundBHistoricalWithinOneCount: withinOneCount,
    roundBHistoricalWithinOneRate: rate(
      withinOneCount,
      roundBComparable.length,
    ),
    roundBHistoricalMeanAbsoluteDifference: roundBComparable.length
      ? round(
          roundBComparable.reduce(
            (sum, row) =>
              sum + Math.abs(row.roundBConsensus - row.historicalScore),
            0,
          ) / roundBComparable.length,
        )
      : null,
    roundBHistoricalLinearWeightedKappa: weightedCohenKappa(pairs, "linear"),
    roundBHistoricalQuadraticWeightedKappa: weightedCohenKappa(
      pairs,
      "quadratic",
    ),
  };
}

export function auditHistoricalLabels({ canonical, closeout }) {
  const roundA = consensusMap(closeout.roundAAgreement);
  const roundB = consensusMap(closeout.roundBAgreement);
  const historical = new Map(
    canonical.repetitions.map((item) => [
      item.repetitionId,
      item.humanReviewSummary?.consensusScore ?? null,
    ]),
  );
  const formalRows = closeout.roundBAgreement.comparisonRows;
  const rows = formalRows
    .map((item) => {
      const row = {
        repetitionId: item.repetitionId,
        actionType: item.actionType,
        roundAConsensus: roundA.get(item.repetitionId) ?? null,
        roundBConsensus: roundB.get(item.repetitionId) ?? null,
        historicalScore: historical.get(item.repetitionId) ?? null,
      };
      return { ...row, classification: classify(row) };
    })
    .sort((left, right) => left.repetitionId.localeCompare(right.repetitionId));

  return {
    schemaVersion: "ai_fms_historical_label_audit_v1",
    pilotId: closeout.pilotId,
    summary: summarizeRows(rows),
    byAction: Object.fromEntries(
      [...new Set(rows.map((row) => row.actionType))]
        .sort()
        .map((actionType) => [
          actionType,
          summarizeRows(rows.filter((row) => row.actionType === actionType)),
        ]),
    ),
    rows,
    promotionPolicy: {
      promotedClassification: "confirmed_audited_weak_label",
      rewritesCanonicalHistoricalLabels: false,
      extrapolatesToUnsampledHistoricalLabels: false,
      interpretation:
        "The formal blind sample audits only matching repetition IDs; it does not validate the remaining historical labels in the 110-rep pool.",
    },
  };
}
