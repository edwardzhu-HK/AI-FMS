import assert from "node:assert/strict";
import test from "node:test";
import { buildAslrSubjectSensitivity } from "../scripts/run-aslr-subject-sensitivity.js";

function landmark(name, x, y) {
  return { name, x, y, visibility: 0.99 };
}

function poseFrame(second, leftAnkleY, rightAnkleY) {
  return {
    second,
    poses: [
      {
        primaryPose: true,
        landmarks: [
          landmark("left_hip", 0.45, 0.55),
          landmark("right_hip", 0.55, 0.55),
          landmark("left_knee", 0.45, (0.55 + leftAnkleY) / 2),
          landmark("right_knee", 0.55, (0.55 + rightAnkleY) / 2),
          landmark("left_ankle", 0.45, leftAnkleY),
          landmark("right_ankle", 0.55, rightAnkleY),
          landmark("left_foot_index", 0.45, leftAnkleY),
          landmark("right_foot_index", 0.55, rightAnkleY),
        ],
      },
    ],
  };
}

function posePayload(videoId) {
  const frames = [];
  for (let index = 0; index < 20; index += 1) {
    frames.push(poseFrame(index / 10, 0.2 + index * 0.001, 0.6));
  }
  return {
    sourceVideo: {
      videoId,
      actionType: "active_straight_leg_raise",
      processedStartSecond: 0,
      processedEndSecond: 2,
    },
    poseModel: { name: "test", modelVariant: "test", numPoses: 1 },
    subjectSelection: { strategy: "roi" },
    sampling: { targetFps: 10 },
    quality: {
      processedFrames: frames.length,
      framesWithPose: frames.length,
      missingFramesRatio: 0,
    },
    frames,
  };
}

test("builds a separate subject-aware sensitivity without changing frozen evidence", () => {
  const config = {
    sensitivityId: "test-sensitivity",
    policy: {
      changesFrozenRoundABaseline: false,
      changesRoundBEvidence: false,
      changesScoringThresholds: false,
      sensitivityOnly: true,
    },
    extractions: [
      {
        extractionId: "roi-a",
        videoId: "video-a",
        sourceVideoSha256: "video-sha",
        startSecond: 0,
        endSecond: 2,
      },
    ],
    reextractedWindows: [
      {
        repetitionId: "rep-limited",
        extractionId: "roi-a",
        startSecond: 0,
        endSecond: 2,
        segmentSide: "left",
      },
    ],
    manualWatchReviews: [
      {
        repetitionId: "rep-watch",
        disposition: "retain_watch",
        visualFinding: "Peak remains visible.",
        eligibleUse: "Description only.",
      },
    ],
  };
  const baselineAudit = {
    auditVersion: "baseline-v1",
    rowsFingerprint: "baseline-fingerprint",
    summary: { byUniqueWindowStatus: { good: 0, watch: 1, limited: 1 } },
    rows: [
      {
        repetitionId: "rep-limited",
        videoId: "video-a",
        status: "limited",
        reasons: ["unstable_pose_side_labels"],
        metrics: {},
      },
      {
        repetitionId: "rep-watch",
        videoId: "video-b",
        status: "watch",
        reasons: ["pose_side_dominance_watch"],
        metrics: {
          peakSecond: 1,
          peakPoseSide: "left",
          segmentSide: "left",
        },
      },
    ],
  };

  const result = buildAslrSubjectSensitivity({
    config,
    baselineAudit,
    posePayloadsByExtractionId: new Map([["roi-a", posePayload("video-a")]]),
    sourceChecksumsByExtractionId: new Map([["roi-a", "video-sha"]]),
    modelSha256: "model-sha",
  });

  assert.equal(result.summary.reextractedUniqueWindows, 1);
  assert.equal(result.summary.noLongerLimited, 1);
  assert.equal(result.summary.sensitivityStatus.good, 1);
  assert.equal(result.summary.scoringThresholdsChanged, false);
  assert.equal(result.summary.frozenEvidenceChanged, false);
  assert.equal(
    result.evidenceByExtractionId["roi-a"].sourceChecksumVerified,
    true,
  );
  assert.equal(result.manualWatchReviews[0].baselineStatus, "watch");

  assert.throws(
    () =>
      buildAslrSubjectSensitivity({
        config,
        baselineAudit,
        posePayloadsByExtractionId: new Map([
          ["roi-a", posePayload("video-a")],
        ]),
        sourceChecksumsByExtractionId: new Map([
          ["roi-a", "different-video-sha"],
        ]),
        modelSha256: "model-sha",
      }),
    /checksum mismatch/,
  );
});

test("fails closed when a sensitivity source is not baseline limited", () => {
  const config = {
    sensitivityId: "test-sensitivity",
    policy: {},
    extractions: [
      {
        extractionId: "roi-a",
        videoId: "video-a",
        sourceVideoSha256: "video-sha",
        startSecond: 0,
        endSecond: 2,
      },
    ],
    reextractedWindows: [
      {
        repetitionId: "rep-good",
        extractionId: "roi-a",
        startSecond: 0,
        endSecond: 2,
        segmentSide: "left",
      },
    ],
    manualWatchReviews: [],
  };
  const baselineAudit = {
    auditVersion: "baseline-v1",
    rowsFingerprint: "baseline-fingerprint",
    summary: { byUniqueWindowStatus: { good: 1 } },
    rows: [
      {
        repetitionId: "rep-good",
        videoId: "video-a",
        status: "good",
        reasons: [],
        metrics: {},
      },
    ],
  };

  assert.throws(
    () =>
      buildAslrSubjectSensitivity({
        config,
        baselineAudit,
        posePayloadsByExtractionId: new Map([
          ["roi-a", posePayload("video-a")],
        ]),
        sourceChecksumsByExtractionId: new Map([["roi-a", "video-sha"]]),
      }),
    /not limited/,
  );
});
