import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDryRunStudyManifest,
  buildFormalStudyManifest,
} from "../scripts/freeze-formal-study-manifest.js";

function item({ repetitionId, videoId, startSecond, score }) {
  return {
    studyItemId: `study_${repetitionId}`,
    repetitionId,
    ingestId: `ing_${repetitionId}`,
    videoId,
    sourceCorrelationGroup: videoId,
    actionType: "deep_squat",
    clip: {
      startSecond,
      endSecond: startSecond + 4,
      videoRelativePath: `Eval_Videos/${videoId}.mp4`,
    },
    blindability: { status: "eligible" },
    internalStratification: {
      historicalConsensusScore: score,
      cameraView: "front",
      side: "none",
    },
  };
}

function selection(target = 2) {
  return {
    status: "frozen",
    studyId: "formal_test",
    frozenAt: "2026-08-09T00:00:00.000Z",
    seed: "test-seed",
    sourcePoolFingerprint: "pool-hash",
    sourceFeatureMatrixFingerprint: "feature-hash",
    actionTargets: { deep_squat: target },
    selectionMethod: "test",
    expectedSelectedRepetitionIds: [],
    decisionRationale: "test",
  };
}

function featureMatrix(items, limitedRepetitionIds = []) {
  return {
    matrixFingerprint: "feature-hash",
    rows: items.map((entry) => ({
      repetitionId: entry.repetitionId,
      quality: {
        analysisReadiness: limitedRepetitionIds.includes(entry.repetitionId)
          ? "limited"
          : "ready",
      },
    })),
  };
}

test("formal selection is deterministic and covers distinct source videos", () => {
  const items = [
    item({ repetitionId: "rep_1", videoId: "vid_1", startSecond: 1, score: 3 }),
    item({ repetitionId: "rep_2", videoId: "vid_1", startSecond: 6, score: 2 }),
    item({ repetitionId: "rep_3", videoId: "vid_2", startSecond: 1, score: 1 }),
  ];
  const blindability = {
    pilotId: "pilot_test",
    snapshotSourceDate: "2026-08-09T00:00:00.000Z",
    poolFingerprint: "pool-hash",
    items,
  };
  const first = buildFormalStudyManifest({
    blindability,
    featureMatrix: featureMatrix(items),
    selection: selection(),
  });
  const second = buildFormalStudyManifest({
    blindability,
    featureMatrix: featureMatrix(items),
    selection: selection(),
  });
  assert.deepEqual(first.items, second.items);
  assert.equal(
    new Set(first.items.map((entry) => entry.sourceCorrelationGroup)).size,
    2,
  );
});

test("formal selection never includes the same source clip twice", () => {
  const items = [
    item({ repetitionId: "rep_1", videoId: "vid_1", startSecond: 1, score: 3 }),
    item({
      repetitionId: "rep_duplicate",
      videoId: "vid_1",
      startSecond: 1,
      score: 3,
    }),
    item({ repetitionId: "rep_2", videoId: "vid_2", startSecond: 1, score: 2 }),
  ];
  const blindability = {
    pilotId: "pilot_test",
    snapshotSourceDate: "2026-08-09T00:00:00.000Z",
    poolFingerprint: "pool-hash",
    items,
  };
  const manifest = buildFormalStudyManifest({
    blindability,
    featureMatrix: featureMatrix(items),
    selection: selection(),
  });
  const clipKeys = manifest.items.map(
    (entry) =>
      `${entry.sourceCorrelationGroup}:${entry.startSecond}:${entry.endSecond}`,
  );
  assert.equal(new Set(clipKeys).size, clipKeys.length);
});

test("frozen selection rejects a changed source pool", () => {
  assert.throws(
    () =>
      buildFormalStudyManifest({
        blindability: {
          pilotId: "pilot_test",
          snapshotSourceDate: "2026-08-09T00:00:00.000Z",
          poolFingerprint: "changed-pool",
          items: [],
        },
        featureMatrix: {
          matrixFingerprint: "feature-hash",
          rows: [],
        },
        selection: selection(),
      }),
    /fingerprint/,
  );
});

test("feature-limited reps are excluded from formal selection", () => {
  const items = [
    item({
      repetitionId: "rep_limited",
      videoId: "vid_1",
      startSecond: 1,
      score: 3,
    }),
    item({
      repetitionId: "rep_ready",
      videoId: "vid_2",
      startSecond: 1,
      score: 2,
    }),
  ];
  const manifest = buildFormalStudyManifest({
    blindability: {
      pilotId: "pilot_test",
      snapshotSourceDate: "2026-08-09T00:00:00.000Z",
      poolFingerprint: "pool-hash",
      items,
    },
    featureMatrix: featureMatrix(items, ["rep_limited"]),
    selection: selection(1),
  });
  assert.equal(manifest.items[0].repetitionId, "rep_ready");
});

test("dry-run manifest uses a non-formal feature-ready rep", () => {
  const items = [
    item({ repetitionId: "rep_1", videoId: "vid_1", startSecond: 1, score: 3 }),
    item({ repetitionId: "rep_2", videoId: "vid_2", startSecond: 1, score: 2 }),
  ];
  const blindability = {
    pilotId: "pilot_test",
    snapshotSourceDate: "2026-08-09T00:00:00.000Z",
    poolFingerprint: "pool-hash",
    items,
  };
  const matrix = featureMatrix(items);
  const formalManifest = buildFormalStudyManifest({
    blindability,
    featureMatrix: matrix,
    selection: selection(1),
  });
  const dryRun = buildDryRunStudyManifest({
    blindability,
    featureMatrix: matrix,
    formalManifest,
    selection: selection(1),
  });
  assert.equal(dryRun.items.length, 1);
  assert.notEqual(
    dryRun.items[0].repetitionId,
    formalManifest.items[0].repetitionId,
  );
  assert.match(dryRun.items[0].videoPath, /study-dry-run-media\/dry_/);
});
