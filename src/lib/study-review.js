const SCORE_VALUES = new Set([0, 1, 2, 3]);

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

export function buildStudyQueue(canonicalPilot, reviewerId) {
  assertNonEmpty(canonicalPilot?.pilotId, "pilotId");
  assertNonEmpty(reviewerId, "reviewerId");

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
        orderKey: stableHash(`${reviewerId}:${item.repetitionId}`),
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
        orderKey: stableHash(`${reviewerId}:${repetition.repetitionId}`),
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
  repetition,
  status = "scored",
  score,
  confidence = "medium",
  cameraView = "unknown",
  side = "unknown",
  comment = "",
  qualityFlags = [],
  supersedesEventId = null,
  now = new Date(),
  eventId = crypto.randomUUID(),
}) {
  assertNonEmpty(pilotId, "pilotId");
  assertNonEmpty(reviewerId, "reviewerId");
  assertNonEmpty(repetition?.repetitionId, "repetitionId");

  if (!["scored", "deferred"].includes(status)) {
    throw new Error("status must be scored or deferred.");
  }
  if (status === "scored" && !SCORE_VALUES.has(score)) {
    throw new Error("score must be 0, 1, 2, or 3.");
  }

  const normalizedFlags = [...new Set(qualityFlags)].sort();
  const labelCueDetected = normalizedFlags.includes("label_cue_visible");

  return {
    schemaVersion: "ai_fms_study_review_event_v1",
    eventId,
    pilotId,
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
    supersedesEventId,
    createdAt: now.toISOString(),
  };
}

export function buildStudyReviewExport({ pilot, reviewerId, events }) {
  const latest = [...latestStudyReviews(events).values()];
  return {
    schemaVersion: "ai_fms_study_review_export_v1",
    pilotId: pilot.pilotId,
    sourceSnapshotDate: pilot.snapshotSourceDate,
    reviewerId,
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    latestReviewCount: latest.length,
    scoredCount: latest.filter((event) => event.status === "scored").length,
    deferredCount: latest.filter((event) => event.status === "deferred").length,
    events,
  };
}

export function studyStorageKey(pilotId, reviewerId) {
  return `ai-fms-study:${pilotId}:${reviewerId.trim().toLowerCase()}:events`;
}
