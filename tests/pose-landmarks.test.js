import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildPoseOverlayPoints,
  findNearestPoseFrame,
  summarizePoseLandmarks,
  validatePoseLandmarkPayload,
} from "../src/lib/pose-landmarks.js";

function loadFixture() {
  return JSON.parse(
    fs.readFileSync("tests/fixtures/pose-landmarks.sample.json", "utf8"),
  );
}

test("validatePoseLandmarkPayload accepts the pose fixture schema", () => {
  const payload = loadFixture();
  assert.deepEqual(validatePoseLandmarkPayload(payload), []);
});

test("summarizePoseLandmarks reports frame coverage and quality", () => {
  const summary = summarizePoseLandmarks(loadFixture());

  assert.equal(summary.valid, true);
  assert.equal(summary.fileName, "Sample-1.mp4");
  assert.equal(summary.poseModel, "mediapipe_pose_landmarker");
  assert.equal(summary.framesTotal, 3);
  assert.equal(summary.framesWithPose, 2);
  assert.equal(summary.missingFrames, 1);
  assert.equal(summary.missingFramesRatio, 1 / 3);
  assert.ok(Math.abs(summary.avgVisibility - 0.84) < 0.000001);
  assert.ok(Math.abs(summary.avgPresence - 0.92) < 0.000001);
});

test("summarizePoseLandmarks reports schema issues", () => {
  const summary = summarizePoseLandmarks({ frames: [] });

  assert.equal(summary.valid, false);
  assert.ok(
    summary.issues.includes("schemaVersion must be ai_fms_pose_landmarks_v1"),
  );
});

test("findNearestPoseFrame skips missing-pose frames", () => {
  const frame = findNearestPoseFrame(loadFixture(), 1.09);

  assert.equal(frame.second, 1);
  assert.equal(frame.poses.length, 1);
});

test("buildPoseOverlayPoints maps normalized coordinates to svg space", () => {
  const frame = findNearestPoseFrame(loadFixture(), 1.2);
  const points = buildPoseOverlayPoints(frame);

  assert.deepEqual(points.nose, {
    x: 51,
    y: 21,
    side: "neutral",
    visibility: 0.78,
    presence: 0.89,
  });
});
