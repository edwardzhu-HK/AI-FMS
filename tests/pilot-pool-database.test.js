import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { summarizePilotPoolUtilization } from "../src/lib/pilot-pool-analysis.js";
import {
  ingestPilotPoolSnapshot,
  inspectPilotPoolSnapshot,
} from "../scripts/lib/pilot-pool-database.js";

function source(payload, name) {
  return {
    payload,
    path: `${name}.json`,
    sha256: name.padEnd(64, "0").slice(0, 64),
    checksumVerified: true,
  };
}

function fixture() {
  const canonical = {
    pilotId: "pilot",
    snapshotSourceDate: "2026-08-09",
    repetitions: ["rep_1", "rep_2"].map((repetitionId, index) => ({
      repetitionId,
      ingestId: `ing_${index}`,
      videoId: `video_${index}`,
      actionType: "deep_squat",
      repetitionIndex: index + 1,
      startSecond: index,
      endSecond: index + 1,
      cameraView: "side",
      side: "none",
      humanReviewSummary: {
        consensusScore: index + 2,
      },
    })),
  };
  const blindability = {
    poolFingerprint: "pool_fingerprint",
    items: ["rep_1", "rep_2"].map((repetitionId) => ({
      repetitionId,
      blindability: {
        status: "eligible",
        exclusionReasons: [],
      },
    })),
  };
  const featureMatrix = {
    matrixFingerprint: "feature_fingerprint",
    rows: ["rep_1", "rep_2"].map((repetitionId, index) => ({
      repetitionId,
      featureContractVersion: "contract-v1",
      poseSha256: `pose_${index}`,
      poseModel: { name: "test" },
      featureSourceSecond: index + 0.5,
      features: { peakDepthRatio: index + 1 },
      qualifiers: {},
      ratings: {},
      quality: {
        analysisReadiness: "ready",
        reasons: [],
      },
    })),
  };
  const formalManifest = {
    items: [{ repetitionId: "rep_1" }],
  };
  const agreement = {
    analysis: {
      comparisonRows: [
        {
          repetitionId: "rep_1",
          leftStatus: "scored",
          rightStatus: "scored",
          leftScore: 2,
          rightScore: 2,
        },
      ],
    },
  };
  const featureContract = {
    contractVersion: "contract-v1",
    actions: {
      deep_squat: {
        features: [
          {
            name: "peakDepthRatio",
            unit: "ratio",
            direction: "higher",
          },
        ],
      },
    },
  };
  const sources = {
    canonical: source(canonical, "canonical"),
    blindability: source(blindability, "blindability"),
    featureMatrix: source(featureMatrix, "features"),
    formalManifest: source(formalManifest, "formal"),
    agreement: source(agreement, "agreement"),
    featureContract: source(featureContract, "contract"),
  };
  const analysis = summarizePilotPoolUtilization({
    canonical,
    blindability,
    featureMatrix,
    formalManifest,
    agreement,
    featureContract,
  });
  return { sources, analysis };
}

test("pilot pool snapshot mirrors all repetitions and features idempotently", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ai-fms-pool-db-"));
  const dbPath = path.join(directory, "research.sqlite");
  const { sources, analysis } = fixture();

  try {
    const first = ingestPilotPoolSnapshot({ dbPath, sources, analysis });
    const second = ingestPilotPoolSnapshot({ dbPath, sources, analysis });
    const status = inspectPilotPoolSnapshot({ dbPath });

    assert.equal(first.alreadyImported, false);
    assert.equal(second.alreadyImported, true);
    assert.equal(status.snapshot.repetition_count, 2);
    assert.equal(status.snapshot.gold_consensus_count, 1);
    assert.equal(status.featureRows, 2);
    assert.deepEqual(
      Object.fromEntries(
        status.tiers.map((row) => [row.research_tier, row.count]),
      ),
      {
        expansion_candidate: 1,
        gold_consensus: 1,
      },
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
