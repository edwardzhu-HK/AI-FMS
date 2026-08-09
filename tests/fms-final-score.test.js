import assert from "node:assert/strict";
import test from "node:test";
import { createReviewerRawScore } from "../src/constants/scoring.js";
import { buildDeepSquatFinalScorePreview } from "../src/lib/fms-final-score.js";

function segment(overrides = {}) {
  return {
    segmentId: overrides.segmentId ?? `seg_${overrides.repetitionIndex ?? 1}`,
    actionType: "deep_squat",
    repetitionIndex: overrides.repetitionIndex ?? 1,
    attemptCondition: overrides.attemptCondition ?? "floor",
    painFlag: overrides.painFlag ?? false,
    clearingTest: overrides.clearingTest ?? "not_applicable",
    clearingFindings: overrides.clearingFindings ?? [],
    reviewerScores: {
      reviewer_a: null,
      reviewer_b: null,
    },
    ...overrides,
  };
}

function suggestion(segmentId, totalScore) {
  return {
    segmentId,
    status: "suggested",
    totalScore,
  };
}

function aiScore(totalScore, referenceScore = null) {
  return {
    totalScore,
    subscores: {
      depth: totalScore,
      kneeAlignment: totalScore,
      torsoControl: totalScore,
    },
    referenceScore,
    referenceSource: referenceScore === null ? null : "file_name",
  };
}

function reviewerScore(totalScore) {
  return createReviewerRawScore("deep_squat", totalScore);
}

test("deep squat final score is 3 when a floor attempt earns 3", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [segment({ segmentId: "seg_1" })],
    suggestionReport: {
      items: [suggestion("seg_1", 3)],
    },
  });

  assert.equal(result.status, "final_ready");
  assert.equal(result.finalScore, 3);
  assert.deepEqual(result.reasonCodes, ["floor_attempt_earned_three"]);
});

test("deep squat final score waits for board attempt when floor attempt misses 3", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [segment({ segmentId: "seg_1" })],
    suggestionReport: {
      items: [suggestion("seg_1", 2)],
    },
  });

  assert.equal(result.status, "needs_heel_elevated_attempt");
  assert.equal(result.finalScore, null);
});

test("deep squat final score treats staged floor suggestion as floor evidence", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [segment({ segmentId: "seg_1" })],
    suggestionReport: {
      items: [
        {
          segmentId: "seg_1",
          status: "needs_heel_elevated_attempt",
          totalScore: null,
          rawAttemptScore: 2,
        },
      ],
    },
  });

  assert.equal(result.status, "needs_heel_elevated_attempt");
  assert.equal(result.finalScore, null);
  assert.equal(result.attempts[0].attemptScore, 2);
  assert.equal(result.attempts[0].scoreSource, "pose_floor_attempt_evidence");
});

test("deep squat final score explains not-scorable attempts", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [segment({ segmentId: "seg_1" })],
    suggestionReport: {
      items: [
        {
          segmentId: "seg_1",
          status: "insufficient_evidence",
          totalScore: null,
          reasons: [
            "Pose trajectory did not show enough movement amplitude to identify a reliable squat cycle.",
            "Feature evidence is not available for this repetition.",
          ],
        },
      ],
    },
  });

  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.attempts[0].scorable, false);
  assert.deepEqual(result.attempts[0].reasonCodes, [
    "pose_evidence_insufficient",
    "low_motion_amplitude",
    "floor_attempt_not_confirmed_three",
  ]);
  assert.ok(
    result.attempts[0].evidenceReasons.some((reason) =>
      reason.includes("movement amplitude"),
    ),
  );
});

test("deep squat final score is 2 when heel-elevated attempt meets score-2 path", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [
      segment({ segmentId: "seg_1", repetitionIndex: 1 }),
      segment({
        segmentId: "seg_2",
        repetitionIndex: 2,
        attemptCondition: "heels_elevated_board",
      }),
    ],
    suggestionReport: {
      items: [suggestion("seg_1", 1), suggestion("seg_2", 3)],
    },
  });

  assert.equal(result.status, "final_ready");
  assert.equal(result.finalScore, 2);
  assert.equal(result.attempts[1].attemptScore, 2);
  assert.equal(result.attempts[1].rawAttemptScore, 3);
});

test("deep squat final score can use heel-elevated reference after floor attempt misses manual evidence", () => {
  const result = buildDeepSquatFinalScorePreview({
    notes:
      "除了第一个rep之外，其余都脚后跟垫高。filename label 2 is reference only.",
    segments: [
      segment({
        segmentId: "seg_1",
        repetitionIndex: 1,
        aiScore: aiScore(3, 2),
      }),
      segment({
        segmentId: "seg_2",
        repetitionIndex: 2,
        aiScore: aiScore(3, 2),
      }),
    ],
  });

  assert.equal(result.status, "final_ready");
  assert.equal(result.finalScore, 2);
  assert.equal(result.attempts[0].scorable, false);
  assert.equal(result.attempts[1].attemptCondition, "heels_elevated_board");
  assert.equal(result.attempts[1].attemptScore, 2);
  assert.equal(result.attempts[1].scoreSource, "reference_label");
});

test("deep squat final score can use heel-elevated reference when front-view pose underestimates depth", () => {
  const result = buildDeepSquatFinalScorePreview({
    notes: "rep 4-5 heel elevated / 后两个脚跟垫高且完成良好，可以给 2 分。",
    segments: [
      segment({
        segmentId: "seg_1",
        repetitionIndex: 1,
        aiScore: aiScore(3, 2),
      }),
      segment({
        segmentId: "seg_4",
        repetitionIndex: 4,
        aiScore: aiScore(2, 2),
      }),
    ],
    suggestionReport: {
      items: [suggestion("seg_1", 2), suggestion("seg_4", 1)],
    },
  });

  assert.equal(result.status, "final_ready");
  assert.equal(result.finalScore, 2);
  assert.equal(result.attempts[1].attemptCondition, "heels_elevated_board");
  assert.equal(result.attempts[1].boardDetection.status, "detected");
  assert.equal(result.attempts[1].boardDetection.source, "notes");
  assert.equal(result.attempts[1].attemptScore, 2);
  assert.equal(result.attempts[1].scoreSource, "segment_ai_suggestion");
});

test("deep squat final score is 2 for a single confirmed board attempt", () => {
  const result = buildDeepSquatFinalScorePreview({
    notes: "rep 1 heel elevated / FMS board / 脚后跟垫高。filename label 2。",
    segments: [
      segment({
        segmentId: "seg_1",
        repetitionIndex: 1,
        aiScore: aiScore(2, 2),
      }),
    ],
    suggestionReport: {
      items: [suggestion("seg_1", 2)],
    },
  });

  assert.equal(result.status, "final_ready");
  assert.equal(result.finalScore, 2);
  assert.equal(result.attempts[0].attemptCondition, "heels_elevated_board");
  assert.equal(result.attempts[0].attemptScore, 2);
});

test("deep squat final score is 1 when board attempt still misses score-2 path", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [
      segment({
        segmentId: "seg_1",
        attemptCondition: "heels_elevated_board",
      }),
    ],
    suggestionReport: {
      items: [suggestion("seg_1", 1)],
    },
  });

  assert.equal(result.status, "final_ready");
  assert.equal(result.finalScore, 1);
});

test("deep squat final score prefers reviewer consensus over pose suggestion", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [
      segment({
        segmentId: "seg_1",
        aiScore: aiScore(2),
        reviewerScores: {
          reviewer_a: reviewerScore(3),
          reviewer_b: reviewerScore(3),
        },
      }),
    ],
    suggestionReport: {
      items: [suggestion("seg_1", 2)],
    },
  });

  assert.equal(result.status, "final_ready");
  assert.equal(result.finalScore, 3);
  assert.equal(result.attempts[0].scoreSource, "human_consensus");
});

test("pain or failed clearing makes deep squat final score zero", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [segment({ segmentId: "seg_1", painFlag: true })],
    suggestionReport: {
      items: [suggestion("seg_1", 3)],
    },
  });

  assert.equal(result.status, "pain_zero");
  assert.equal(result.finalScore, 0);
});

test("positive clearing findings use current schema and make final score zero", () => {
  const result = buildDeepSquatFinalScorePreview({
    segments: [
      segment({
        segmentId: "seg_1",
        clearingFindings: [
          {
            key: "manual_pain_check",
            label: "Manual Pain Check",
            resultType: "positive_negative_pain",
            result: "positive",
            affectsRawScore: true,
          },
        ],
      }),
    ],
    suggestionReport: {
      items: [suggestion("seg_1", 3)],
    },
  });

  assert.equal(result.status, "pain_zero");
  assert.equal(result.finalScore, 0);
});
