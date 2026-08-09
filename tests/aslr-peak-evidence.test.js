import assert from "node:assert/strict";
import test from "node:test";
import { summarizeAslrSegmentPeakEvidence } from "../src/lib/aslr-timing.js";

function landmark(name, y, visibility = 0.95) {
  return { name, x: 0.5, y, z: 0, visibility };
}

function frame(second, raisedSide = null) {
  const leftRaised = raisedSide === "left";
  const rightRaised = raisedSide === "right";
  return {
    second,
    poses: [
      {
        landmarks: [
          landmark("left_hip", 0.7),
          landmark("left_knee", leftRaised ? 0.55 : 0.76),
          landmark("left_ankle", leftRaised ? 0.4 : 0.82),
          landmark("left_foot_index", leftRaised ? 0.36 : 0.84),
          landmark("right_hip", 0.7),
          landmark("right_knee", rightRaised ? 0.55 : 0.76),
          landmark("right_ankle", rightRaised ? 0.4 : 0.82),
          landmark("right_foot_index", rightRaised ? 0.36 : 0.84),
        ],
      },
    ],
  };
}

function segment(side = "right") {
  return { startSecond: 0, endSecond: 1, side };
}

test("ASLR peak evidence reports a stable pose side without score labels", () => {
  const result = summarizeAslrSegmentPeakEvidence({
    posePayload: {
      frames: Array.from({ length: 10 }, (_, index) =>
        frame(index / 10, "right"),
      ),
    },
    segment: segment("right"),
  });

  assert.equal(result.status, "good");
  assert.equal(result.metrics.peakPoseSide, "right");
  assert.equal(result.metrics.dominantPoseSide, "right");
  assert.equal(result.metrics.dominantSideRatio, 1);
  assert.equal(result.metrics.sideSwitchCount, 0);
  assert.equal(result.metrics.segmentSideAgreement, "match");
});

test("ASLR peak evidence fails closed when strong frames switch sides", () => {
  const result = summarizeAslrSegmentPeakEvidence({
    posePayload: {
      frames: Array.from({ length: 10 }, (_, index) =>
        frame(index / 10, index % 2 === 0 ? "left" : "right"),
      ),
    },
    segment: segment("right"),
  });

  assert.equal(result.status, "limited");
  assert.ok(result.reasons.includes("ambiguous_dominant_pose_side"));
  assert.ok(result.reasons.includes("unstable_pose_side_labels"));
  assert.equal(result.metrics.segmentSideAgreement, "indeterminate");
});

test("ASLR peak evidence flags a sparse raise signal", () => {
  const result = summarizeAslrSegmentPeakEvidence({
    posePayload: {
      frames: Array.from({ length: 10 }, (_, index) =>
        frame(index / 10, index < 3 ? "right" : null),
      ),
    },
    segment: segment("right"),
  });

  assert.equal(result.status, "limited");
  assert.ok(result.reasons.includes("sparse_strong_raise_signal"));
  assert.equal(result.metrics.strongFrameCount, 3);
});

test("ASLR peak evidence surfaces a stable metadata disagreement", () => {
  const result = summarizeAslrSegmentPeakEvidence({
    posePayload: {
      frames: Array.from({ length: 10 }, (_, index) =>
        frame(index / 10, "right"),
      ),
    },
    segment: segment("left"),
  });

  assert.equal(result.status, "watch");
  assert.ok(result.reasons.includes("segment_side_pose_mismatch"));
  assert.equal(result.metrics.segmentSideAgreement, "mismatch");
});
