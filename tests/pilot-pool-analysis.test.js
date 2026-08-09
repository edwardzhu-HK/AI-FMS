import assert from "node:assert/strict";
import test from "node:test";
import { summarizePilotPoolUtilization } from "../src/lib/pilot-pool-analysis.js";

const ids = ["gold", "formal", "candidate", "ready", "limited", "excluded"];

function canonicalRow(repetitionId, score = 2) {
  return {
    repetitionId,
    ingestId: `ing_${repetitionId}`,
    videoId: `video_${repetitionId}`,
    actionType: "deep_squat",
    repetitionIndex: 1,
    startSecond: 1,
    endSecond: 2,
    cameraView: "side",
    side: "none",
    humanReviewSummary: {
      consensusScore: score,
    },
  };
}

function blindabilityRow(repetitionId, eligible) {
  return {
    repetitionId,
    blindability: {
      status: eligible ? "eligible" : "excluded",
      exclusionReasons: eligible ? [] : ["visible_score_cue"],
    },
  };
}

function featureRow(repetitionId, ready) {
  return {
    repetitionId,
    quality: {
      analysisReadiness: ready ? "ready" : "limited",
      reasons: ready ? [] : ["timing_needs_adjustment"],
    },
    features: {
      peakDepthRatio: ids.indexOf(repetitionId) + 1,
      avgVisibility: 0.9,
    },
  };
}

function inputs() {
  return {
    canonical: {
      pilotId: "pilot",
      snapshotSourceDate: "2026-08-09",
      repetitions: ids.map((id) => canonicalRow(id)),
    },
    blindability: {
      items: [
        blindabilityRow("gold", true),
        blindabilityRow("formal", true),
        blindabilityRow("candidate", true),
        blindabilityRow("ready", false),
        blindabilityRow("limited", true),
        blindabilityRow("excluded", false),
      ],
    },
    featureMatrix: {
      rows: [
        featureRow("gold", true),
        featureRow("formal", true),
        featureRow("candidate", true),
        featureRow("ready", true),
        featureRow("limited", false),
        featureRow("excluded", false),
      ],
    },
    formalManifest: {
      items: [{ repetitionId: "gold" }, { repetitionId: "formal" }],
    },
    agreement: {
      analysis: {
        comparisonRows: [
          {
            repetitionId: "gold",
            leftStatus: "scored",
            rightStatus: "scored",
            leftScore: 2,
            rightScore: 2,
          },
          {
            repetitionId: "formal",
            leftStatus: "unscorable",
            rightStatus: "unscorable",
            leftScore: null,
            rightScore: null,
          },
        ],
      },
    },
    featureContract: {
      actions: {
        deep_squat: {
          features: [
            {
              name: "peakDepthRatio",
              unit: "ratio",
              direction: "higher",
            },
            {
              name: "avgVisibility",
              unit: "ratio_0_1",
              direction: "higher",
            },
          ],
        },
      },
    },
  };
}

test("pilot pool analysis keeps all evidence tiers instead of shrinking to gold rows", () => {
  const result = summarizePilotPoolUtilization(inputs());

  assert.equal(result.fullPool.total, 6);
  assert.equal(result.fullPool.featureReady, 4);
  assert.equal(result.fullPool.blindAndFeatureReady, 3);
  assert.deepEqual(result.tierCounts, {
    gold_consensus: 1,
    formal_non_consensus: 1,
    expansion_candidate: 1,
    feature_ready_not_blindable: 1,
    blindable_feature_limited: 1,
    not_blindable_feature_limited: 1,
  });
  assert.equal(result.expansionPool.reps, 1);
  assert.equal(result.historicalLabelBoundary.available, 6);
  assert.equal(result.readyFeatureSummary.deep_squat.count, 4);
  assert.equal(
    result.readyFeatureSummary.deep_squat.features.avgVisibility.role,
    "quality",
  );
});

test("pilot pool analysis fails when feature matrix does not cover canonical IDs", () => {
  const fixture = inputs();
  fixture.featureMatrix.rows.pop();

  assert.throws(
    () => summarizePilotPoolUtilization(fixture),
    /feature matrix repetition count does not match canonical pool/,
  );
});
