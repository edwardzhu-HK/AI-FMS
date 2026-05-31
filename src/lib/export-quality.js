import { summarizeConsistency } from "./consistency.js";
import { summarizeClearingReadiness } from "./clearing-readiness.js";

function countItems(items = [], predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function countSegmentIds(items = [], predicate) {
  const ids = new Set();

  for (const item of items) {
    if (item?.segmentId && predicate(item)) {
      ids.add(item.segmentId);
    }
  }

  return ids.size;
}

function countIssueCodes(items = []) {
  const counts = {};

  for (const item of items) {
    for (const issue of item?.issues ?? []) {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    }
  }

  return counts;
}

function countIssues(issues = []) {
  return issues.reduce((counts, issue) => {
    counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    return counts;
  }, {});
}

function mergeIssueCounts(...issueCounts) {
  return issueCounts.reduce((merged, counts) => {
    for (const [code, count] of Object.entries(counts ?? {})) {
      merged[code] = (merged[code] ?? 0) + count;
    }

    return merged;
  }, {});
}

function hasTimingBlocker(item) {
  return (
    item?.status === "needs_adjustment" ||
    (item?.issues ?? []).some((issue) => issue.severity === "error")
  );
}

function getPoseQualityStatus(poseSummary) {
  if (!poseSummary) {
    return "missing";
  }

  if (poseSummary.valid === false) {
    return "invalid";
  }

  const missingFramesRatio = poseSummary.missingFramesRatio ?? 0;
  const avgVisibility = poseSummary.avgVisibility ?? null;
  const hasGoodCoverage = missingFramesRatio <= 0.1;
  const hasGoodVisibility = avgVisibility === null || avgVisibility >= 0.75;

  return hasGoodCoverage && hasGoodVisibility ? "ready" : "limited";
}

function buildMovementBreakdown(segments, metrics) {
  if (metrics.movementBreakdown) {
    return metrics.movementBreakdown;
  }

  const movementBreakdown = {};

  for (const segment of segments) {
    const actionType = segment.actionType ?? "unknown";
    movementBreakdown[actionType] = movementBreakdown[actionType] ?? {
      segmentsTotal: 0,
      validCount: 0,
      invalidCount: 0,
      pendingCount: 0,
    };
    movementBreakdown[actionType].segmentsTotal += 1;
  }

  return movementBreakdown;
}

function roundMetric(value) {
  return Number(value.toFixed(3));
}

export function summarizeTimingReadiness(timingReport = null) {
  const items = timingReport?.items ?? [];
  const blockerItems = items.filter(hasTimingBlocker);
  const batchBlockerIssues = (
    timingReport?.summary?.cycleCountQa?.issues ?? []
  ).filter((issue) => issue.severity === "error");
  const batchBlockerCount = batchBlockerIssues.length;

  return {
    available: items.length > 0,
    readyForIngest:
      items.length === 0 && !timingReport?.summary?.cycleCountQa
        ? true
        : blockerItems.length === 0 && batchBlockerCount === 0,
    segmentsTotal: timingReport?.summary?.segmentsTotal ?? items.length,
    goodCount: timingReport?.summary?.goodCount ?? 0,
    blockerCount: blockerItems.length + batchBlockerCount,
    issueCounts: mergeIssueCounts(
      countIssueCodes(blockerItems),
      countIssues(batchBlockerIssues),
    ),
  };
}

export function summarizeSegmentTimingCorrections(segments = []) {
  if (segments.length === 0) {
    return {
      segmentsTotal: 0,
      adjustedCount: 0,
      unadjustedCount: 0,
      avgStartShiftSecond: null,
      avgEndShiftSecond: null,
      avgBoundaryShiftSecond: null,
      maxBoundaryShiftSecond: null,
    };
  }

  let adjustedCount = 0;
  let startShiftTotal = 0;
  let endShiftTotal = 0;
  let boundaryShiftTotal = 0;
  let maxBoundaryShiftSecond = 0;

  for (const segment of segments) {
    const originalStartSecond =
      segment.originalStartSecond ?? segment.startSecond;
    const originalEndSecond = segment.originalEndSecond ?? segment.endSecond;
    const startShift = Math.abs(segment.startSecond - originalStartSecond);
    const endShift = Math.abs(segment.endSecond - originalEndSecond);
    const boundaryShift = Math.max(startShift, endShift);
    const isAdjusted =
      segment.segmentSource === "manual_adjusted" || boundaryShift > 0.005;

    if (isAdjusted) {
      adjustedCount += 1;
    }

    startShiftTotal += startShift;
    endShiftTotal += endShift;
    boundaryShiftTotal += boundaryShift;
    maxBoundaryShiftSecond = Math.max(maxBoundaryShiftSecond, boundaryShift);
  }

  return {
    segmentsTotal: segments.length,
    adjustedCount,
    unadjustedCount: segments.length - adjustedCount,
    avgStartShiftSecond: roundMetric(startShiftTotal / segments.length),
    avgEndShiftSecond: roundMetric(endShiftTotal / segments.length),
    avgBoundaryShiftSecond: roundMetric(boundaryShiftTotal / segments.length),
    maxBoundaryShiftSecond: roundMetric(maxBoundaryShiftSecond),
  };
}

export function summarizePoseEvidenceForDashboard({
  poseSummary = null,
  timingReport = null,
  featureReport = null,
  suggestionReport = null,
} = {}) {
  const timingItems = timingReport?.items ?? [];
  const featureItems = featureReport?.items ?? [];
  const suggestionItems = suggestionReport?.items ?? [];
  const timingReadiness = summarizeTimingReadiness(timingReport);

  return {
    poseStatus: getPoseQualityStatus(poseSummary),
    framesTotal: poseSummary?.framesTotal ?? 0,
    framesWithPose: poseSummary?.framesWithPose ?? 0,
    missingFramesRatio: poseSummary?.missingFramesRatio ?? null,
    avgVisibility: poseSummary?.avgVisibility ?? null,
    timingTotal: timingReport?.summary?.segmentsTotal ?? timingItems.length,
    timingGood: timingReport?.summary?.goodCount ?? 0,
    timingNeedsAdjustment:
      timingReport?.summary?.needsAdjustmentCount ??
      countItems(timingItems, (item) => item?.status !== "good"),
    timingReadyForIngest: timingReadiness.readyForIngest,
    timingBlockerCount: timingReadiness.blockerCount,
    timingBlockerIssueCounts: timingReadiness.issueCounts,
    detectedCycles: timingReport?.summary?.detectedCycles ?? 0,
    expectedSegments: timingReport?.summary?.expectedSegments ?? null,
    candidateCycles: timingReport?.summary?.candidateCyclesTotal ?? null,
    assignedCycles: timingReport?.summary?.detectedCycles ?? null,
    cycleCountQaStatus:
      timingReport?.summary?.cycleCountQa?.status ?? "not_available",
    cycleCountQaIssues: timingReport?.summary?.cycleCountQa?.issues ?? [],
    featureTotal:
      featureReport?.summary?.repetitionsTotal ?? featureItems.length,
    featureUsable:
      featureReport?.summary?.usableRepetitions ??
      countItems(featureItems, (item) => item?.status === "ok"),
    suggestionTotal:
      suggestionReport?.summary?.segmentsTotal ?? suggestionItems.length,
    suggestionReady: countItems(
      suggestionItems,
      (item) => item?.status === "suggested" && item.totalScore !== null,
    ),
  };
}

export function summarizeExportQuality({
  segments = [],
  consistencyMetrics = null,
  poseSummary = null,
  timingReport = null,
  featureReport = null,
  suggestionReport = null,
} = {}) {
  const metrics = consistencyMetrics ?? summarizeConsistency(segments);
  const timingItems = timingReport?.items ?? [];
  const featureItems = featureReport?.items ?? [];
  const suggestionItems = suggestionReport?.items ?? [];
  const clearingReadiness = summarizeClearingReadiness(segments);
  const movementBreakdown = buildMovementBreakdown(segments, metrics);
  const movementCounts = Object.fromEntries(
    Object.entries(movementBreakdown).map(([actionType, summary]) => [
      actionType,
      summary.segmentsTotal,
    ]),
  );

  return {
    recordsTotal: segments.length,
    movementCounts,
    movementTypeCount: Object.keys(movementCounts).length,
    validLabels: metrics.validCount ?? 0,
    pendingLabels: metrics.pendingCount ?? 0,
    invalidLabels: metrics.invalidCount ?? 0,
    reviewerConsensusCount: metrics.reviewerConsensusCount ?? 0,
    reviewerDisagreementCount: metrics.reviewerDisagreementCount ?? 0,
    reviewerPairCount: metrics.reviewerPairCount ?? 0,
    reviewerAgreementRate: metrics.reviewerAgreementRate ?? null,
    aiMatchesFinalRate: metrics.aiMatchesFinalRate ?? null,
    clearingReadyForIngest: clearingReadiness.readyForIngest,
    clearingRequiredSegmentsCount: clearingReadiness.requiredSegmentsCount,
    clearingConfirmedSegmentsCount: clearingReadiness.confirmedSegmentsCount,
    clearingBlockerCount: clearingReadiness.blockerCount,
    clearingBlockerIssueCounts: clearingReadiness.issueCounts,
    jsonExportReady: segments.length > 0,
    csvExportReady: segments.length > 0,
    poseEvidenceAttached: Boolean(
      poseSummary ||
      timingItems.length ||
      featureItems.length ||
      suggestionItems.length,
    ),
    recordsWithPoseTiming: countSegmentIds(
      timingItems,
      (item) => item?.status === "good" || item?.cycle,
    ),
    recordsWithPoseFeatures: countSegmentIds(
      featureItems,
      (item) => item?.status === "ok",
    ),
    recordsWithPoseSuggestion: countSegmentIds(
      suggestionItems,
      (item) => item?.status === "suggested" && item.totalScore !== null,
    ),
    movementBreakdown,
    timingCorrections: summarizeSegmentTimingCorrections(segments),
    pose: summarizePoseEvidenceForDashboard({
      poseSummary,
      timingReport,
      featureReport,
      suggestionReport,
    }),
  };
}
