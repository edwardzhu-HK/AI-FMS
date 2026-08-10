const SCORE_VALUES = new Set([0, 1, 2, 3]);
const STUDY_ROUNDS = new Set(["round_a", "round_b", "dry_run"]);
const REVIEW_STATUSES = new Set(["scored", "deferred", "unscorable"]);
const CONFIDENCE_VALUES = new Set(["low", "medium", "high"]);
const CAMERA_VIEWS = new Set(["unknown", "front", "side", "mixed"]);
const SIDES = new Set(["unknown", "none", "left", "right", "bilateral"]);
const UNSCORABLE_REASONS = new Set([
  "movement_not_visible",
  "missing_required_reference",
  "missing_required_protocol_condition",
  "timing_invalid",
  "other",
]);
const ZERO_SCORE_REASONS = new Set(["pain_observed_or_reported"]);
const EVIDENCE_USEFULNESS_VALUES = new Set([
  "helpful",
  "no_change",
  "insufficient",
]);
const EVIDENCE_STATUSES = new Set([
  "ai_score_available",
  "features_only",
  "protocol_metadata_required",
  "quality_limited",
  "suggestion_unavailable",
]);
const LEGACY_COMPLETION_FIELDS = [
  "status",
  "complete",
  "expectedCount",
  "latestReviewCount",
  "scoredCount",
  "deferredCount",
  "analysisExcludedCount",
  "missingRepetitionIds",
  "unexpectedRepetitionIds",
];

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
  if (LEGACY_COMPLETION_FIELDS.some((field) => !(field in reported))) {
    return false;
  }
  return Object.entries(reported).every(
    ([key, value]) =>
      key in computed &&
      (Array.isArray(value)
        ? sameStringArray(value, computed[key])
        : value === computed[key]),
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
  const unscorableCount = latest.filter(
    (event) => event.status === "unscorable",
  ).length;
  const resolvedCount = scoredCount + unscorableCount;
  const deferredCount = latest.filter(
    (event) => event.status === "deferred",
  ).length;
  const analysisExcludedCount = latest.filter((event) => {
    if (event.studyRound === "round_b") {
      return (
        event.status === "unscorable" ||
        event.blindReview?.labelCueDetected === true
      );
    }
    return (
      event.status === "unscorable" ||
      event.blindReview?.eligibleForBlindAnalysis === false
    );
  }).length;
  const complete =
    expectedIds.length > 0 &&
    resolvedCount === expectedIds.length &&
    deferredCount === 0 &&
    missingRepetitionIds.length === 0 &&
    unexpectedRepetitionIds.length === 0;

  return {
    status: complete ? "complete" : "partial",
    complete,
    expectedCount: expectedIds.length,
    latestReviewCount: latest.length,
    resolvedCount,
    scoredCount,
    unscorableCount,
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
  unscorableReason = null,
  scoreZeroReason = null,
  evidenceReview = null,
  supersedesEventId = null,
  eventId = crypto.randomUUID(),
}) {
  assertNonEmpty(pilotId, "pilotId");
  assertNonEmpty(reviewerId, "reviewerId");
  assertNonEmpty(repetition?.repetitionId, "repetitionId");
  assertStudyRound(studyRound);

  if (!REVIEW_STATUSES.has(status)) {
    throw new Error("status must be scored, deferred, or unscorable.");
  }
  if (status === "scored" && !SCORE_VALUES.has(score)) {
    throw new Error("score must be 0, 1, 2, or 3.");
  }
  if (status === "scored" && !CONFIDENCE_VALUES.has(confidence)) {
    throw new Error("confidence must be low, medium, or high.");
  }
  if (
    status === "scored" &&
    score === 0 &&
    !ZERO_SCORE_REASONS.has(scoreZeroReason)
  ) {
    throw new Error("score 0 requires confirmed pain evidence.");
  }
  if (status === "unscorable" && !UNSCORABLE_REASONS.has(unscorableReason)) {
    throw new Error("unscorableReason is required for unscorable reviews.");
  }
  if (status === "unscorable" && !CONFIDENCE_VALUES.has(confidence)) {
    throw new Error("confidence must be low, medium, or high.");
  }
  if (status === "unscorable" && !comment.trim()) {
    throw new Error("comment is required for unscorable reviews.");
  }
  if (!isIsoDate(reviewStartedAt)) {
    throw new Error("reviewStartedAt must be an ISO date-time.");
  }
  if (!Number.isFinite(reviewDurationMs) || reviewDurationMs < 0) {
    throw new Error("reviewDurationMs must be a non-negative number.");
  }
  if (studyRound === "round_b") {
    if (!evidenceReview || typeof evidenceReview !== "object") {
      throw new Error("evidenceReview is required for Round B reviews.");
    }
    if (
      status !== "deferred" &&
      !EVIDENCE_USEFULNESS_VALUES.has(evidenceReview.usefulness)
    ) {
      throw new Error("Round B evidence usefulness is required.");
    }
  }
  if (evidenceReview != null) {
    assertNonEmpty(
      evidenceReview.manifestFingerprint,
      "evidenceReview.manifestFingerprint",
    );
    assertNonEmpty(
      evidenceReview.itemFingerprint,
      "evidenceReview.itemFingerprint",
    );
    assertNonEmpty(
      evidenceReview.evidenceStatus,
      "evidenceReview.evidenceStatus",
    );
    if (!EVIDENCE_STATUSES.has(evidenceReview.evidenceStatus)) {
      throw new Error("evidenceReview.evidenceStatus is invalid.");
    }
    if (typeof evidenceReview.aiSuggestionShown !== "boolean") {
      throw new Error("evidenceReview.aiSuggestionShown must be boolean.");
    }
    if (
      evidenceReview.usefulness != null &&
      !EVIDENCE_USEFULNESS_VALUES.has(evidenceReview.usefulness)
    ) {
      throw new Error("evidenceReview.usefulness is invalid.");
    }
  }

  const normalizedFlags = [...new Set(qualityFlags)].sort();
  const labelCueDetected = normalizedFlags.includes("label_cue_visible");
  const hasScore = status === "scored";

  const isEvidenceAssisted = studyRound === "round_b";
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
    score: hasScore ? score : null,
    confidence: status === "deferred" ? null : confidence,
    unscorableReason: status === "unscorable" ? unscorableReason : null,
    scoreZeroReason: hasScore && score === 0 ? scoreZeroReason : null,
    cameraView,
    side,
    comment: comment.trim(),
    qualityFlags: normalizedFlags,
    evidenceReview,
    blindReview: {
      historicalHumanScoresHidden: true,
      legacyAiSuggestionHidden: true,
      sourceFileNameHidden: true,
      audioMuted: true,
      labelCueDetected,
      reviewMode: isEvidenceAssisted ? "evidence_assisted" : "blind",
      currentPoseEvidenceShown: isEvidenceAssisted,
      currentAiSuggestionShown:
        isEvidenceAssisted && evidenceReview?.aiSuggestionShown === true,
      eligibleForBlindAnalysis:
        !isEvidenceAssisted && status !== "unscorable" && !labelCueDetected,
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
  const normalizedEvents = (events ?? []).map((event) => ({
    ...event,
    unscorableReason: event.unscorableReason ?? null,
    scoreZeroReason: event.scoreZeroReason ?? null,
    evidenceReview: event.evidenceReview ?? null,
  }));
  const completion = summarizeCompletion({
    pilot,
    reviewerId,
    studyRound,
    events: normalizedEvents,
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
    eventCount: normalizedEvents.length,
    completion,
    events: normalizedEvents,
  };
}

export function validateStudyReviewExport(
  payload,
  { pilot = null, requireComplete = true, evidenceManifest = null } = {},
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
  const evidenceByRepetition = new Map(
    (evidenceManifest?.items ?? []).map((item) => [item.repetitionId, item]),
  );

  if (payload?.studyRound === "round_b" && evidenceManifest) {
    if (evidenceManifest.pilotId !== payload.pilotId) {
      errors.push("Round B evidence pilotId does not match the export.");
    }
    if (!evidenceManifest.manifestFingerprint) {
      errors.push("Round B evidence manifestFingerprint is required.");
    }
  }

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
    if (
      event?.status === "unscorable" &&
      !CONFIDENCE_VALUES.has(event?.confidence)
    ) {
      errors.push(`${prefix}.confidence is invalid.`);
    }
    if (
      event?.unscorableReason != null &&
      !UNSCORABLE_REASONS.has(event.unscorableReason)
    ) {
      errors.push(`${prefix}.unscorableReason is invalid.`);
    }
    if (
      event?.scoreZeroReason != null &&
      !ZERO_SCORE_REASONS.has(event.scoreZeroReason)
    ) {
      errors.push(`${prefix}.scoreZeroReason is invalid.`);
    }
    if (event?.status === "unscorable") {
      if (!UNSCORABLE_REASONS.has(event?.unscorableReason)) {
        errors.push(`${prefix}.unscorableReason is required.`);
      }
      if (event?.score !== null) {
        errors.push(`${prefix}.score must be null when unscorable.`);
      }
      if (!event?.comment?.trim()) {
        errors.push(`${prefix}.comment is required when unscorable.`);
      }
      if (event?.blindReview?.eligibleForBlindAnalysis !== false) {
        errors.push(
          `${prefix}.unscorable review must be excluded from analysis.`,
        );
      }
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
    if (event?.studyRound === "round_b") {
      if (!event?.evidenceReview || typeof event.evidenceReview !== "object") {
        errors.push(`${prefix}.evidenceReview is required for Round B.`);
      } else {
        if (
          event.status !== "deferred" &&
          !EVIDENCE_USEFULNESS_VALUES.has(event.evidenceReview.usefulness)
        ) {
          errors.push(`${prefix}.evidenceReview.usefulness is invalid.`);
        }
        if (!event.evidenceReview.manifestFingerprint) {
          errors.push(
            `${prefix}.evidenceReview.manifestFingerprint is required.`,
          );
        }
        if (!event.evidenceReview.itemFingerprint) {
          errors.push(`${prefix}.evidenceReview.itemFingerprint is required.`);
        }
        if (!EVIDENCE_STATUSES.has(event.evidenceReview.evidenceStatus)) {
          errors.push(`${prefix}.evidenceReview.evidenceStatus is invalid.`);
        }
        if (typeof event.evidenceReview.aiSuggestionShown !== "boolean") {
          errors.push(`${prefix}.evidenceReview.aiSuggestionShown is invalid.`);
        }
        if (evidenceManifest) {
          const expectedEvidence = evidenceByRepetition.get(event.repetitionId);
          if (!expectedEvidence) {
            errors.push(`${prefix} has no frozen Round B evidence item.`);
          } else {
            if (
              event.evidenceReview.manifestFingerprint !==
              evidenceManifest.manifestFingerprint
            ) {
              errors.push(
                `${prefix}.evidenceReview.manifestFingerprint does not match.`,
              );
            }
            if (
              event.evidenceReview.itemFingerprint !==
              expectedEvidence.itemFingerprint
            ) {
              errors.push(
                `${prefix}.evidenceReview.itemFingerprint does not match.`,
              );
            }
            if (
              event.evidenceReview.evidenceStatus !==
              expectedEvidence.evidenceStatus
            ) {
              errors.push(
                `${prefix}.evidenceReview.evidenceStatus does not match.`,
              );
            }
            if (
              event.evidenceReview.aiSuggestionShown !==
              Boolean(expectedEvidence.aiSuggestion)
            ) {
              errors.push(
                `${prefix}.evidenceReview.aiSuggestionShown does not match.`,
              );
            }
          }
        }
      }
      if (event?.blindReview?.reviewMode !== "evidence_assisted") {
        errors.push(`${prefix}.blindReview.reviewMode is invalid for Round B.`);
      }
      if (event?.blindReview?.eligibleForBlindAnalysis !== false) {
        errors.push(`${prefix}.Round B event cannot be marked blind.`);
      }
    }
  }

  if (payload?.studyRound === "round_b" && !evidenceManifest) {
    warnings.push(
      "Round B evidence fingerprints were not cross-checked against a manifest.",
    );
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

  for (const event of latestStudyReviews(payload?.events ?? []).values()) {
    if (
      event.status === "scored" &&
      event.score === 0 &&
      !ZERO_SCORE_REASONS.has(event.scoreZeroReason)
    ) {
      errors.push(
        `latest event for ${event.repetitionId} uses score 0 without confirmed pain evidence.`,
      );
    }
    if (
      event.status === "scored" &&
      event.qualityFlags?.includes("movement_not_visible")
    ) {
      errors.push(
        `latest event for ${event.repetitionId} cannot be scored when movement is not visible.`,
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
      `review is incomplete (${completion.resolvedCount}/${completion.expectedCount} resolved; ${completion.scoredCount} scored).`,
    );
  } else if (!completion.complete) {
    warnings.push(
      `partial review (${completion.resolvedCount}/${completion.expectedCount} resolved; ${completion.scoredCount} scored).`,
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
