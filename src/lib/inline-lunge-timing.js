import {
  assignUniqueCyclesToSegments,
  buildNoUniqueCycleAssignmentItem,
  dedupeOverlappingCycles,
  flagDuplicateCycleAssignments,
} from "./timing-qa.js";

const REQUIRED_LANDMARKS = [
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

const DEFAULT_OPTIONS = {
  boundaryRatio: 0.22,
  highThresholdRatio: 0.52,
  minAmplitude: 0.045,
  minPeakGapSecond: 2.2,
  preBufferSecond: 0.3,
  postBufferSecond: 0.35,
  timingToleranceSecond: 0.4,
  wideContextToleranceSecond: 1.5,
  minCoverageRatio: 0.75,
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

function getLandmarkAverage(landmarks, names, field) {
  return average(names.map((name) => landmarks[name]?.[field]));
}

function getRequiredVisibility(landmarks) {
  return average(REQUIRED_LANDMARKS.map((name) => landmarks[name]?.visibility));
}

export function buildInlineLungeFrameFeatures(payload) {
  if (!Array.isArray(payload?.frames)) {
    return [];
  }

  return payload.frames
    .map((frame) => {
      const second = getFrameSecond(frame);
      const landmarks = getLandmarkMap(frame);
      const shoulderY = getLandmarkAverage(
        landmarks,
        ["left_shoulder", "right_shoulder"],
        "y",
      );
      const hipY = getLandmarkAverage(
        landmarks,
        ["left_hip", "right_hip"],
        "y",
      );
      const kneeY = getLandmarkAverage(
        landmarks,
        ["left_knee", "right_knee"],
        "y",
      );
      const ankleY = getLandmarkAverage(
        landmarks,
        ["left_ankle", "right_ankle"],
        "y",
      );
      const visibility = getRequiredVisibility(landmarks);

      if (
        second === null ||
        shoulderY === null ||
        hipY === null ||
        kneeY === null ||
        ankleY === null ||
        ankleY - shoulderY < 0.05
      ) {
        return null;
      }

      return {
        second,
        shoulderY,
        hipY,
        kneeY,
        ankleY,
        visibility,
        // y grows downward in image coordinates; larger values mean lower body.
        hipDepthRatio: (hipY - shoulderY) / (ankleY - shoulderY),
        kneeDepthRatio: (kneeY - shoulderY) / (ankleY - shoulderY),
      };
    })
    .filter(Boolean);
}

function smoothFeatures(features, windowSize) {
  const radius = Math.max(1, Math.floor(windowSize / 2));

  return features.map((feature, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(features.length, index + radius + 1);
    const window = features.slice(start, end);

    return {
      ...feature,
      smoothedDepthRatio: average(
        window.map((item) =>
          average([item.hipDepthRatio, item.kneeDepthRatio]),
        ),
      ),
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

    if (peak.depthRatio > previousPeak.depthRatio) {
      merged[merged.length - 1] = peak;
    }

    return merged;
  }, []);
}

function findPeakCandidates(features, highThreshold) {
  const candidates = [];
  let regionStart = null;

  for (let index = 0; index < features.length; index += 1) {
    if (features[index].smoothedDepthRatio >= highThreshold) {
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
        features[index].smoothedDepthRatio >
        features[peakIndex].smoothedDepthRatio
      ) {
        peakIndex = index;
      }
    }

    return {
      index: peakIndex,
      second: features[peakIndex].second,
      depthRatio: features[peakIndex].smoothedDepthRatio,
      rawDepthRatio: average([
        features[peakIndex].hipDepthRatio,
        features[peakIndex].kneeDepthRatio,
      ]),
    };
  });
}

function findBoundaryIndex(features, peakIndex, direction, boundaryThreshold) {
  let index = peakIndex;

  while (
    index + direction >= 0 &&
    index + direction < features.length &&
    features[index].smoothedDepthRatio > boundaryThreshold
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

export function detectInlineLungeCycles(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const rawFeatures = buildInlineLungeFrameFeatures(payload);

  if (rawFeatures.length < config.smoothWindow * 2) {
    return {
      cycles: [],
      quality: {
        status: "insufficient_pose",
        featureFrames: rawFeatures.length,
      },
    };
  }

  const features = smoothFeatures(rawFeatures, config.smoothWindow);
  const uprightDepth = percentile(
    features.map((feature) => feature.smoothedDepthRatio),
    0.2,
  );
  const lungeDepth = percentile(
    features.map((feature) => feature.smoothedDepthRatio),
    0.9,
  );
  const amplitude = lungeDepth - uprightDepth;

  if (amplitude < config.minAmplitude) {
    return {
      cycles: [],
      quality: {
        status: "low_motion_amplitude",
        featureFrames: features.length,
        uprightDepth,
        lungeDepth,
        amplitude,
      },
    };
  }

  const highThreshold = uprightDepth + amplitude * config.highThresholdRatio;
  const boundaryThreshold = uprightDepth + amplitude * config.boundaryRatio;
  const firstSecond = features[0].second;
  const lastSecond = features.at(-1).second;
  const peaks = mergeNearbyPeaks(
    findPeakCandidates(features, highThreshold),
    config.minPeakGapSecond,
  );

  const cycles = dedupeOverlappingCycles(
    peaks.map((peak, index) => {
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
        repetitionIndex: index + 1,
        startSecond,
        endSecond,
        peakSecond: toFixedNumber(peak.second),
        // Keep the existing timing export/UI shape until a later schema review.
        lowestPointSecond: toFixedNumber(peak.second),
        peakDepthRatio: toFixedNumber(peak.depthRatio, 4),
        baselineDepthRatio: toFixedNumber(uprightDepth, 4),
        amplitude: toFixedNumber(amplitude, 4),
        avgVisibility: getWindowAverageVisibility(
          features,
          startSecond,
          endSecond,
        ),
      };
    }),
  );

  return {
    cycles,
    quality: {
      status: "ok",
      featureFrames: features.length,
      uprightDepth,
      lungeDepth,
      amplitude,
      highThreshold,
      boundaryThreshold,
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
      cycle.lowestPointSecond >= segment.startSecond &&
      cycle.lowestPointSecond <= segment.endSecond,
  );
  const candidateCycles = inWindowCycles.length > 0 ? inWindowCycles : cycles;

  return candidateCycles.reduce((bestCycle, cycle) => {
    const currentDistance = Math.abs(cycle.lowestPointSecond - midpoint);
    const bestDistance = Math.abs(bestCycle.lowestPointSecond - midpoint);
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
      label: "No reliable In-Line Lunge cycle",
      issues: [
        timingIssue(
          quality.status,
          "warning",
          "Pose trajectory is not strong enough to suggest In-Line Lunge timing.",
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
        "Segment starts after the lunge begins.",
      ),
    );
  }

  if (endDelta > config.timingToleranceSecond) {
    issues.push(
      timingIssue(
        "missing_return",
        "error",
        "Segment ends before return from the lunge.",
      ),
    );
  }

  if (coverageRatio < config.minCoverageRatio) {
    issues.push(
      timingIssue(
        "too_short",
        "error",
        "Segment does not cover the full In-Line Lunge action.",
      ),
    );
  }

  if (startDelta < -config.wideContextToleranceSecond) {
    issues.push(
      timingIssue(
        "wide_lead",
        "info",
        "Segment includes a long lead-in before the lunge.",
      ),
    );
  }

  if (endDelta < -config.wideContextToleranceSecond) {
    issues.push(
      timingIssue(
        "wide_tail",
        "info",
        "Segment includes a long tail after the lunge.",
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
      peakDepthRatio: cycle.peakDepthRatio,
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

export function evaluateInlineLungeSegmentTiming({
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
  const { cycles, quality } = detectInlineLungeCycles(posePayload, config);

  return evaluateSegmentAgainstCycles(cycles, quality, segment, config);
}

export function evaluateInlineLungeSegmentsTiming({
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
  const { cycles, quality } = detectInlineLungeCycles(posePayload, config);
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
      label: "No reliable In-Line Lunge cycle",
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
      : "All segments cover detected In-Line Lunge cycles",
    items,
    summary,
    cycles: assignedCycles,
    quality: {
      ...quality,
      candidateCyclesTotal: cycles.length,
    },
  };
}
