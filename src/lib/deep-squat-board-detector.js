import {
  DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED,
  inferDeepSquatScoreTwoBoardRepetitions,
  inferHeelElevatedRepetitions,
  isHeelElevatedAttempt,
} from "./deep-squat-attempt-condition.js";

export const DEEP_SQUAT_BOARD_DETECTION_DETECTED = "detected";
export const DEEP_SQUAT_BOARD_DETECTION_NOT_DETECTED = "not_detected";
export const DEEP_SQUAT_BOARD_DETECTION_UNKNOWN = "unknown";

export const DEEP_SQUAT_BOARD_DETECTION_MODEL_VERSION =
  "deep-squat-board-detector-v0.1-protocol-metadata";

function normalizeDetectionStatus(status) {
  return [
    DEEP_SQUAT_BOARD_DETECTION_DETECTED,
    DEEP_SQUAT_BOARD_DETECTION_NOT_DETECTED,
    DEEP_SQUAT_BOARD_DETECTION_UNKNOWN,
  ].includes(status)
    ? status
    : DEEP_SQUAT_BOARD_DETECTION_UNKNOWN;
}

function buildDetection({
  status,
  source,
  confidence,
  reasonCodes,
  attemptCondition = null,
}) {
  return {
    status: normalizeDetectionStatus(status),
    source,
    confidence,
    reasonCodes,
    attemptCondition,
    modelVersion: DEEP_SQUAT_BOARD_DETECTION_MODEL_VERSION,
    limitations:
      "First-pass board detection uses explicit protocol metadata, notes, and curated sample patterns. It does not yet inspect raw video pixels.",
  };
}

function buildDetected(source, reasonCodes) {
  const confidenceBySource = {
    segment_metadata: 0.96,
    notes: 0.9,
    curated_sample_metadata: 0.86,
    pose_or_visual_metadata: 0.82,
  };

  return buildDetection({
    status: DEEP_SQUAT_BOARD_DETECTION_DETECTED,
    source,
    confidence: confidenceBySource[source] ?? 0.8,
    reasonCodes,
    attemptCondition: DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED,
  });
}

function normalizeExistingDetection(boardDetection) {
  if (!boardDetection) {
    return null;
  }

  const status = normalizeDetectionStatus(boardDetection.status);
  return buildDetection({
    status,
    source: boardDetection.source ?? "pose_or_visual_metadata",
    confidence:
      typeof boardDetection.confidence === "number"
        ? boardDetection.confidence
        : status === DEEP_SQUAT_BOARD_DETECTION_DETECTED
          ? 0.82
          : null,
    reasonCodes: boardDetection.reasonCodes ?? ["existing_board_detection"],
    attemptCondition:
      boardDetection.attemptCondition ??
      (status === DEEP_SQUAT_BOARD_DETECTION_DETECTED
        ? DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED
        : null),
  });
}

export function detectDeepSquatBoardUsage({
  segment = null,
  notes = "",
  fileName = "",
  repetitionCount = 0,
} = {}) {
  const existingDetection = normalizeExistingDetection(segment?.boardDetection);
  if (existingDetection?.status === DEEP_SQUAT_BOARD_DETECTION_DETECTED) {
    return existingDetection;
  }

  if (isHeelElevatedAttempt(segment?.attemptCondition)) {
    return buildDetected("segment_metadata", [
      "segment_attempt_condition_heels_elevated_board",
    ]);
  }

  const repetitionIndex = segment?.repetitionIndex;
  const notesRepetitions = inferHeelElevatedRepetitions({
    notes,
    repetitionCount,
  });
  const curatedRepetitions = inferDeepSquatScoreTwoBoardRepetitions({
    fileName,
    repetitionCount,
  });

  if (notesRepetitions.has(repetitionIndex)) {
    return buildDetected("notes", [
      "notes_identify_heel_elevated_or_fms_board_repetition",
    ]);
  }

  if (curatedRepetitions.has(repetitionIndex)) {
    return buildDetected("curated_sample_metadata", [
      "curated_score_two_sample_last_repetitions_use_board",
    ]);
  }

  if (existingDetection) {
    return existingDetection;
  }

  return buildDetection({
    status: DEEP_SQUAT_BOARD_DETECTION_UNKNOWN,
    source: "insufficient_visual_evidence",
    confidence: null,
    reasonCodes: ["no_board_metadata_or_visual_detector_result"],
  });
}

export function isDeepSquatBoardDetected(boardDetection) {
  return boardDetection?.status === DEEP_SQUAT_BOARD_DETECTION_DETECTED;
}

export function applyDeepSquatBoardDetectionToSegment(segment, context = {}) {
  const boardDetection = detectDeepSquatBoardUsage({
    segment,
    notes: context.notes,
    fileName: context.fileName,
    repetitionCount: context.repetitionCount,
  });

  return {
    ...segment,
    boardDetection,
    ...(isDeepSquatBoardDetected(boardDetection)
      ? { attemptCondition: DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED }
      : {}),
  };
}
