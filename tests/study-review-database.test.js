import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ingestStudyReviewExport,
  inspectStudyReviewDatabase,
} from "../scripts/lib/study-review-database.js";
import {
  buildStudyReviewExport,
  createStudyReviewEvent,
} from "../src/lib/study-review.js";

const manifest = {
  pilotId: "database_test",
  sourceSnapshotDate: "2026-08-09T00:00:00.000Z",
  sourcePoolFingerprint: "pool_hash",
  sourceFeatureMatrixFingerprint: "feature_hash",
  items: [
    {
      repetitionId: "rep_1",
      ingestId: "ing_1",
      actionType: "deep_squat",
    },
    {
      repetitionId: "rep_2",
      ingestId: "ing_2",
      actionType: "active_straight_leg_raise",
    },
  ],
};

function writeSignedExport(directory, payload, name = "review.json") {
  const reviewPath = path.join(directory, name);
  const raw = `${JSON.stringify(payload, null, 2)}\n`;
  const checksum = crypto.createHash("sha256").update(raw).digest("hex");
  fs.writeFileSync(reviewPath, raw);
  fs.writeFileSync(`${reviewPath}.sha256`, `${checksum}  ${name}\n`);
  return reviewPath;
}

function buildCompletePayload() {
  const events = [
    createStudyReviewEvent({
      pilotId: manifest.pilotId,
      reviewerId: "Ronnie",
      repetition: manifest.items[0],
      score: 2,
      eventId: "event_scored",
    }),
    createStudyReviewEvent({
      pilotId: manifest.pilotId,
      reviewerId: "Ronnie",
      repetition: manifest.items[1],
      status: "unscorable",
      confidence: "high",
      unscorableReason: "missing_required_reference",
      comment: "Required reference is not visible.",
      eventId: "event_unscorable",
    }),
  ];
  return buildStudyReviewExport({
    pilot: manifest,
    reviewerId: "Ronnie",
    events,
  });
}

test("signed complete review exports ingest into SQLite idempotently", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ai-fms-db-"));
  const dbPath = path.join(directory, "study.sqlite");
  const reviewPath = writeSignedExport(directory, buildCompletePayload());

  try {
    const first = ingestStudyReviewExport({
      dbPath,
      manifest,
      reviewPath,
    });
    const second = ingestStudyReviewExport({
      dbPath,
      manifest,
      reviewPath,
    });
    const status = inspectStudyReviewDatabase({
      dbPath,
      pilotId: manifest.pilotId,
      studyRound: "round_a",
      reviewerId: "Ronnie",
    });

    assert.equal(first.alreadyImported, false);
    assert.equal(second.alreadyImported, true);
    assert.equal(status.exports.length, 1);
    assert.equal(status.totalEvents, 2);
    assert.equal(status.latest.resolved_count, 2);
    assert.equal(status.latest.scored_count, 1);
    assert.equal(status.latest.unscorable_count, 1);
    assert.equal(status.latest.analysis_excluded_count, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("study review database import rejects a checksum mismatch", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ai-fms-db-"));
  const dbPath = path.join(directory, "study.sqlite");
  const reviewPath = writeSignedExport(directory, buildCompletePayload());
  fs.appendFileSync(reviewPath, " ");

  try {
    assert.throws(
      () => ingestStudyReviewExport({ dbPath, manifest, reviewPath }),
      /SHA-256 mismatch/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("blind Round B exports ingest without reviewer evidence exposure", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ai-fms-db-"));
  const dbPath = path.join(directory, "study.sqlite");
  const events = manifest.items.map((repetition, index) =>
    createStudyReviewEvent({
      pilotId: manifest.pilotId,
      reviewerId: "Ronnie",
      studyRound: "round_b",
      repetition,
      score: 2,
      eventId: `round_b_event_${index}`,
    }),
  );
  const payload = buildStudyReviewExport({
    pilot: manifest,
    reviewerId: "Ronnie",
    studyRound: "round_b",
    events,
  });
  const reviewPath = writeSignedExport(directory, payload, "round-b.json");

  try {
    ingestStudyReviewExport({
      dbPath,
      manifest,
      reviewPath,
    });
    const status = inspectStudyReviewDatabase({
      dbPath,
      pilotId: manifest.pilotId,
      studyRound: "round_b",
      reviewerId: "Ronnie",
    });
    assert.equal(status.latest.resolved_count, 2);
    assert.equal(status.latest.analysis_excluded_count, 0);
    assert.equal(status.latest.evidence_review_count, 0);
    assert.equal(status.latest.ai_suggestion_shown_count, 0);
    assert.equal(status.evidence.length, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
