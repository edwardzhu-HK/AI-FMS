import assert from "node:assert/strict";
import test from "node:test";

import { auditHistoricalLabels } from "../src/lib/historical-label-audit.js";

function agreement(scores) {
  return {
    comparisonRows: scores.map(
      ({ repetitionId, actionType = "deep_squat", score }) => ({
        repetitionId,
        actionType,
        leftStatus: score == null ? "unscorable" : "scored",
        rightStatus: score == null ? "unscorable" : "scored",
        leftScore: score,
        rightScore: score,
      }),
    ),
  };
}

test("promotes only stable exact historical matches", () => {
  const canonical = {
    repetitions: [
      { repetitionId: "exact", humanReviewSummary: { consensusScore: 2 } },
      { repetitionId: "different", humanReviewSummary: { consensusScore: 3 } },
      { repetitionId: "changed", humanReviewSummary: { consensusScore: 3 } },
      { repetitionId: "missing", humanReviewSummary: { consensusScore: null } },
      { repetitionId: "unscorable", humanReviewSummary: { consensusScore: 2 } },
    ],
  };
  const closeout = {
    pilotId: "pilot-test",
    roundAAgreement: agreement([
      { repetitionId: "exact", score: 2 },
      { repetitionId: "different", score: 2 },
      { repetitionId: "changed", score: 3 },
      { repetitionId: "missing", score: 2 },
      { repetitionId: "unscorable", score: null },
    ]),
    roundBAgreement: agreement([
      { repetitionId: "exact", score: 2 },
      { repetitionId: "different", score: 2 },
      { repetitionId: "changed", score: 2 },
      { repetitionId: "missing", score: 2 },
      { repetitionId: "unscorable", score: null },
    ]),
  };

  const result = auditHistoricalLabels({ canonical, closeout });

  assert.equal(result.summary.confirmedAuditedWeakLabelCount, 1);
  assert.equal(result.summary.stableBlindHistoricalDisagreementCount, 1);
  assert.equal(result.summary.blindConsensusChangedCount, 1);
  assert.equal(result.summary.stableBlindHistoricalMissingCount, 1);
  assert.equal(result.summary.noNumericConsensusBothRoundsCount, 1);
  assert.equal(result.promotionPolicy.rewritesCanonicalHistoricalLabels, false);
  assert.equal(
    result.rows.find((row) => row.repetitionId === "exact").classification,
    "confirmed_audited_weak_label",
  );
});
