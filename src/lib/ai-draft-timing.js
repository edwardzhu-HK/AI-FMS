const AI_DRAFT_TIMING_BUFFER_SECOND = 0.2;

function roundTimingSecond(value) {
  return Number(value.toFixed(2));
}

function getCycleAnchorSecond(cycle) {
  const anchor =
    cycle?.lowestPointSecond ??
    cycle?.peakSecond ??
    cycle?.bestReachSecond ??
    null;

  if (typeof anchor === "number" && Number.isFinite(anchor)) {
    return anchor;
  }

  if (
    typeof cycle?.startSecond === "number" &&
    Number.isFinite(cycle.startSecond) &&
    typeof cycle?.endSecond === "number" &&
    Number.isFinite(cycle.endSecond)
  ) {
    return (cycle.startSecond + cycle.endSecond) / 2;
  }

  return Number.POSITIVE_INFINITY;
}

function sortSegmentsByRepetition(segments) {
  return [...(segments ?? [])].sort((left, right) => {
    const leftIndex = left.repetitionIndex ?? 0;
    const rightIndex = right.repetitionIndex ?? 0;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.startSecond - right.startSecond;
  });
}

function sortCyclesByAnchor(cycles) {
  return [...(cycles ?? [])].sort((left, right) => {
    const anchorDelta =
      getCycleAnchorSecond(left) - getCycleAnchorSecond(right);

    if (anchorDelta !== 0) {
      return anchorDelta;
    }

    return left.startSecond - right.startSecond;
  });
}

export function buildAiDraftRange(cycle, options = {}) {
  if (!cycle) {
    return null;
  }

  const {
    rangeStartSecond = 0,
    rangeEndSecond = Number.POSITIVE_INFINITY,
    bufferSecond = AI_DRAFT_TIMING_BUFFER_SECOND,
  } = options;
  const boundedStart = Number.isFinite(rangeStartSecond) ? rangeStartSecond : 0;
  const boundedEnd = Number.isFinite(rangeEndSecond)
    ? rangeEndSecond
    : Number.POSITIVE_INFINITY;
  const startSecond = roundTimingSecond(
    Math.max(boundedStart, cycle.startSecond - bufferSecond),
  );
  const endSecond = roundTimingSecond(
    Math.min(boundedEnd, cycle.endSecond + bufferSecond),
  );

  if (endSecond <= startSecond) {
    return null;
  }

  return {
    startSecond,
    endSecond,
  };
}

export function withAiDraftRange(timingItem, options = {}) {
  if (!timingItem) {
    return null;
  }

  return {
    ...timingItem,
    aiDraftRange: buildAiDraftRange(timingItem.cycle, options),
  };
}

function resolveDraftSide(segment, cycle) {
  if (segment.side && segment.side !== "unknown") {
    return segment.side;
  }

  return cycle?.side ?? segment.side;
}

function buildPayload(segment, range, cycle = null) {
  return {
    segmentId: segment.segmentId,
    startSecond: range.startSecond,
    endSecond: range.endSecond,
    side: resolveDraftSide(segment, cycle),
    painFlag: segment.painFlag,
    clearingTest: segment.clearingTest,
    clearingFindings: segment.clearingFindings,
    rubricVersion: segment.rubricVersion,
    segmentSource: "ai_draft",
  };
}

function buildCompactedCyclePayloads({
  segments,
  cycles,
  rangeStartSecond,
  rangeEndSecond,
}) {
  const sortedSegments = sortSegmentsByRepetition(segments);
  const sortedCycles = sortCyclesByAnchor(cycles);

  return sortedCycles
    .map((cycle, index) => {
      const segment = sortedSegments[index];
      const range = buildAiDraftRange(cycle, {
        rangeStartSecond,
        rangeEndSecond,
      });

      if (!segment || !range) {
        return null;
      }

      return buildPayload(segment, range, cycle);
    })
    .filter(Boolean);
}

export function buildAiDraftTimingPayloads({
  segments,
  timingReport,
  rangeStartSecond,
  rangeEndSecond,
  compactToDetectedCycles = true,
}) {
  const cycles = timingReport?.cycles ?? [];

  if (
    compactToDetectedCycles &&
    cycles.length > 0 &&
    cycles.length < segments.length
  ) {
    return buildCompactedCyclePayloads({
      segments,
      cycles,
      rangeStartSecond,
      rangeEndSecond,
    });
  }

  const segmentById = new Map(
    segments.map((segment) => [segment.segmentId, segment]),
  );

  return (timingReport?.items ?? [])
    .map((item) => {
      const segment = segmentById.get(item.segmentId);
      const range = buildAiDraftRange(item.cycle, {
        rangeStartSecond,
        rangeEndSecond,
      });

      const hasBlockingCycleIssue = item.issues?.some((issue) =>
        ["duplicate_cycle_assignment", "no_unique_cycle_assignment"].includes(
          issue.code,
        ),
      );

      if (!segment || !range || hasBlockingCycleIssue) {
        return null;
      }

      return buildPayload(segment, range, item.cycle);
    })
    .filter(Boolean);
}

export function filterSegmentsWithDetectedCycles({ segments, timingReport }) {
  const reviewableSegmentIds = new Set(
    (timingReport?.items ?? [])
      .filter((item) => item?.cycle)
      .map((item) => item.segmentId),
  );

  if (reviewableSegmentIds.size === 0) {
    return segments;
  }

  return segments.filter((segment) =>
    reviewableSegmentIds.has(segment.segmentId),
  );
}
