const SCORE_VALUES = new Set([0, 1, 2, 3]);
const STUDY_ROUNDS = new Set(["round_a", "round_b", "dry_run"]);
const REVIEW_STATUSES = new Set(["scored", "deferred"]);
const CONFIDENCE_VALUES = new Set(["low", "medium", "high"]);
const CAMERA_VIEWS = new Set(["unknown", "front", "side", "mixed"]);
const SIDES = new Set(["unknown", "none", "left", "right", "bilateral"]);

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function assertNonEmpty(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
}

function assertStudyRound(studyRound) {
  if (!STUDY_ROUNDS.has(studyRound)) {
    throw new Error("studyRound must be round_a, round_b, or dry_run.");
  }
}

function expectedRepetitionIds(pilot) {
  const items = Array.isArray(pilot?.items)
    ? pilot.items
    : (pilot?.repetitions ?? []);
  return [
    ...new Set(items.map((item) => item.repetitionId).filter(Boolean)),
  ].sort();
}

function isIsoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function sameStringArray(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function completionMatches(reported, computed) {
  if (!reported || typeof reported !== "object") {
    return false;
  }
  return Object.entries(computed).every(([key, value]) =>
    Array.isArray(value)
      ? sameStringArray(reported[key], value)
      : reported[key] === value,
  );
}

function summarizeCompletion({ pilot, reviewerId, studyRound, events }) {
  const expectedIds = expectedRepetitionIds(pilot);
  const expectedSet = new Set(expectedIds);
  const contextEvents = (events ?? []).filter(
    (event) =>
      event?.pilotId === pilot?.pilotId &&
      event?.reviewerId === reviewerId &&
      event?.studyRound === studyRound,
  );
  const latest = [...latestStudyReviews(contextEvents).values()];
  const reviewedIds = new Set(latest.map((event) => event.repetitionId));
  const missingRepetitionIds = expectedIds.filter((id) => !reviewedIds.has(id));
  const unexpectedRepetitionIds = [...reviewedIds]
    .filter((id) => !expectedSet.has(id))
    .sort();
  const scoredCount = latest.filter(
    (event) => event.status === "scored",
  ).length;
  const deferredCount = latest.filter(
    (event) => event.status === "deferred",
  ).length;
  const analysisExcludedCount = latest.filter(
    (event) =>
      event.status === "scored" &&
      event.blindReview?.eligibleForBlindAnalysis === false,
  ).length;
  const complete =
    expectedIds.length > 0 &&
    scoredCount === expectedIds.length &&
    deferredCount === 0 &&
    missingRepetitionIds.length === 0 &&
    unexpectedRepetitionIds.length === 0;

  return {
    status: complete ? "complete" : "partial",
    complete,
    expectedCount: expectedIds.length,
    latestReviewCount: latest.length,
    scoredCount,
    deferredCount,
    analysisExcludedCount,
    missingRepetitionIds,
    unexpectedRepetitionIds,
  };
}

export function buildStudyQueue(
  canonicalPilot,
  reviewerId,
  studyRound = "round_a",
) {
  assertNonEmpty(canonicalPilot?.pilotId, "pilotId");
  assertNonEmpty(reviewerId, "reviewerId");
  assertStudyRound(studyRound);

  if (Array.isArray(canonicalPilot.items)) {
    return canonicalPilot.items
      .map((item) => ({
        repetitionId: item.repetitionId,
        ingestId: item.ingestId,
        actionType: item.actionType,
        startSecond: item.startSecond,
        endSecond: item.endSecond,
        cameraView: item.cameraView ?? "unknown",
        side: item.side ?? "unknown",
        videoPath: item.videoPath,
        orderKey: stableHash(
          `${studyRound}:${reviewerId}:${item.repetitionId}`,
        ),
      }))
      .sort(
        (left, right) =>
          left.orderKey - right.orderKey ||
          left.repetitionId.localeCompare(right.repetitionId),
      )
      .map((item, index) => ({
        repetitionId: item.repetitionId,
        ingestId: item.ingestId,
        actionType: item.actionType,
        startSecond: item.startSecond,
        endSecond: item.endSecond,
        cameraView: item.cameraView,
        side: item.side,
        videoPath: item.videoPath,
        studyIndex: index + 1,
      }));
  }

  const videosById = new Map(
    (canonicalPilot.videos ?? []).map((video) => [video.videoId, video]),
  );

  return (canonicalPilot.repetitions ?? [])
    .map((repetition) => {
      const video = videosById.get(repetition.videoId);
      if (!video || video.status !== "found" || !video.relativePath) {
        return null;
      }

      return {
        repetitionId: repetition.repetitionId,
        ingestId: repetition.ingestId,
        actionType: repetition.actionType,
        startSecond: repetition.startSecond,
        endSecond: repetition.endSecond,
        cameraView: repetition.cameraView ?? "unknown",
        side: repetition.side ?? "unknown",
        videoPath: video.relativePath,
        orderKey: stableHash(
          `${studyRound}:${reviewerId}:${repetition.repetitionId}`,
        ),
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        left.orderKey - right.orderKey ||
        left.repetitionId.localeCompare(right.repetitionId),
    )
    .map((item, index) => ({
      repetitionId: item.repetitionId,
      ingestId: item.ingestId,
      actionType: item.actionType,
      startSecond: item.startSecond,
      endSecond: item.endSecond,
      cameraView: item.cameraView,
      side: item.side,
      videoPath: item.videoPath,
      studyIndex: index + 1,
    }));
}

export function latestStudyReviews(events) {
  const latestByRepetition = new Map();

  for (const event of events ?? []) {
    if (!event?.repetitionId || !event?.createdAt) {
      continue;
    }

    const previous = latestByRepetition.get(event.repetitionId);
    if (!previous || previous.createdAt <= event.createdAt) {
      latestByRepetition.set(event.repetitionId, event);
    }
  }

  return latestByRepetition;
}

export function createStudyReviewEvent({
  pilotId,
  reviewerId,
  studyRound = "round_a",
  repetition,
  status = "scored",
  score,
  confidence = "medium",
  cameraView = "unknown",
  side = "unknown",
  comment = "",
  qualityFlags = [],
  now = new Date(),
  reviewStartedAt = now.toISOString(),
  reviewDurationMs = 0,
  supersedesEventId = null,
  eventId = crypto.randomUUID(),
}) {
  assertNonEmpty(pilotId, "pilotId");
  assertNonEmpty(reviewerId, "reviewerId");
  assertNonEmpty(repetition?.repetitionId, "repetitionId");
  assertStudyRound(studyRound);

  if (!REVIEW_STATUSES.has(status)) {
    throw new Error("status must be scored or deferred.");
  }
  if (status === "scored" && !SCORE_VALUES.has(score)) {
    throw new Error("score must be 0, 1, 2, or 3.");
  }
  if (status === "scored" && !CONFIDENCE_VALUES.has(confidence)) {
    throw new Error("confidence must be low, medium, or high.");
  }
  if (!isIsoDate(reviewStartedAt)) {
    throw new Error("reviewStartedAt must be an ISO date-time.");
  }
  if (!Number.isFinite(reviewDurationMs) || reviewDurationMs < 0) {
    throw new Error("reviewDurationMs must be a non-negative number.");
  }

  const normalizedFlags = [...new Set(qualityFlags)].sort();
  const labelCueDetected = normalizedFlags.includes("label_cue_visible");

  return {
    schemaVersion: "ai_fms_study_review_event_v2",
    eventId,
    pilotId,
    studyRound,
    repetitionId: repetition.repetitionId,
    ingestId: repetition.ingestId,
    actionType: repetition.actionType,
    reviewerId: reviewerId.trim(),
    status,
    score: status === "scored" ? score : null,
    confidence: status === "scored" ? confidence : null,
    cameraView,
    side,
    comment: comment.trim(),
    qualityFlags: normalizedFlags,
    blindReview: {
      historicalHumanScoresHidden: true,
      legacyAiSuggestionHidden: true,
      sourceFileNameHidden: true,
      audioMuted: true,
      labelCueDetected,
      eligibleForBlindAnalysis: !labelCueDetected,
    },
    rubricVersion: "fms_v1.0",
    reviewStartedAt,
    reviewDurationMs: Math.round(reviewDurationMs),
    supersedesEventId,
    createdAt: now.toISOString(),
  };
}

export function buildStudyReviewExport({
  pilot,
  reviewerId,
  studyRound = "round_a",
  events,
  exportedAt = new Date(),
}) {
  assertNonEmpty(pilot?.pilotId, "pilotId");
  assertNonEmpty(reviewerId, "reviewerId");
  assertStudyRound(studyRound);
  const completion = summarizeCompletion({
    pilot,
    reviewerId,
    studyRound,
    events,
  });
  return {
    schemaVersion: "ai_fms_study_review_export_v2",
    pilotId: pilot.pilotId,
    studyRound,
    reviewerId,
    exportedAt: exportedAt.toISOString(),
    sourceSnapshotDate:
      pilot.sourceSnapshotDate ?? pilot.snapshotSourceDate ?? null,
    sourcePoolFingerprint: pilot.sourcePoolFingerprint ?? null,
    sourceFeatureMatrixFingerprint:
      pilot.sourceFeatureMatrixFingerprint ?? null,
    expectedRepetitionIds: expectedRepetitionIds(pilot),
    eventCount: events?.length ?? 0,
    completion,
    events: events ?? [],
  };
}

export function validateStudyReviewExport(
  payload,
  { pilot = null, requireComplete = true } = {},
) {
  const errors = [];
  const warnings = [];

  if (payload?.schemaVersion !== "ai_fms_study_review_export_v2") {
    errors.push("schemaVersion must be ai_fms_study_review_export_v2.");
  }
  if (!payload?.pilotId) {
    errors.push("pilotId is required.");
  }
  if (!STUDY_ROUNDS.has(payload?.studyRound)) {
    errors.push("studyRound is invalid.");
  }
  if (!payload?.reviewerId) {
    errors.push("reviewerId is required.");
  }
  if (!isIsoDate(payload?.exportedAt)) {
    errors.push("exportedAt must be an ISO date-time.");
  }
  if (!Array.isArray(payload?.events)) {
    errors.push("events must be an array.");
  }

  const expectedIds = pilot
    ? expectedRepetitionIds(pilot)
    : Array.isArray(payload?.expectedRepetitionIds)
      ? [...new Set(payload.expectedRepetitionIds)].sort()
      : [];
  const expectedSet = new Set(expectedIds);
  const eventIds = new Set();
  const eventsById = new Map();

  for (const [index, event] of (payload?.events ?? []).entries()) {
    const prefix = `events[${index}]`;
    if (event?.schemaVersion !== "ai_fms_study_review_event_v2") {
      errors.push(`${prefix}.schemaVersion is invalid.`);
    }
    if (!event?.eventId || eventIds.has(event.eventId)) {
      errors.push(`${prefix}.eventId is missing or duplicated.`);
    } else {
      eventIds.add(event.eventId);
      eventsById.set(event.eventId, event);
    }
    if (event?.pilotId !== payload?.pilotId) {
      errors.push(`${prefix}.pilotId does not match the export.`);
    }
    if (event?.reviewerId !== payload?.reviewerId) {
      errors.push(`${prefix}.reviewerId does not match the export.`);
    }
    if (event?.studyRound !== payload?.studyRound) {
      errors.push(`${prefix}.studyRound does not match the export.`);
    }
    if (!expectedSet.has(event?.repetitionId)) {
      errors.push(`${prefix}.repetitionId is outside the frozen manifest.`);
    }
    if (!REVIEW_STATUSES.has(event?.status)) {
      errors.push(`${prefix}.status is invalid.`);
    }
    if (event?.status === "scored" && !SCORE_VALUES.has(event?.score)) {
      errors.push(`${prefix}.score is invalid.`);
    }
    if (
      event?.status === "scored" &&
      !CONFIDENCE_VALUES.has(event?.confidence)
    ) {
      errors.push(`${prefix}.confidence is invalid.`);
    }
    if (!isIsoDate(event?.reviewStartedAt)) {
      errors.push(`${prefix}.reviewStartedAt is invalid.`);
    }
    if (!isIsoDate(event?.createdAt)) {
      errors.push(`${prefix}.createdAt is invalid.`);
    }
    if (
      !Number.isFinite(event?.reviewDurationMs) ||
      event.reviewDurationMs < 0
    ) {
      errors.push(`${prefix}.reviewDurationMs is invalid.`);
    }
    if (
      isIsoDate(event?.reviewStartedAt) &&
      isIsoDate(event?.createdAt) &&
      Date.parse(event.reviewStartedAt) > Date.parse(event.createdAt)
    ) {
      errors.push(`${prefix}.reviewStartedAt is after createdAt.`);
    }
    if (!CAMERA_VIEWS.has(event?.cameraView)) {
      errors.push(`${prefix}.cameraView is invalid.`);
    }
    if (!SIDES.has(event?.side)) {
      errors.push(`${prefix}.side is invalid.`);
    }
    if (!event?.blindReview || typeof event.blindReview !== "object") {
      errors.push(`${prefix}.blindReview is required.`);
    } else if (
      event.blindReview.labelCueDetected === true &&
      event.blindReview.eligibleForBlindAnalysis !== false
    ) {
      errors.push(`${prefix}.blindReview label-cue status is inconsistent.`);
    }
  }

  for (const [index, event] of (payload?.events ?? []).entries()) {
    if (!event?.supersedesEventId) {
      continue;
    }
    const superseded = eventsById.get(event.supersedesEventId);
    if (!superseded) {
      errors.push(`events[${index}].supersedesEventId was not found.`);
    } else if (superseded.repetitionId !== event.repetitionId) {
      errors.push(
        `events[${index}].supersedesEventId points to another repetition.`,
      );
    }
  }

  const completion = pilot
    ? summarizeCompletion({
        pilot,
        reviewerId: payload?.reviewerId,
        studyRound: payload?.studyRound,
        events: payload?.events,
      })
    : (() => {
        const pseudoPilot = {
          pilotId: payload?.pilotId,
          items: expectedIds.map((repetitionId) => ({ repetitionId })),
        };
        return summarizeCompletion({
          pilot: pseudoPilot,
          reviewerId: payload?.reviewerId,
          studyRound: payload?.studyRound,
          events: payload?.events,
        });
      })();

  if (
    payload?.eventCount !== undefined &&
    payload.eventCount !== (payload?.events?.length ?? 0)
  ) {
    errors.push("eventCount does not match events.length.");
  }
  if (
    payload?.completion &&
    !completionMatches(payload.completion, completion)
  ) {
    errors.push("completion summary does not match the event log.");
  }
  if (!payload?.completion) {
    errors.push("completion summary is required.");
  }
  if (pilot && payload?.pilotId !== pilot.pilotId) {
    errors.push("pilotId does not match the supplied manifest.");
  }
  if (!sameStringArray(payload?.expectedRepetitionIds, expectedIds)) {
    errors.push("expectedRepetitionIds do not match the frozen manifest.");
  }
  if (
    pilot?.sourcePoolFingerprint &&
    payload?.sourcePoolFingerprint !== pilot.sourcePoolFingerprint
  ) {
    errors.push("sourcePoolFingerprint does not match the frozen manifest.");
  }
  if (
    pilot?.sourceFeatureMatrixFingerprint &&
    payload?.sourceFeatureMatrixFingerprint !==
      pilot.sourceFeatureMatrixFingerprint
  ) {
    errors.push(
      "sourceFeatureMatrixFingerprint does not match the frozen manifest.",
    );
  }
  if (requireComplete && !completion.complete) {
    errors.push(
      `review is incomplete (${completion.scoredCount}/${completion.expectedCount} scored).`,
    );
  } else if (!completion.complete) {
    warnings.push(
      `partial review (${completion.scoredCount}/${completion.expectedCount} scored).`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    completion,
  };
}

export function studyStorageKey(pilotId, reviewerId, studyRound = "round_a") {
  assertStudyRound(studyRound);
  return `ai-fms-study:${pilotId}:${studyRound}:${reviewerId.trim().toLowerCase()}:events`;
}
