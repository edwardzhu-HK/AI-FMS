import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDraftManifestRows,
  classifyReadiness,
  inferExpectedReps,
  inferQualityFlags,
  inferScoreHints,
} from "../scripts/inventory-sample-videos.js";

test("inferExpectedReps prefers explicit total reps", () => {
  assert.equal(
    inferExpectedReps(
      "6reps each side, total 12 reps, score 3 for both sides.mp4",
    ),
    12,
  );
});

test("inferExpectedReps sums staged rep phrases when no total is present", () => {
  assert.equal(
    inferExpectedReps(
      "first 3 reps score 3, then 1 rep score 1 and 2 reps score 2.mp4",
    ),
    6,
  );
});

test("inferScoreHints extracts all score references", () => {
  assert.deepEqual(
    inferScoreHints("first 2 score 3 and last 2 score 2.mp4"),
    [3, 2],
  );
});

test("classifyReadiness separates candidate and review-only samples", () => {
  assert.equal(classifyReadiness([], 3, [3]), "manifest_candidate");
  assert.equal(
    classifyReadiness(["external_or_instruction_candidate"], null, []),
    "review_only",
  );
});

test("inferQualityFlags catches likely action-folder mismatches", () => {
  const flags = inferQualityFlags({
    fileName: "FMS Active SLR (1).mp4",
    folderAction: "shoulder_mobility",
    metadata: {
      durationSecond: 4.9,
      width: 608,
    },
  });

  assert.ok(
    flags.includes("filename_action_mismatch:active_straight_leg_raise"),
  );
  assert.ok(flags.includes("external_or_instruction_candidate"));
  assert.ok(flags.includes("low_resolution"));
});

test("buildDraftManifestRows includes candidates but excludes review-only items", () => {
  const rows = buildDraftManifestRows({
    items: [
      {
        actionType: "deep_squat",
        sourceRelativePath: "1-Squat/2reps score 3.mp4",
        fileName: "2reps score 3.mp4",
        readiness: "manifest_candidate",
        expectedReps: 2,
        scoreHints: [3],
        sideHints: [],
        flags: [],
        metadata: {
          durationSecond: 11.4,
        },
      },
      {
        actionType: "rotary_stability",
        sourceRelativePath: "7-rotatory stability/videoplayback (21).mp4",
        fileName: "videoplayback (21).mp4",
        readiness: "review_only",
        expectedReps: null,
        scoreHints: [],
        sideHints: [],
        flags: ["external_or_instruction_candidate"],
        metadata: {
          durationSecond: 147.1,
        },
      },
    ],
  });

  assert.equal(rows.deep_squat.length, 1);
  assert.equal(rows.deep_squat[0].fileName, "1-Squat/2reps score 3.mp4");
  assert.equal(rows.deep_squat[0].expectedReps, 2);
  assert.equal(rows.rotary_stability, undefined);
});
