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

test("detectDeepSquatBoardUsage marks known score-2 sample last reps as board", () => {
  assert.equal(
    detectDeepSquatBoardUsage({
      segment: segment(2),
      fileName: "4reps score 2.mp4",
      repetitionCount: 4,
    }).status,
    "unknown",
  );

  const detection = detectDeepSquatBoardUsage({
    segment: segment(3),
    fileName: "4reps score 2.mp4",
    repetitionCount: 4,
  });

  assert.equal(detection.status, "detected");
  assert.equal(detection.source, "curated_sample_metadata");
  assert.deepEqual(detection.reasonCodes, [
    "curated_score_two_sample_last_repetitions_use_board",
  ]);
});

test("detectDeepSquatBoardUsage marks known single-rep score-2 samples as board", () => {
  ["1rep score 2.mp4", "1 rep score 2.mp4"].forEach((fileName) => {
    const detection = detectDeepSquatBoardUsage({
      segment: segment(1),
      fileName,
      repetitionCount: 1,
    });

    assert.equal(detection.status, "detected");
    assert.equal(detection.source, "curated_sample_metadata");
    assert.equal(detection.attemptCondition, "heels_elevated_board");
  });
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
