import assert from "node:assert/strict";
import test from "node:test";
import { summarizeCameraAuditedFeatureSensitivity } from "../scripts/build-camera-audited-feature-matrix.js";

function row(overrides = {}) {
  return {
    repetitionId: "rep_1",
    actionType: "deep_squat",
    cameraView: "front",
    features: { depth: 0.7 },
    ratings: { depth: "good" },
    qualifiers: {},
    quality: { analysisReadiness: "ready" },
    ...overrides,
  };
}

test("camera-audited sensitivity separates metadata and feature changes", () => {
  const summary = summarizeCameraAuditedFeatureSensitivity({
    baseMatrix: {
      matrixFingerprint: "base",
      summary: { total: 1, ready: 1, limited: 0 },
      rows: [row()],
    },
    auditedMatrix: {
      matrixFingerprint: "audited",
      summary: { total: 1, ready: 1, limited: 0 },
      rows: [
        row({
          cameraView: "side",
          ratings: { depth: "watch" },
        }),
      ],
    },
  });

  assert.equal(summary.cameraViewChanges, 1);
  assert.equal(summary.rowsWithFeatureChanges, 0);
  assert.equal(summary.rowsWithRatingChanges, 1);
  assert.equal(summary.rowsWithReadinessChanges, 0);
  assert.deepEqual(summary.changedRows[0].ratingChanges, ["depth"]);
});
