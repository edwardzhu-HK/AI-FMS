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
});
