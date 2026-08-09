import assert from "node:assert/strict";
import test from "node:test";
import {
  detectDeepSquatBoardUsage,
  isDeepSquatBoardDetected,
} from "../src/lib/deep-squat-board-detector.js";

function segment(repetitionIndex, attemptCondition = "floor") {
  return {
    segmentId: `seg_${repetitionIndex}`,
    repetitionIndex,
    attemptCondition,
  };
}

test("detectDeepSquatBoardUsage uses notes as board protocol evidence", () => {
  const detection = detectDeepSquatBoardUsage({
    segment: segment(4),
    notes: "rep 4-5 heel elevated / 后两个脚跟垫高且完成良好。",
    repetitionCount: 5,
  });

  assert.equal(detection.status, "detected");
  assert.equal(detection.source, "notes");
  assert.equal(detection.attemptCondition, "heels_elevated_board");
  assert.equal(isDeepSquatBoardDetected(detection), true);
});

test("detectDeepSquatBoardUsage ignores score-bearing file names", () => {
  const detection = detectDeepSquatBoardUsage({
    segment: segment(3),
    fileName: "4reps score 2.mp4",
    repetitionCount: 4,
  });

  assert.equal(detection.status, "unknown");
  assert.equal(detection.source, "insufficient_visual_evidence");
  assert.deepEqual(detection.reasonCodes, [
    "no_board_metadata_or_visual_detector_result",
  ]);
});

test("detectDeepSquatBoardUsage preserves explicit segment metadata", () => {
  const detection = detectDeepSquatBoardUsage({
    segment: segment(1, "heels_elevated_board"),
    repetitionCount: 1,
  });

  assert.equal(detection.status, "detected");
  assert.equal(detection.source, "segment_metadata");
  assert.equal(detection.confidence, 0.96);
});
