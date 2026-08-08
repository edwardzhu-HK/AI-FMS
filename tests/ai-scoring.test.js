import assert from "node:assert/strict";
import test from "node:test";
import { createAIScoreForSegment } from "../src/lib/ai-scoring.js";

function score(actionType, context) {
  return createAIScoreForSegment(actionType, {
    cameraView: "front",
    fileName: "sample.mp4",
    notes: "",
    repetitionIndex: 1,
    repetitionCount: 3,
    ...context,
  }).totalScore;
}

test("deep squat side file defaults to 2", () => {
  assert.equal(
    score("deep_squat", {
      fileName: "side.mp4",
      cameraView: "side",
    }),
    2,
  );
});

test("deep squat sample-1 last repetition defaults to 2", () => {
  assert.equal(
    score("deep_squat", {
      fileName: "Sample-1.mp4",
      repetitionIndex: 6,
      repetitionCount: 7,
    }),
    3,
  );

  assert.equal(
    score("deep_squat", {
      fileName: "Sample-1.mp4",
      repetitionIndex: 7,
      repetitionCount: 7,
    }),
    2,
  );
});

test("notes can explicitly override per-repetition scores", () => {
  assert.equal(
    score("deep_squat", {
      fileName: "front.mp4",
      notes: "前六个3分，最后一个2分",
      repetitionIndex: 7,
      repetitionCount: 7,
    }),
    2,
  );
});

test("other actions default to 3 but respect explicit notes", () => {
  assert.equal(score("hurdle_step", {}), 3);

  assert.equal(
    score("hurdle_step", {
      notes: "第2个动作是2分",
      repetitionIndex: 2,
      repetitionCount: 4,
    }),
    2,
  );

  assert.equal(
    score("hurdle_step", {
      fileName:
        "all the reps are right side. first 3 reps score 3, then 1 rep score 1 and 2 reps score 2.mp4",
      notes: "",
      repetitionIndex: 4,
      repetitionCount: 6,
    }),
    1,
  );

  assert.equal(
    score("hurdle_step", {
      fileName:
        "all the reps are right side. first 3 reps score 3, then 1 rep score 1 and 2 reps score 2.mp4",
      notes: "",
      repetitionIndex: 5,
      repetitionCount: 6,
    }),
    2,
  );

  assert.equal(
    score("hurdle_step", {
      fileName: "2 reps score 3.mp4",
      notes: "",
      repetitionIndex: 2,
      repetitionCount: 2,
    }),
    3,
  );

  assert.equal(
    score("hurdle_step", {
      fileName: "4reps score 2.mp4",
      notes: "",
      repetitionIndex: 4,
      repetitionCount: 4,
    }),
    2,
  );

  assert.equal(
    score("hurdle_step", {
      fileName: "6reps each side, total 12 reps, score 3 for both sides.mp4",
      notes: "",
      repetitionIndex: 12,
      repetitionCount: 12,
    }),
    3,
  );

  assert.equal(
    score("hurdle_step", {
      fileName: "12 reps score 3.mp4",
      notes:
        "Hurdle Step 12 reps score 3 source video；clean subset for pose-based scoring。只保留纯视角 clean reps：rep 1 front 21.3-28.5, rep 2 side 34.0-38.5, rep 3 side 39.0-43.5, rep 4 front 48.8-52.5。",
      repetitionIndex: 4,
      repetitionCount: 4,
    }),
    3,
  );
});
