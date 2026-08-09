import assert from "node:assert/strict";
import test from "node:test";
import {
  deduplicateHistoryEntries,
  validateCanonicalPilot,
} from "../scripts/build-canonical-pilot-dataset.js";

function occurrence({ id, contentHash, sourceFile }) {
  return {
    entry: { id },
    contentHash,
    sourceFile,
  };
}

test("deduplicateHistoryEntries merges repeated cumulative exports", () => {
  const result = deduplicateHistoryEntries([
    occurrence({ id: "entry-1", contentHash: "same", sourceFile: "b.json" }),
    occurrence({ id: "entry-1", contentHash: "same", sourceFile: "a.json" }),
    occurrence({ id: "entry-2", contentHash: "other", sourceFile: "c.json" }),
  ]);

  assert.equal(result.entries.length, 2);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.entries[0].occurrenceCount, 2);
  assert.deepEqual(result.entries[0].sourceFiles, ["a.json", "b.json"]);
});

test("deduplicateHistoryEntries reports conflicting content for one id", () => {
  const result = deduplicateHistoryEntries([
    occurrence({ id: "entry-1", contentHash: "first", sourceFile: "a.json" }),
    occurrence({ id: "entry-1", contentHash: "second", sourceFile: "b.json" }),
  ]);

  assert.equal(result.entries.length, 1);
  assert.deepEqual(result.conflicts, [
    {
      entryId: "entry-1",
      contentHashes: ["first", "second"],
      sourceFiles: ["a.json", "b.json"],
    },
  ]);
});

test("validateCanonicalPilot rejects leaked AI scores marked as eligible", () => {
  const issues = validateCanonicalPilot({
    schemaVersion: "ai_fms_canonical_pilot_v1",
    sourceFiles: ["Ingested-data/history.json"],
    videos: [
      {
        videoId: "vid_example",
        actionType: "deep_squat",
        relativePath: "Eval_Videos/example.mp4",
      },
    ],
    ingests: [
      {
        ingestId: "ing_example",
        videoId: "vid_example",
        actionType: "deep_squat",
      },
    ],
    repetitions: [
      {
        repetitionId: "rep_example",
        ingestId: "ing_example",
        videoId: "vid_example",
        actionType: "deep_squat",
        startSecond: 1,
        endSecond: 2,
        legacyAiSuggestion: {
          provenanceStatus: "label_leakage_confirmed",
          eligibleForAccuracyAnalysis: true,
        },
      },
    ],
  });

  assert.deepEqual(issues, [
    "legacy AI provenance boundary missing: rep_example",
  ]);
});
