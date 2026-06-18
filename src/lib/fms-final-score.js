import {
  normalizeClearingFindings,
  normalizeScoreForAction,
} from "../constants/scoring.js";
import { adjudicateScores } from "./adjudication.js";

const DEEP_SQUAT_ACTION = "deep_squat";
const HEELS_ELEVATED_ATTEMPT = "heels_elevated_board";
const DEEP_SQUAT_FINAL_SCORE_MODEL_VERSION =
  "fms-level-1-manual-v2.9-deep-squat-final-v0.1";

const HEEL_ELEVATED_EN =
  "heel[- ]?elevated|heels elevated|heel lift|heel lifted|heels lifted|heel raised|heels raised|heel off floor|heels off floor|board under heels|fms board";
const HEEL_ELEVATED_ZH =
  "脚后跟垫高|脚跟垫高|垫脚跟|垫高脚跟|脚后跟抬起|脚跟抬起|脚后跟离地|脚跟离地|FMS板|fms板";

const CHINESE_DIGITS = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function parseChineseNumber(token) {
  if (!token) {
    return null;
  }

  if (token === "十") {
    return 10;
  }

  if (token.includes("十")) {
    const [leftRaw, rightRaw] = token.split("十");
    const left = leftRaw ? CHINESE_DIGITS[leftRaw] : 1;
    const right = rightRaw ? CHINESE_DIGITS[rightRaw] : 0;

    if (left === undefined || right === undefined) {
      return null;
    }

    return left * 10 + right;
  }

  return CHINESE_DIGITS[token] ?? null;
}

function parseNaturalNumber(token) {
  if (!token) {
    return null;
  }

  if (/^\d+$/.test(token)) {
    return Number(token);
  }

  return parseChineseNumber(token);
}

function hasHeelElevatedKeyword(text) {
  const notes = text ?? "";

  return (
    new RegExp(HEEL_ELEVATED_EN, "i").test(notes) ||
    new RegExp(HEEL_ELEVATED_ZH, "i").test(notes)
  );
}

function addRange(repetitions, startToken, endToken) {
  const start = parseNaturalNumber(startToken);
  const end = parseNaturalNumber(endToken);

  if (!start || !end) {
    return;
  }

  for (
    let index = Math.min(start, end);
    index <= Math.max(start, end);
    index += 1
  ) {
    repetitions.add(index);
  }
}

function addSingle(repetitions, token) {
  const index = parseNaturalNumber(token);

  if (index) {
    repetitions.add(index);
  }
}

function parseHeelElevatedRepetitions(notesText, repetitionCount = 0) {
  const notes = notesText ?? "";
  const repetitions = new Set();
  const indexToken = "([一二三四五六七八九十两\\d]+)";

  const rangePatterns = [
    new RegExp(
      `rep\\s*${indexToken}\\s*(?:-|–|—|~|到|至)\\s*${indexToken}[^.;；，。\\n]*?(?:${HEEL_ELEVATED_EN})`,
      "gi",
    ),
    new RegExp(
      `(?:第\\s*${indexToken}\\s*(?:-|–|—|~|到|至)\\s*${indexToken}\\s*(?:个|次|段|rep)?|${indexToken}\\s*(?:个|次|段|rep)\\s*(?:-|–|—|~|到|至)\\s*${indexToken}\\s*(?:个|次|段|rep)?|${indexToken}\\s*(?:-|–|—|~|到|至)\\s*${indexToken}\\s*(?:个|次|段|rep))[^；，。\\n]*?(?:${HEEL_ELEVATED_ZH})`,
      "gi",
    ),
  ];

  rangePatterns.forEach((pattern) => {
    let match = pattern.exec(notes);
    while (match) {
      const [startToken, endToken] = match.slice(1).filter(Boolean);
      addRange(repetitions, startToken, endToken);
      match = pattern.exec(notes);
    }
  });

  const singlePatterns = [
    new RegExp(
      `rep\\s*${indexToken}[^.;；，。\\n]*?(?:${HEEL_ELEVATED_EN})`,
      "gi",
    ),
    new RegExp(
      `第\\s*${indexToken}\\s*(?:个|次|段|rep)?[^；，。\\n]*?(?:${HEEL_ELEVATED_ZH})`,
      "gi",
    ),
  ];

  singlePatterns.forEach((pattern) => {
    let match = pattern.exec(notes);
    while (match) {
      addSingle(repetitions, match[1]);
      match = pattern.exec(notes);
    }
  });

  if (
    repetitionCount > 0 &&
    (notes.includes("后两个") || notes.toLowerCase().includes("last two")) &&
    hasHeelElevatedKeyword(notes)
  ) {
    addRange(repetitions, repetitionCount - 1, repetitionCount);
  }

  if (
    repetitionCount > 1 &&
    hasHeelElevatedKeyword(notes) &&
    (/(?:except|besides|other than|apart from)\s+(?:the\s+)?first|all\s+but\s+(?:the\s+)?first/i.test(
      notes,
    ) ||
      /除了?\s*第?\s*[一1]\s*(?:个|次|段|rep)?(?:以外|之外)?[^；，。.\n]*(?:都|其余|其他|后面)/.test(
        notes,
      ) ||
      /(?:其余|其他|后面)[^；，。.\n]*(?:都)?[^；，。.\n]*(?:脚后跟垫高|脚跟垫高|垫脚跟|垫高脚跟|脚后跟抬起|脚跟抬起|脚后跟离地|脚跟离地)/.test(
        notes,
      ))
  ) {
    addRange(repetitions, 2, repetitionCount);
  }

  return repetitions;
}

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

function normalizeAttemptCondition(value) {
  return value || "floor";
}

function isHeelElevatedAttempt(attemptCondition) {
  return attemptCondition === HEELS_ELEVATED_ATTEMPT;
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

  if (suggestion?.status !== "suggested") {
    return null;
  }

  const score = normalizeScoreValue(suggestion, actionType);
  if (score === null) {
    return null;
  }

  return {
    score,
    source: "pose_suggestion",
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

function capAttemptScoreForCondition(score, attemptCondition) {
  if (isHeelElevatedAttempt(attemptCondition)) {
    return Math.min(score, 2);
  }

  return score;
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

function resolveAttemptCondition(segment, heelElevatedRepetitions) {
  const attemptCondition = normalizeAttemptCondition(segment.attemptCondition);
  if (heelElevatedRepetitions.has(segment.repetitionIndex)) {
    return HEELS_ELEVATED_ATTEMPT;
  }

  return attemptCondition;
}

function buildAttempt(segment, suggestionMap, heelElevatedRepetitions) {
  const attemptCondition = resolveAttemptCondition(
    segment,
    heelElevatedRepetitions,
  );

  if (hasPainOrFailedClearing(segment)) {
    return {
      segmentId: segment.segmentId,
      repetitionIndex: segment.repetitionIndex,
      attemptCondition,
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
    attemptScore: capAttemptScoreForCondition(
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
  const heelElevatedRepetitions = parseHeelElevatedRepetitions(
    notes,
    deepSquatSegments.length,
  );
  const attempts = deepSquatSegments.map((segment) =>
    buildAttempt(segment, suggestionMap, heelElevatedRepetitions),
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
