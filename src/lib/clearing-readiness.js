import {
  getActionRepPolicy,
  normalizeClearingFindings,
} from "../constants/scoring.js";

const UNCONFIRMED_CLEARING_RESULTS = new Set(["not_tested", "unknown"]);

function isClearingConfirmed(result) {
  return !UNCONFIRMED_CLEARING_RESULTS.has(result);
}

function countIssues(blockers) {
  return blockers.reduce((counts, blocker) => {
    counts[blocker.code] = (counts[blocker.code] ?? 0) + 1;
    return counts;
  }, {});
}

export function summarizeClearingReadiness(segments = []) {
  const blockers = [];
  let requiredSegmentsCount = 0;
  let confirmedSegmentsCount = 0;

  for (const segment of segments) {
    const actionType = segment?.actionType ?? "deep_squat";
    const repPolicy = getActionRepPolicy(actionType);

    if (repPolicy.clearingTests.length === 0) {
      continue;
    }

    requiredSegmentsCount += 1;

    const clearingFindings = normalizeClearingFindings(
      actionType,
      segment?.clearingFindings,
      segment?.clearingTest,
    );
    const segmentBlockers = clearingFindings
      .filter((finding) => !isClearingConfirmed(finding.result))
      .map((finding) => ({
        segmentId: segment.segmentId,
        repetitionIndex: segment.repetitionIndex,
        actionType,
        findingKey: finding.key,
        label: finding.label,
        result: finding.result,
        code:
          finding.result === "unknown"
            ? "clearing_unknown"
            : "clearing_not_tested",
      }));

    if (segmentBlockers.length === 0) {
      confirmedSegmentsCount += 1;
    }

    blockers.push(...segmentBlockers);
  }

  return {
    available: requiredSegmentsCount > 0,
    readyForIngest: blockers.length === 0,
    segmentsTotal: segments.length,
    requiredSegmentsCount,
    confirmedSegmentsCount,
    blockerCount: blockers.length,
    issueCounts: countIssues(blockers),
    blockers,
  };
}
