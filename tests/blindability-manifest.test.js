import assert from "node:assert/strict";
import test from "node:test";
import { buildBlindabilityManifest } from "../scripts/build-blinded-study-manifest.js";

function fixture() {
  return {
    canonical: {
      pilotId: "pilot_test",
      snapshotSourceDate: "2026-08-09T00:00:00.000Z",
      videos: [
        {
          videoId: "vid_1",
          fileName: "two reps score 3.mp4",
          relativePath: "Eval_Videos/two reps score 3.mp4",
          status: "found",
          durationSecond: 20,
        },
      ],
      repetitions: [
        {
          repetitionId: "rep_1",
          ingestId: "ing_1",
          videoId: "vid_1",
          actionType: "deep_squat",
          startSecond: 1,
          endSecond: 5,
          cameraView: "front",
          side: "none",
          humanReviewSummary: {
            consensusScore: 3,
            reviewerAgreement: true,
          },
          legacyAiSuggestion: { totalScore: 3 },
        },
      ],
    },
    assetManifest: {
      items: [
        {
          ingestId: "ing_1",
          pose: {
            status: "found",
            relativePath: "Eval_Videos/pose/two-reps.pose.json",
            sha256: "pose-hash",
          },
        },
      ],
    },
    overrides: {
      defaults: {
        visualLabelCue: "pending",
        instructionalVisualCue: "pending",
        targetSubject: "pending",
        timing: "pending",
        movementVisibility: "pending",
        audioPolicy: "forced_muted",
      },
      videoOverrides: {},
      repetitionOverrides: {},
    },
  };
}

test("blindability manifest starts visual fields as pending", () => {
  const manifest = buildBlindabilityManifest(fixture());
  assert.equal(manifest.summary.total, 1);
  assert.equal(manifest.summary.pendingVisualQa, 1);
  assert.equal(manifest.items[0].blindability.status, "pending_visual_qa");
});

test("video-level QA can make a structurally valid rep eligible", () => {
  const input = fixture();
  input.overrides.videoOverrides.vid_1 = {
    visualLabelCue: "none",
    instructionalVisualCue: "none",
    targetSubject: "clear",
    timing: "complete",
    movementVisibility: "adequate",
  };
  const manifest = buildBlindabilityManifest(input);
  assert.equal(manifest.summary.eligible, 1);
  assert.equal(manifest.items[0].blindability.status, "eligible");
});

test("repetition-level visible cue excludes a rep", () => {
  const input = fixture();
  input.overrides.videoOverrides.vid_1 = {
    visualLabelCue: "none",
    instructionalVisualCue: "none",
    targetSubject: "clear",
    timing: "complete",
    movementVisibility: "adequate",
  };
  input.overrides.repetitionOverrides.rep_1 = {
    visualLabelCue: "present",
  };
  const manifest = buildBlindabilityManifest(input);
  assert.equal(manifest.summary.excluded, 1);
  assert.deepEqual(manifest.items[0].blindability.exclusionReasons, [
    "visible_label_cue",
  ]);
});

test("visible scoring guidance excludes a rep without a numeric answer", () => {
  const input = fixture();
  input.overrides.videoOverrides.vid_1 = {
    visualLabelCue: "none",
    instructionalVisualCue: "scoring_guidance",
    targetSubject: "clear",
    timing: "complete",
    movementVisibility: "adequate",
  };
  const manifest = buildBlindabilityManifest(input);
  assert.equal(manifest.summary.excluded, 1);
  assert.deepEqual(manifest.items[0].blindability.exclusionReasons, [
    "visible_scoring_guidance",
  ]);
});

test("movement title alone remains eligible because action is disclosed", () => {
  const input = fixture();
  input.overrides.videoOverrides.vid_1 = {
    visualLabelCue: "none",
    instructionalVisualCue: "movement_title_only",
    targetSubject: "clear",
    timing: "complete",
    movementVisibility: "adequate",
  };
  const manifest = buildBlindabilityManifest(input);
  assert.equal(manifest.summary.eligible, 1);
});

test("blinded review item excludes historical labels and source file name", () => {
  const manifest = buildBlindabilityManifest(fixture());
  const item = manifest.items[0].blindedReviewItem;
  assert.equal("historicalConsensusScore" in item, false);
  assert.equal("legacyAiSuggestion" in item, false);
  assert.equal("fileName" in item, false);
  assert.equal(item.videoPath, "Eval_Videos/two reps score 3.mp4");
});

test("invalid clip ranges are excluded before visual QA", () => {
  const input = fixture();
  input.canonical.repetitions[0].endSecond = 0.5;
  const manifest = buildBlindabilityManifest(input);
  assert.equal(manifest.items[0].blindability.status, "excluded");
  assert.ok(
    manifest.items[0].blindability.exclusionReasons.includes(
      "invalid_clip_range",
    ),
  );
});

test("missing QA fields fail closed instead of becoming eligible", () => {
  const input = fixture();
  delete input.overrides.defaults.instructionalVisualCue;
  assert.throws(
    () => buildBlindabilityManifest(input),
    /Invalid instructionalVisualCue/,
  );
});
