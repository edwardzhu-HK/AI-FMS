import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWideCsv,
  sanitizePosePayload,
  validateFeatureContract,
} from "../scripts/build-pilot-feature-matrix.js";

test("feature contract requires unique named features with units and direction", () => {
  assert.throws(
    () =>
      validateFeatureContract({
        contractVersion: "test",
        actions: {
          deep_squat: {
            features: [
              { name: "depth", unit: "ratio", direction: "higher" },
              { name: "depth", unit: "ratio", direction: "higher" },
            ],
          },
        },
      }),
    /unique feature names/,
  );
});

test("pose sanitization removes filename and absolute path before extraction", () => {
  const sanitized = sanitizePosePayload(
    {
      sourceVideo: {
        videoId: "score-3-video",
        fileName: "rep score 3.mp4",
        path: "/private/rep score 3.mp4",
        processedStartSecond: 0,
      },
      frames: [],
    },
    "ing_1",
  );
  assert.equal(sanitized.sourceVideo.fileName, null);
  assert.equal(sanitized.sourceVideo.path, null);
  assert.equal(sanitized.sourceVideo.videoId, "canonical_ingest_ing_1");
});

test("wide feature CSV contains identifiers and features but no labels", () => {
  const contract = {
    actions: {
      deep_squat: {
        features: [{ name: "depth", unit: "ratio", direction: "higher" }],
      },
    },
  };
  const csv = buildWideCsv(
    {
      rows: [
        {
          repetitionId: "rep_1",
          ingestId: "ing_1",
          videoId: "vid_1",
          actionType: "deep_squat",
          repetitionIndex: 1,
          cameraView: "front",
          side: "none",
          startSecond: 1,
          endSecond: 4,
          poseSha256: "pose-hash",
          features: { depth: 0.7 },
          quality: {
            analysisReadiness: "ready",
            reasons: [],
            timingStatus: "good",
            featureStatus: "ok",
            poseAverageVisibility: 0.9,
            poseMissingFramesRatio: 0,
          },
        },
      ],
    },
    contract,
  );
  assert.match(csv, /feature_depth/);
  assert.doesNotMatch(csv, /historical|human_score|legacy_ai/i);
});
