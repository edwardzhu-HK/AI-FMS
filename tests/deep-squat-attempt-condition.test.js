import assert from "node:assert/strict";
import test from "node:test";
import {
  inferDeepSquatAttemptCondition,
  inferDeepSquatScoreTwoBoardRepetitions,
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

test("inferDeepSquatAttemptCondition marks the 5reps score 2 sample as board for last two reps", () => {
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
      segment: segment(3),
    }),
    "floor",
  );
  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(4),
    }),
    "heels_elevated_board",
  );
  assert.equal(
    inferDeepSquatAttemptCondition({
      ...context,
      segment: segment(5),
    }),
    "heels_elevated_board",
  );
});

test("inferDeepSquatAttemptCondition marks the 4reps score 2 sample as board for last two reps", () => {
  const context = {
    fileName: "4reps score 2.mp4",
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

test("inferDeepSquatAttemptCondition marks single-rep score-2 samples as board", () => {
  ["1rep score 2.mp4", "1 rep score 2.mp4"].forEach((fileName) => {
    assert.equal(
      inferDeepSquatAttemptCondition({
        fileName,
        repetitionCount: 1,
        segment: segment(1),
      }),
      "heels_elevated_board",
    );
  });
});

test("inferDeepSquatScoreTwoBoardRepetitions marks confirmed board score-2 attempts", () => {
  assert.deepEqual(
    [
      ...inferDeepSquatScoreTwoBoardRepetitions({
        notes:
          "rep 4-5 heel elevated / 后两个脚跟垫高且完成良好，可以给 2 分。",
        repetitionCount: 5,
      }),
    ],
    [4, 5],
  );

  assert.deepEqual(
    [
      ...inferDeepSquatScoreTwoBoardRepetitions({
        fileName: "5reps score 2.mp4",
        repetitionCount: 5,
      }),
    ],
    [4, 5],
  );

  assert.deepEqual(
    [
      ...inferDeepSquatScoreTwoBoardRepetitions({
        fileName: "4reps score 2.mp4",
        repetitionCount: 4,
      }),
    ],
    [3, 4],
  );

  assert.deepEqual(
    [
      ...inferDeepSquatScoreTwoBoardRepetitions({
        fileName: "1rep score 2.mp4",
        repetitionCount: 1,
      }),
    ],
    [1],
  );

  assert.deepEqual(
    [
      ...inferDeepSquatScoreTwoBoardRepetitions({
        fileName: "1 rep score 2.mp4",
        repetitionCount: 1,
      }),
    ],
    [1],
  );
});
