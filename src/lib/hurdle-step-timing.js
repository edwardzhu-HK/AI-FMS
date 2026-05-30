import {
  assignUniqueCyclesToSegments,
  buildNoUniqueCycleAssignmentItem,
  dedupeOverlappingCycles,
  flagDuplicateCycleAssignments,
} from "./timing-qa.js";

const SIDES = ["left", "right"];

const DEFAULT_OPTIONS = {
  boundaryRatio: 0.22,
  highThresholdRatio: 0.52,
  minClearanceAmplitude: 0.045,
  minPeakGapSecond: 1.1,
  mergeSidesGapSecond: 0.7,
  minVisibility: 0.35,
  preBufferSecond: 0.35,
  postBufferSecond: 0.45,
  timingToleranceSecond: 0.4,
  wideContextToleranceSecond: 1.6,
  minCoverageRatio: 0.7,
  smoothWindow: 5,
};

function average(values) {
  const validValues = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function percentile(values, ratio) {
  const validValues = values
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .sort((left, right) => left - right);

  if (validValues.length === 0) {
    return null;
  }

  const index = Math.round((validValues.length - 1) * ratio);
  return validValues[clamp(index, 0, validValues.length - 1)];
}

function toFixedNumber(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function getFrameSecond(frame) {
  if (typeof frame?.second === "number" && Number.isFinite(frame.second)) {
    return frame.second;
  }

  if (
    typeof frame?.timestampMs === "number" &&
    Number.isFinite(frame.timestampMs)
  ) {
    return frame.timestampMs / 1000;
  }

  return null;
}

function getLandmarkMap(frame) {
  return Object.fromEntries(
    (frame?.poses?.[0]?.landmarks ?? []).map((landmark) => [
      landmark.name,
      landmark,
    ]),
  );
}

function sideLandmarkNames(side) {
  return [`${side}_hip`, `${side}_knee`, `${side}_ankle`, `${side}_foot_index`];
}

function getSideVisibility(landmarks, side) {
  return average(
    sideLandmarkNames(side).map((name) => landmarks[name]?.visibility),
  );
}

function smoothFeatures(features, windowSize) {
  const radius = Math.max(1, Math.floor(windowSize / 2));

  return features.map((feature, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(features.length, index + radius + 1);
    const window = features.slice(start, end);

    return {
      ...feature,
      smoothedClearance: average(window.map((item) => item.clearanceProxy)),
    };
  });
}

export function buildHurdleStepFrameFeatures(payload) {
  if (!Array.isArray(payload?.frames)) {
    return [];
  }

  return payload.frames
    .flatMap((frame) => {
      const second = getFrameSecond(frame);
      const landmarks = getLandmarkMap(frame);

      if (second === null) {
        return [];
      }

      return SIDES.map((side) => {
        const hip = landmarks[`${side}_hip`];
        const knee = landmarks[`${side}_knee`];
        const ankle = landmarks[`${side}_ankle`];
        const foot = landmarks[`${side}_foot_index`];
        const visibility = getSideVisibility(landmarks, side);

        if (
          !hip ||
          !knee ||
          !ankle ||
          !foot ||
          typeof hip.y !== "number" ||
          typeof knee.y !== "number" ||
          typeof ankle.y !== "number" ||
          typeof foot.y !== "number"
        ) {
          return null;
        }

        return {
          second,
          side,
          hipY: hip.y,
          kneeY: knee.y,
          ankleY: ankle.y,
          footY: foot.y,
          visibility,
        };
      }).filter(Boolean);
    })
    .filter(Boolean)
    .sort((left, right) => left.second - right.second);
}

function prepareSideFeatures(rawFeatures, side, config) {
  const sideFeatures = rawFeatures
    .filter(
      (feature) =>
        feature.side === side &&
        (feature.visibility === null ||
          feature.visibility >= config.minVisibility),
    )
    .sort((left, right) => left.second - right.second);
  const baselineKneeY = percentile(
    sideFeatures.map((feature) => feature.kneeY),
    0.9,
  );
  const baselineFootY = percentile(
    sideFeatures.map((feature) => average([feature.ankleY, feature.footY])),
    0.9,
  );

  if (baselineKneeY === null || baselineFootY === null) {
    return [];
  }

  return smoothFeatures(
    sideFeatures.map((feature) => {
      const kneeLift = baselineKneeY - feature.kneeY;
      const footLift = baselineFootY - average([feature.ankleY, feature.footY]);

      return {
        ...feature,
        baselineKneeY,
        baselineFootY,
        kneeLift,
        footLift,
        clearanceProxy: average([kneeLift, footLift]) ?? 0,
      };
    }),
    config.smoothWindow,
  );
}

function findPeakCandidates(features, highThreshold) {
  const candidates = [];
  let regionStart = null;

  for (let index = 0; index < features.length; index += 1) {
    if (features[index].smoothedClearance >= highThreshold) {
      if (regionStart === null) {
        regionStart = index;
      }
      continue;
    }

    if (regionStart !== null) {
      candidates.push([regionStart, index - 1]);
      regionStart = null;
    }
  }

  if (regionStart !== null) {
    candidates.push([regionStart, features.length - 1]);
  }

  return candidates.map(([start, end]) => {
    let peakIndex = start;

    for (let index = start + 1; index <= end; index += 1) {
      if (
        features[index].smoothedClearance >
        features[peakIndex].smoothedClearance
      ) {
        peakIndex = index;
      }
    }

    return {
      index: peakIndex,
      second: features[peakIndex].second,
      clearance: features[peakIndex].smoothedClearance,
      rawClearance: features[peakIndex].clearanceProxy,
    };
  });
}

function mergeNearbyPeaks(peaks, minPeakGapSecond) {
  return peaks.reduce((merged, peak) => {
    const previousPeak = merged.at(-1);

    if (
      !previousPeak ||
      peak.second - previousPeak.second >= minPeakGapSecond
    ) {
      merged.push(peak);
      return merged;
    }

    if (peak.clearance > previousPeak.clearance) {
      merged[merged.length - 1] = peak;
    }

    return merged;
  }, []);
}

function findBoundaryIndex(features, peakIndex, direction, boundaryThreshold) {
  let index = peakIndex;

  while (
    index + direction >= 0 &&
    index + direction < features.length &&
    features[index].smoothedClearance > boundaryThreshold
  ) {
    index += direction;
  }

  return index;
}

function getWindowAverageVisibility(features, startSecond, endSecond) {
  return average(
    features
      .filter(
        (feature) =>
          feature.second >= startSecond && feature.second <= endSecond,
      )
      .map((feature) => feature.visibility),
  );
}

function detectSideCycles(features, side, config) {
  if (features.length < config.smoothWindow * 2) {
    return {
      cycles: [],
      quality: {
        side,
        status: "insufficient_pose",
        featureFrames: features.length,
      },
    };
  }

  const clearanceValues = features.map((feature) => feature.smoothedClearance);
  const lowClearance = percentile(clearanceValues, 0.1);
  const highClearance = percentile(clearanceValues, 0.9);
  const amplitude = highClearance - lowClearance;

  if (amplitude < config.minClearanceAmplitude) {
    return {
      cycles: [],
      quality: {
        side,
        status: "low_clearance_amplitude",
        featureFrames: features.length,
        lowClearance,
        highClearance,
        amplitude,
      },
    };
  }

  const highThreshold = lowClearance + amplitude * config.highThresholdRatio;
  const boundaryThreshold = lowClearance + amplitude * config.boundaryRatio;
  const firstSecond = features[0].second;
  const lastSecond = features.at(-1).second;
  const peaks = mergeNearbyPeaks(
    findPeakCandidates(features, highThreshold),
    config.minPeakGapSecond,
  );

  const cycles = peaks.map((peak) => {
    const startIndex = findBoundaryIndex(
      features,
      peak.index,
      -1,
      boundaryThreshold,
    );
    const endIndex = findBoundaryIndex(
      features,
      peak.index,
      1,
      boundaryThreshold,
    );
    const startSecond = Number(
      clamp(
        features[startIndex].second - config.preBufferSecond,
        firstSecond,
        lastSecond,
      ).toFixed(2),
    );
    const endSecond = Number(
      clamp(
        features[endIndex].second + config.postBufferSecond,
        firstSecond,
        lastSecond,
      ).toFixed(2),
    );

    return {
      side,
      startSecond,
      endSecond,
      peakSecond: toFixedNumber(peak.second),
      // Keep the existing timing export/UI shape until a later schema review.
      lowestPointSecond: toFixedNumber(peak.second),
      peakClearance: toFixedNumber(peak.clearance, 4),
      baselineClearance: toFixedNumber(lowClearance, 4),
      amplitude: toFixedNumber(amplitude, 4),
      avgVisibility: getWindowAverageVisibility(
        features,
        startSecond,
        endSecond,
      ),
    };
  });

  return {
    cycles,
    quality: {
      side,
      status: "ok",
      featureFrames: features.length,
      lowClearance,
      highClearance,
      amplitude,
      highThreshold,
      boundaryThreshold,
    },
  };
}

function mergeCyclesAcrossSides(cycles, config) {
  const sortedCycles = cycles
    .slice()
    .sort((left, right) => left.peakSecond - right.peakSecond);
  const mergedCycles = [];

  for (const cycle of sortedCycles) {
    const previousCycle = mergedCycles.at(-1);
    if (
      !previousCycle ||
      cycle.peakSecond - previousCycle.peakSecond > config.mergeSidesGapSecond
    ) {
      mergedCycles.push(cycle);
      continue;
    }

    const currentStrength =
      cycle.peakClearance * 0.8 + (cycle.avgVisibility ?? 0) * 0.2;
    const previousStrength =
      previousCycle.peakClearance * 0.8 +
      (previousCycle.avgVisibility ?? 0) * 0.2;

    if (currentStrength > previousStrength) {
      mergedCycles[mergedCycles.length - 1] = cycle;
    }
  }

  return dedupeOverlappingCycles(mergedCycles);
}

export function detectHurdleStepCycles(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const rawFeatures = buildHurdleStepFrameFeatures(payload);
  const sideReports = SIDES.map((side) => {
    const sideFeatures = prepareSideFeatures(rawFeatures, side, config);
    return {
      side,
      features: sideFeatures,
      ...detectSideCycles(sideFeatures, side, config),
    };
  });
  const cycles = mergeCyclesAcrossSides(
    sideReports.flatMap((report) => report.cycles),
    config,
  );
  const usableSideReports = sideReports.filter(
    (report) => report.quality.status === "ok",
  );

  return {
    cycles,
    quality: {
      status: cycles.length > 0 ? "ok" : "insufficient_pose",
      featureFrames: rawFeatures.length,
      usableSides: usableSideReports.map((report) => report.side),
      sideReports: sideReports.map((report) => report.quality),
    },
  };
}

function pickCycleForSegment(cycles, segment) {
  if (!segment || cycles.length === 0) {
    return null;
  }

  const midpoint = (segment.startSecond + segment.endSecond) / 2;
  const inWindowCycles = cycles.filter(
    (cycle) =>
      cycle.peakSecond >= segment.startSecond &&
      cycle.peakSecond <= segment.endSecond,
  );
  const candidateCycles = inWindowCycles.length > 0 ? inWindowCycles : cycles;

  return candidateCycles.reduce((bestCycle, cycle) => {
    const currentDistance = Math.abs(cycle.peakSecond - midpoint);
    const bestDistance = Math.abs(bestCycle.peakSecond - midpoint);
    return currentDistance < bestDistance ? cycle : bestCycle;
  }, candidateCycles[0]);
}

function getCoverageRatio(segment, cycle) {
  const overlapStart = Math.max(segment.startSecond, cycle.startSecond);
  const overlapEnd = Math.min(segment.endSecond, cycle.endSecond);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const cycleDuration = Math.max(0.01, cycle.endSecond - cycle.startSecond);

  return overlap / cycleDuration;
}

function timingIssue(code, severity, message) {
  return { code, severity, message };
}

function evaluateSegmentAgainstCycles(cycles, quality, segment, config) {
  if (cycles.length === 0) {
    return {
      status: "insufficient_pose",
      label: "No reliable Hurdle Step cycle",
      issues: [
        timingIssue(
          quality.status,
          "warning",
          "Pose trajectory is not strong enough to suggest Hurdle Step timing.",
        ),
      ],
      cycle: null,
      metrics: {
        featureFrames: quality.featureFrames,
      },
    };
  }

  const cycle = pickCycleForSegment(cycles, segment);
  const coverageRatio = getCoverageRatio(segment, cycle);
  const startDelta = Number(
    (segment.startSecond - cycle.startSecond).toFixed(2),
  );
  const endDelta = Number((cycle.endSecond - segment.endSecond).toFixed(2));
  const durationRatio =
    (segment.endSecond - segment.startSecond) /
    Math.max(0.01, cycle.endSecond - cycle.startSecond);
  const issues = [];

  if (startDelta > config.timingToleranceSecond) {
    issues.push(
      timingIssue(
        "missing_start",
        "error",
        "Segment starts after the hurdle step begins.",
      ),
    );
  }

  if (endDelta > config.timingToleranceSecond) {
    issues.push(
      timingIssue(
        "missing_return",
        "error",
        "Segment ends before the foot returns.",
      ),
    );
  }

  if (coverageRatio < config.minCoverageRatio) {
    issues.push(
      timingIssue(
        "too_short",
        "error",
        "Segment does not cover the full Hurdle Step action.",
      ),
    );
  }

  if (startDelta < -config.wideContextToleranceSecond) {
    issues.push(
      timingIssue(
        "wide_lead",
        "info",
        "Segment includes a long lead-in before the step.",
      ),
    );
  }

  if (endDelta < -config.wideContextToleranceSecond) {
    issues.push(
      timingIssue(
        "wide_tail",
        "info",
        "Segment includes a long tail after the step.",
      ),
    );
  }

  const hasBlockingIssue = issues.some((issue) => issue.severity === "error");

  return {
    status: hasBlockingIssue ? "needs_adjustment" : "good",
    label: hasBlockingIssue
      ? "Needs timing adjustment"
      : "Timing looks complete",
    issues,
    cycle,
    metrics: {
      detectedCycles: cycles.length,
      coverageRatio,
      startDelta,
      endDelta,
      durationRatio,
      avgVisibility: cycle.avgVisibility,
      side: cycle.side,
      peakClearance: cycle.peakClearance,
    },
  };
}

function summarizeTimingItems(items, cycles) {
  const issueCounts = items.reduce((counts, item) => {
    item.issues.forEach((issue) => {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    });
    return counts;
  }, {});

  return {
    segmentsTotal: items.length,
    detectedCycles: cycles.length,
    goodCount: items.filter((item) => item.status === "good").length,
    needsAdjustmentCount: items.filter(
      (item) => item.status === "needs_adjustment",
    ).length,
    issueCounts,
  };
}

export function evaluateHurdleStepSegmentTiming({
  posePayload,
  segment,
  options = {},
}) {
  if (!posePayload) {
    return {
      status: "no_pose",
      label: "No pose JSON",
      issues: [],
      cycle: null,
      metrics: null,
    };
  }

  if (!segment) {
    return {
      status: "no_segment",
      label: "No segment selected",
      issues: [],
      cycle: null,
      metrics: null,
    };
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  const { cycles, quality } = detectHurdleStepCycles(posePayload, config);

  return evaluateSegmentAgainstCycles(cycles, quality, segment, config);
}

export function evaluateHurdleStepSegmentsTiming({
  posePayload,
  segments,
  options = {},
}) {
  if (!posePayload) {
    return {
      status: "no_pose",
      label: "No pose JSON",
      items: [],
      summary: {
        segmentsTotal: 0,
        detectedCycles: 0,
        goodCount: 0,
        needsAdjustmentCount: 0,
        issueCounts: {},
      },
      cycles: [],
      quality: null,
    };
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      status: "no_segments",
      label: "No segments",
      items: [],
      summary: {
        segmentsTotal: 0,
        detectedCycles: 0,
        goodCount: 0,
        needsAdjustmentCount: 0,
        issueCounts: {},
      },
      cycles: [],
      quality: null,
    };
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  const { cycles, quality } = detectHurdleStepCycles(posePayload, config);
  const cycleAssignments = assignUniqueCyclesToSegments(segments, cycles);
  const assignedCycles = [...cycleAssignments.values()];
  const items = flagDuplicateCycleAssignments(
    segments.map((segment) => {
      const assignedCycle = cycleAssignments.get(
        segment.segmentId ?? `rep_${segment.repetitionIndex}`,
      );
      const timingItem = assignedCycle
        ? evaluateSegmentAgainstCycles(
            [assignedCycle],
            quality,
            segment,
            config,
          )
        : buildNoUniqueCycleAssignmentItem(cycles);

      return {
        segmentId: segment.segmentId,
        repetitionIndex: segment.repetitionIndex,
        cameraView: segment.cameraView,
        currentStartSecond: segment.startSecond,
        currentEndSecond: segment.endSecond,
        ...timingItem,
        metrics: timingItem.metrics
          ? {
              ...timingItem.metrics,
              detectedCycles: cycles.length,
            }
          : timingItem.metrics,
      };
    }),
  );
  const summary = summarizeTimingItems(items, assignedCycles);
  const hasBlockingIssue = summary.needsAdjustmentCount > 0;

  if (cycles.length === 0) {
    return {
      status: "insufficient_pose",
      label: "No reliable Hurdle Step cycle",
      items,
      summary,
      cycles: assignedCycles,
      quality,
    };
  }

  return {
    status: hasBlockingIssue ? "needs_adjustment" : "good",
    label: hasBlockingIssue
      ? "Some segments need timing adjustment"
      : "All segments cover detected Hurdle Step cycles",
    items,
    summary,
    cycles: assignedCycles,
    quality: {
      ...quality,
      candidateCyclesTotal: cycles.length,
    },
  };
}
