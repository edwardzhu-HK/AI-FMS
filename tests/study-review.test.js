import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudyQueue,
  buildStudyReviewExport,
  createStudyReviewEvent,
  latestStudyReviews,
} from "../src/lib/study-review.js";

const pilot = {
  pilotId: "pilot_test",
  snapshotSourceDate: "2026-07-05T00:00:00.000Z",
  videos: [
    {
      videoId: "vid_1",
      fileName: "score 3.mp4",
      relativePath: "Eval_Videos/score 3.mp4",
      status: "found",
    },
  ],
  repetitions: [
    {
      repetitionId: "rep_1",
      ingestId: "ing_1",
      videoId: "vid_1",
      actionType: "deep_squat",
      startSecond: 1,
      endSecond: 4,
      cameraView: "front",
      side: "none",
      humanReviews: [{ totalScore: 3 }],
      legacyAiSuggestion: { totalScore: 3 },
    },
  ],
};

test("buildStudyQueue exposes playback fields without historical labels or file names", () => {
  const queue = buildStudyQueue(pilot, "Ronnie");
  assert.equal(queue.length, 1);
  assert.equal(queue[0].videoPath, "Eval_Videos/score 3.mp4");
  assert.equal("videoFileName" in queue[0], false);
  assert.equal("fileName" in queue[0], false);
  assert.equal("humanReviews" in queue[0], false);
  assert.equal("legacyAiSuggestion" in queue[0], false);
});

test("buildStudyQueue accepts a frozen manifest with anonymized media paths", () => {
  const queue = buildStudyQueue(
    {
      pilotId: "formal_test",
      items: [
        {
          repetitionId: "rep_2",
          ingestId: "ing_2",
          actionType: "hurdle_step",
          startSecond: 2,
          endSecond: 6,
          cameraView: "front",
          side: "right",
          videoPath: "research/pilot-v1/generated/study-media/media_abcd.mp4",
        },
      ],
    },
    "Ronnie",
  );
  assert.equal(queue.length, 1);
  assert.match(queue[0].videoPath, /media_abcd\.mp4$/);
  assert.equal("sourceCorrelationGroup" in queue[0], false);
});

test("createStudyReviewEvent records blind-review boundaries", () => {
  const event = createStudyReviewEvent({
    pilotId: pilot.pilotId,
    reviewerId: "Ronnie",
    repetition: buildStudyQueue(pilot, "Ronnie")[0],
    score: 2,
    eventId: "event_1",
    now: new Date("2026-08-09T00:00:00.000Z"),
  });

  assert.equal(event.score, 2);
  assert.equal(event.blindReview.legacyAiSuggestionHidden, true);
  assert.equal(event.blindReview.eligibleForBlindAnalysis, true);
});

test("visible score cues make an event ineligible for blind analysis", () => {
  const event = createStudyReviewEvent({
    pilotId: pilot.pilotId,
    reviewerId: "Edward",
    repetition: buildStudyQueue(pilot, "Edward")[0],
    score: 1,
    qualityFlags: ["label_cue_visible"],
    eventId: "event_2",
  });

  assert.equal(event.blindReview.labelCueDetected, true);
  assert.equal(event.blindReview.eligibleForBlindAnalysis, false);
});

test("latestStudyReviews keeps the newest append-only event", () => {
  const latest = latestStudyReviews([
    {
      eventId: "event_1",
      repetitionId: "rep_1",
      score: 1,
      createdAt: "2026-08-09T00:00:00.000Z",
    },
    {
      eventId: "event_2",
      repetitionId: "rep_1",
      score: 2,
      createdAt: "2026-08-09T00:01:00.000Z",
    },
  ]);
  assert.equal(latest.get("rep_1").score, 2);
});

test("buildStudyReviewExport summarizes scored and deferred latest events", () => {
  const payload = buildStudyReviewExport({
    pilot,
    reviewerId: "Ronnie",
    events: [
      {
        eventId: "event_1",
        repetitionId: "rep_1",
        status: "deferred",
        createdAt: "2026-08-09T00:00:00.000Z",
      },
      {
        eventId: "event_2",
        repetitionId: "rep_1",
        status: "scored",
        score: 3,
        createdAt: "2026-08-09T00:01:00.000Z",
      },
    ],
  });

  assert.equal(payload.eventCount, 2);
  assert.equal(payload.latestReviewCount, 1);
  assert.equal(payload.scoredCount, 1);
  assert.equal(payload.deferredCount, 0);
});
