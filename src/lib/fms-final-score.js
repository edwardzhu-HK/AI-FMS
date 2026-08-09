import {
  normalizeClearingFindings,
  normalizeScoreForAction,
} from "../constants/scoring.js";
import { adjudicateScores } from "./adjudication.js";
import {
  DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED,
  capDeepSquatAttemptScoreForCondition,
  inferDeepSquatAttemptCondition,
  isHeelElevatedAttempt,
} from "./deep-squat-attempt-condition.js";
import {
  detectDeepSquatBoardUsage,
  isDeepSquatBoardDetected,
} from "./deep-squat-board-detector.js";

const DEEP_SQUAT_ACTION = "deep_squat";
const DEEP_SQUAT_FINAL_SCORE_MODEL_VERSION =
  "fms-level-1-manual-v2.9-deep-squat-final-v0.1";

function normalizeScoreValue(score, actionType = DEEP_SQUAT_ACTION) {
  if (typeof score === "number" && Number.isFinite(score)) {
    return score;
  }

  const normalized = normalizeScoreForAction(score, actionType);
  if (
    typeof normalized?.totalScore === "number" &&
    Number.isFinite(normalized.totalScore)
  ) {
    return normalized.totalScore;
  }

  return null;
}

function hasPainOrFailedClearing(segment) {
  const actionType = segment.actionType ?? DEEP_SQUAT_ACTION;
  const rawClearingFindings = segment.clearingFindings ?? [];
  const clearingFindings = normalizeClearingFindings(
    actionType,
    rawClearingFindings,
    segment.clearingTest,
  );
  const hasPositiveFinding = (finding) =>
    finding.affectsRawScore && finding.result === "positive";

  return (
    Boolean(segment.painFlag) ||
    segment.clearingTest === "fail" ||
    segment.clearingTest === "positive" ||
    rawClearingFindings.some(hasPositiveFinding) ||
    clearingFindings.some(hasPositiveFinding)
  );
}

function buildSuggestionMap(suggestionReport) {
  return new Map(
    (suggestionReport?.items ?? [])
      .filter((item) => item?.segmentId)
      .map((item) => [item.segmentId, item]),
  );
}

function getPoseSuggestion(segment, suggestionMap) {
  return segment.poseSuggestion ?? suggestionMap.get(segment.segmentId) ?? null;
}

function getHumanFinalScore(segment) {
  const actionType = segment.actionType ?? DEEP_SQUAT_ACTION;

  if (segment.finalLabel) {
    const finalScore = normalizeScoreValue(segment.finalLabel, actionType);
    if (
      finalScore !== null &&
      (!segment.labelStatus || segment.labelStatus === "valid")
    ) {
      return {
        score: finalScore,
        source: "human_final",
      };
    }
  }

  if (!segment.reviewerScores) {
    return null;
  }

  const adjudication = adjudicateScores(
    normalizeScoreForAction(segment.aiScore, actionType),
    normalizeScoreForAction(segment.reviewerScores.reviewer_a, actionType),
    normalizeScoreForAction(segment.reviewerScores.reviewer_b, actionType),
  );
  const score = normalizeScoreValue(adjudication.finalScore, actionType);

  if (score === null) {
    return null;
  }

  return {
    score,
    source: adjudication.labelSource,
  };
}

function getPoseSuggestionScore(segment, suggestionMap) {
  const suggestion = getPoseSuggestion(segment, suggestionMap);
  const actionType = segment.actionType ?? DEEP_SQUAT_ACTION;

  if (
    suggestion?.status !== "suggested" &&
    suggestion?.status !== "needs_heel_elevated_attempt"
  ) {
    return null;
  }

  const score =
    suggestion.status === "needs_heel_elevated_attempt"
      ? normalizeScoreValue(
          { totalScore: suggestion.rawAttemptScore },
          actionType,
        )
      : normalizeScoreValue(suggestion, actionType);
  if (score === null) {
    return null;
  }

  return {
    score,
    source:
      suggestion.status === "needs_heel_elevated_attempt"
        ? "pose_floor_attempt_evidence"
        : "pose_suggestion",
  };
}

function hasNotScoredReview(score) {
  return score?.scoringStatus === "not_scored" || score?.totalScore === null;
}

function buildNotScorableReasonCodes(segment, attemptCondition, suggestion) {
  const reasonCodes = [];
  const suggestionReasons = suggestion?.reasons ?? [];

  if (
    hasNotScoredReview(segment.reviewerScores?.reviewer_a) ||
    hasNotScoredReview(segment.reviewerScores?.reviewer_b)
  ) {
    reasonCodes.push("human_marked_not_scored");
  }

  if (suggestion?.status === "insufficient_evidence") {
    reasonCodes.push("pose_evidence_insufficient");
  }

  if (
    suggestionReasons.some((reason) => reason.includes("movement amplitude"))
  ) {
    reasonCodes.push("low_motion_amplitude");
  }

  if (
    suggestionReasons.some((reason) =>
      reason.includes("Timing evidence does not overlap"),
    )
  ) {
    reasonCodes.push("timing_evidence_insufficient");
  }

  if (reasonCodes.length === 0) {
    reasonCodes.push("no_pose_or_human_score");
  }

  reasonCodes.push(
    isHeelElevatedAttempt(attemptCondition)
      ? "heel_elevated_attempt_not_confirmed_two"
      : "floor_attempt_not_confirmed_three",
  );

  return [...new Set(reasonCodes)];
}

function getHeelElevatedFallbackScore(segment) {
  const actionType = segment.actionType ?? DEEP_SQUAT_ACTION;
  const aiScore = normalizeScoreValue(segment.aiScore, actionType);
  const referenceScore = normalizeScoreValue(
    {
      totalScore: segment.aiScore?.referenceScore,
    },
    actionType,
  );

  if (aiScore !== null && aiScore < 3) {
    return {
      score: aiScore,
      source: "segment_ai_suggestion",
    };
  }

  if (referenceScore !== null) {
    return {
      score: referenceScore,
      source: "reference_label",
    };
  }

  return null;
}

function resolveHeelElevatedSourceScore(poseScore, fallbackScore) {
  if (!fallbackScore) {
    return poseScore;
  }

  if (!poseScore) {
    return fallbackScore;
  }

  if (fallbackScore.score >= 2 && poseScore.score < 2) {
    return fallbackScore;
  }

  return poseScore;
}

function buildAttempt(segment, suggestionMap, context) {
  const boardDetection = detectDeepSquatBoardUsage({
    segment,
    notes: context.notes,
    fileName: context.fileName,
    repetitionCount: context.repetitionCount,
  });
  const attemptCondition = isDeepSquatBoardDetected(boardDetection)
    ? DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED
    : inferDeepSquatAttemptCondition({
        segment,
        notes: context.notes,
        fileName: context.fileName,
        repetitionCount: context.repetitionCount,
      });

  if (hasPainOrFailedClearing(segment)) {
    return {
      segmentId: segment.segmentId,
      repetitionIndex: segment.repetitionIndex,
      attemptCondition,
      boardDetection,
      attemptScore: 0,
      scoreSource: "pain_or_clearing",
      scorable: true,
    };
  }

  const humanFinalScore = getHumanFinalScore(segment);
  const poseSuggestionScore = getPoseSuggestionScore(segment, suggestionMap);
  const heelElevatedFallbackScore = isHeelElevatedAttempt(attemptCondition)
    ? getHeelElevatedFallbackScore(segment)
    : null;
  const sourceScore =
    humanFinalScore ??
    (isHeelElevatedAttempt(attemptCondition)
      ? resolveHeelElevatedSourceScore(
          poseSuggestionScore,
          heelElevatedFallbackScore,
        )
      : poseSuggestionScore);

  if (!sourceScore) {
    const suggestion = getPoseSuggestion(segment, suggestionMap);
    return {
      segmentId: segment.segmentId,
      repetitionIndex: segment.repetitionIndex,
      attemptCondition,
      boardDetection,
      attemptScore: null,
      scoreSource: "insufficient_evidence",
      reasonCodes: buildNotScorableReasonCodes(
        segment,
        attemptCondition,
        suggestion,
      ),
      evidenceReasons: suggestion?.reasons ?? [],
      scorable: false,
    };
  }

  return {
    segmentId: segment.segmentId,
    repetitionIndex: segment.repetitionIndex,
    attemptCondition,
    boardDetection,
    attemptScore: capDeepSquatAttemptScoreForCondition(
      sourceScore.score,
      attemptCondition,
    ),
    rawAttemptScore: sourceScore.score,
    scoreSource: sourceScore.source,
    scorable: true,
  };
}

function buildResult({ status, finalScore, attempts, reasonCodes }) {
  return {
    actionType: DEEP_SQUAT_ACTION,
    status,
    finalScore,
    attempts,
    reasonCodes,
    modelVersion: DEEP_SQUAT_FINAL_SCORE_MODEL_VERSION,
  };
}

export function buildDeepSquatFinalScorePreview({
  segments,
  notes = "",
  fileName = "",
  suggestionReport = null,
} = {}) {
  const deepSquatSegments = (segments ?? []).filter(
    (segment) =>
      (segment.actionType ?? DEEP_SQUAT_ACTION) === DEEP_SQUAT_ACTION,
  );

  if (deepSquatSegments.length === 0) {
    return null;
  }

  const suggestionMap = buildSuggestionMap(suggestionReport);
  const attempts = deepSquatSegments.map((segment) =>
    buildAttempt(segment, suggestionMap, {
      notes,
      fileName,
      repetitionCount: deepSquatSegments.length,
    }),
  );

  if (attempts.some((attempt) => attempt.attemptScore === 0)) {
    return buildResult({
      status: "pain_zero",
      finalScore: 0,
      attempts,
      reasonCodes: ["pain_or_clearing_zero"],
    });
  }

  const scorableAttempts = attempts.filter((attempt) => attempt.scorable);
  if (scorableAttempts.length === 0) {
    return buildResult({
      status: "insufficient_evidence",
      finalScore: null,
      attempts,
      reasonCodes: ["no_scorable_attempts"],
    });
  }

  const floorAttempts = scorableAttempts.filter(
    (attempt) => !isHeelElevatedAttempt(attempt.attemptCondition),
  );
  const heelElevatedAttempts = scorableAttempts.filter((attempt) =>
    isHeelElevatedAttempt(attempt.attemptCondition),
  );

  if (floorAttempts.some((attempt) => attempt.attemptScore === 3)) {
    return buildResult({
      status: "final_ready",
      finalScore: 3,
      attempts,
      reasonCodes: ["floor_attempt_earned_three"],
    });
  }

  if (heelElevatedAttempts.some((attempt) => attempt.attemptScore >= 2)) {
    return buildResult({
      status: "final_ready",
      finalScore: 2,
      attempts,
      reasonCodes: ["heel_elevated_attempt_earned_two"],
    });
  }

  if (heelElevatedAttempts.length > 0) {
    return buildResult({
      status: "final_ready",
      finalScore: 1,
      attempts,
      reasonCodes: ["heel_elevated_attempt_below_two"],
    });
  }

  return buildResult({
    status: "needs_heel_elevated_attempt",
    finalScore: null,
    attempts,
    reasonCodes: ["floor_attempt_no_three_needs_board"],
  });
}
