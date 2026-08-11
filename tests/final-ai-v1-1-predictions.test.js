import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildFinalAiV11Predictions } from "../scripts/build-final-ai-v1-1-predictions.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"),
  );
}

function collectKeys(value, result = []) {
  if (!value || typeof value !== "object") return result;
  for (const [key, child] of Object.entries(value)) {
    result.push(key);
    collectKeys(child, result);
  }
  return result;
}

test("final AI protocol audit covers all eight formal Deep Squat reps without human scores", () => {
  const formal = readJson(
    "research/pilot-v1/generated/formal-study-manifest.json",
  );
  const audit = readJson("research/pilot-v1/final-ai-protocol-audit.json");
  const expectedIds = formal.items
    .filter((item) => item.actionType === "deep_squat")
    .map((item) => item.repetitionId)
    .sort();

  assert.deepEqual(
    audit.rows.map((row) => row.repetitionId).sort(),
    expectedIds,
  );
  assert.equal(audit.policy.humanScoresUsed, false);
  assert.equal(audit.policy.roundBStudyModeChanged, false);
  assert.equal(
    collectKeys(audit.rows).some((key) => /human|reviewer|score/i.test(key)),
    false,
  );
});

test("final AI v1.1 rebuild keeps frozen predictions stable after product changes", () => {
  const temporaryOutput = fs.mkdtempSync(
    path.join(os.tmpdir(), "ai-fms-final-v1-1-"),
  );
  try {
    const result = buildFinalAiV11Predictions({
      repoRoot: REPO_ROOT,
      outputDir: temporaryOutput,
    });
    const checkedIn = readJson(
      "research/pilot-v1/generated/final-ai-v1-1/final-ai-v1-1-predictions.json",
    );

    assert.equal(result.payload.summary.formalItems, 32);
    assert.equal(result.payload.summary.scoreAvailable, 28);
    assert.equal(result.payload.summary.abstained, 4);
    assert.equal(
      result.payload.summary.byAction.rotary_stability.scoreAvailable,
      8,
    );
    assert.deepEqual(result.payload.rows, checkedIn.rows);
    assert.equal(result.payload.evaluationBoundary.humanLabelsLoaded, false);
    assert.equal(
      result.payload.evaluationBoundary.roundBStudyModeLoaded,
      false,
    );
    assert.equal(
      collectKeys(result.payload.rows).some((key) =>
        /human|reviewer|file(name)?|path|legacy/i.test(key),
      ),
      false,
    );
  } finally {
    fs.rmSync(temporaryOutput, { recursive: true, force: true });
  }
});
