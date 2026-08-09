import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateReviewFile } from "../scripts/validate-study-review-export.js";
import {
  buildStudyReviewExport,
  createStudyReviewEvent,
} from "../src/lib/study-review.js";

const manifest = {
  pilotId: "formal_test",
  sourceSnapshotDate: "2026-08-09T00:00:00.000Z",
  sourcePoolFingerprint: "pool_hash",
  sourceFeatureMatrixFingerprint: "feature_hash",
  items: [
    {
      repetitionId: "rep_1",
      ingestId: "ing_1",
      actionType: "deep_squat",
    },
  ],
};

test("review file validator reports a complete export and its checksum", () => {
  const event = createStudyReviewEvent({
    pilotId: manifest.pilotId,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    repetition: manifest.items[0],
    score: 2,
    eventId: "event_1",
    now: new Date("2026-08-09T00:00:20.000Z"),
    reviewStartedAt: "2026-08-09T00:00:00.000Z",
    reviewDurationMs: 20000,
  });
  const payload = buildStudyReviewExport({
    pilot: manifest,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    events: [event],
    exportedAt: new Date("2026-08-09T00:01:00.000Z"),
  });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ai-fms-review-"));
  const reviewPath = path.join(directory, "review.json");
  fs.writeFileSync(reviewPath, `${JSON.stringify(payload, null, 2)}\n`);

  try {
    const result = validateReviewFile({ manifest, reviewPath });
    assert.equal(result.valid, true);
    assert.equal(result.completion.complete, true);
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("review file validator blocks partial formal exports by default", () => {
  const payload = buildStudyReviewExport({
    pilot: manifest,
    reviewerId: "Other Reviewer",
    studyRound: "round_a",
    events: [],
  });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ai-fms-review-"));
  const reviewPath = path.join(directory, "partial.json");
  fs.writeFileSync(reviewPath, `${JSON.stringify(payload, null, 2)}\n`);

  try {
    const result = validateReviewFile({ manifest, reviewPath });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /incomplete/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("review validator pins repetition IDs and source fingerprints", () => {
  const event = createStudyReviewEvent({
    pilotId: manifest.pilotId,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    repetition: manifest.items[0],
    score: 3,
    eventId: "event_tamper",
  });
  const payload = buildStudyReviewExport({
    pilot: manifest,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    events: [event],
  });
  payload.expectedRepetitionIds = [];
  payload.sourcePoolFingerprint = "changed";
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ai-fms-review-"));
  const reviewPath = path.join(directory, "tampered.json");
  fs.writeFileSync(reviewPath, `${JSON.stringify(payload, null, 2)}\n`);

  try {
    const result = validateReviewFile({ manifest, reviewPath });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /expectedRepetitionIds/);
    assert.match(result.errors.join(" "), /sourcePoolFingerprint/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
