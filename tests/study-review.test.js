import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudyQueue,
  buildStudyReviewExport,
  createStudyReviewEvent,
  latestStudyReviews,
  studyStorageKey,
  validateStudyReviewExport,
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
    studyRound: "round_a",
    score: 2,
    reviewStartedAt: "2026-08-08T23:59:45.000Z",
    reviewDurationMs: 15000,
    eventId: "event_1",
    now: new Date("2026-08-09T00:00:00.000Z"),
  });

  assert.equal(event.score, 2);
  assert.equal(event.schemaVersion, "ai_fms_study_review_event_v2");
  assert.equal(event.studyRound, "round_a");
  assert.equal(event.reviewDurationMs, 15000);
  assert.equal(event.blindReview.legacyAiSuggestionHidden, true);
  assert.equal(event.blindReview.eligibleForBlindAnalysis, true);
});

test("visible score cues make an event ineligible for blind analysis", () => {
  const event = createStudyReviewEvent({
    pilotId: pilot.pilotId,
    reviewerId: "Edward",
    repetition: buildStudyQueue(pilot, "Edward")[0],
    studyRound: "round_a",
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
  const repetition = buildStudyQueue(pilot, "Ronnie", "round_a")[0];
  const deferred = createStudyReviewEvent({
    pilotId: pilot.pilotId,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    repetition,
    status: "deferred",
    eventId: "event_1",
    now: new Date("2026-08-09T00:00:00.000Z"),
    reviewDurationMs: 8000,
  });
  const scored = createStudyReviewEvent({
    pilotId: pilot.pilotId,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    repetition,
    score: 3,
    eventId: "event_2",
    now: new Date("2026-08-09T00:01:00.000Z"),
    reviewDurationMs: 12000,
    supersedesEventId: "event_1",
  });
  const payload = buildStudyReviewExport({
    pilot,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    events: [deferred, scored],
    exportedAt: new Date("2026-08-09T00:02:00.000Z"),
  });

  assert.equal(payload.eventCount, 2);
  assert.equal(payload.schemaVersion, "ai_fms_study_review_export_v2");
  assert.equal(payload.studyRound, "round_a");
  assert.equal(payload.completion.latestReviewCount, 1);
  assert.equal(payload.completion.scoredCount, 1);
  assert.equal(payload.completion.deferredCount, 0);
  assert.equal(payload.completion.complete, true);
  assert.deepEqual(payload.expectedRepetitionIds, ["rep_1"]);
});

test("review export validator rejects incomplete or cross-round events", () => {
  const repetition = buildStudyQueue(pilot, "Ronnie", "round_a")[0];
  const payload = buildStudyReviewExport({
    pilot,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    events: [
      createStudyReviewEvent({
        pilotId: pilot.pilotId,
        reviewerId: "Ronnie",
        studyRound: "round_b",
        repetition,
        score: 2,
        eventId: "wrong_round",
      }),
    ],
  });
  const result = validateStudyReviewExport(payload, { pilot });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /studyRound/);
  assert.match(result.errors.join(" "), /incomplete/);
});

test("partial exports remain valid backups when completion is not required", () => {
  const twoRepPilot = {
    ...pilot,
    repetitions: [
      ...pilot.repetitions,
      {
        ...pilot.repetitions[0],
        repetitionId: "rep_2",
        ingestId: "ing_2",
      },
    ],
  };
  const repetition = buildStudyQueue(twoRepPilot, "Ronnie", "round_a")[0];
  const payload = buildStudyReviewExport({
    pilot: twoRepPilot,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    events: [
      createStudyReviewEvent({
        pilotId: twoRepPilot.pilotId,
        reviewerId: "Ronnie",
        studyRound: "round_a",
        repetition,
        score: 3,
        eventId: "partial_event",
      }),
    ],
  });
  const result = validateStudyReviewExport(payload, {
    pilot: twoRepPilot,
    requireComplete: false,
  });

  assert.equal(result.valid, true);
  assert.equal(result.completion.complete, false);
  assert.equal(result.completion.scoredCount, 1);
  assert.equal(result.warnings.length, 1);
});

test("storage and queue order are isolated by study round", () => {
  assert.notEqual(
    studyStorageKey("pilot", "Ronnie", "round_a"),
    studyStorageKey("pilot", "Ronnie", "round_b"),
  );

  const manyRepPilot = {
    ...pilot,
    repetitions: Array.from({ length: 12 }, (_, index) => ({
      ...pilot.repetitions[0],
      repetitionId: `rep_${index}`,
      ingestId: `ing_${index}`,
      startSecond: index * 5,
      endSecond: index * 5 + 4,
    })),
  };
  const roundA = buildStudyQueue(manyRepPilot, "Ronnie", "round_a").map(
    (item) => item.repetitionId,
  );
  const roundB = buildStudyQueue(manyRepPilot, "Ronnie", "round_b").map(
    (item) => item.repetitionId,
  );
  assert.notDeepEqual(roundA, roundB);
});

test("review export validator requires valid supersession lineage", () => {
  const repetition = buildStudyQueue(pilot, "Ronnie", "round_a")[0];
  const event = createStudyReviewEvent({
    pilotId: pilot.pilotId,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    repetition,
    score: 2,
    eventId: "event_2",
    supersedesEventId: "missing_event",
  });
  const payload = buildStudyReviewExport({
    pilot,
    reviewerId: "Ronnie",
    studyRound: "round_a",
    events: [event],
  });
  const result = validateStudyReviewExport(payload, { pilot });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /supersedesEventId was not found/);
});
