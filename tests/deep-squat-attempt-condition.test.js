import assert from "node:assert/strict";
import test from "node:test";
import {
  inferDeepSquatAttemptCondition,
  inferHeelElevatedRepetitions,
} from "../src/lib/deep-squat-attempt-condition.js";

function segment(repetitionIndex, attemptCondition = "floor") {
  return {
    segmentId: `seg_${repetitionIndex}`,
    repetitionIndex,
    attemptCondition,
  };
}

test("inferHeelElevatedRepetitions understands Chinese last-two notes", () => {
  const repetitions = inferHeelElevatedRepetitions({
    notes: "后两个脚跟垫高且完成良好，可以给2分。",
    repetitionCount: 5,
  });

  assert.deepEqual([...repetitions], [4, 5]);
});

test("inferDeepSquatAttemptCondition ignores score-bearing file names", () => {
  const context = {
    fileName: "5reps score 2.mp4",
    repetitionCount: 5,
  };

  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(1),
    }),
    "floor",
  );
  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(4),
    }),
    "floor",
  );
  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(5),
    }),
    "floor",
  );
});

test("inferDeepSquatAttemptCondition uses explicit protocol notes", () => {
  const context = {
    fileName: "4reps score 2.mp4",
    notes: "rep 3-4 heels elevated on the FMS board",
    repetitionCount: 4,
  };

  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(1),
    }),
    "floor",
  );
  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(2),
    }),
    "floor",
  );
  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(3),
    }),
    "heels_elevated_board",
  );
  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(4),
    }),
    "heels_elevated_board",
  );
});

test("inferDeepSquatAttemptCondition preserves explicit segment metadata", () => {
  ["1rep score 2.mp4", "1 rep score 2.mp4"].forEach((fileName) => {
    assert.equal(
      inferDeepSquatAttemptCondition({
        fileName,
        repetitionCount: 1,
        segment: segment(1, "heels_elevated_board"),
      }),
      "heels_elevated_board",
    );
  });
});
