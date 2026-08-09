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
  "left_ankle",
  "right_ankle",
];

const DEFAULT_OPTIONS = {
  boundaryRatio: 0.22,
  highThresholdRatio: 0.52,
  minAmplitude: 0.08,
  minPeakGapSecond: 3.2,
  preBufferSecond: 0.3,
  postBufferSecond: 0.35,
  timingToleranceSecond: 0.35,
  wideContextToleranceSecond: 1.4,
  minCoverageRatio: 0.85,
  smoothWindow: 5,
  compressionBoundaryRatio: 0.16,
  compressionHighThresholdRatio: 0.35,
  minCompressionAmplitude: 0.035,
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

export function buildDeepSquatFrameFeatures(payload) {
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
      const ankleY = getLandmarkAverage(
        landmarks,
        ["left_ankle", "right_ankle"],
        "y",
      );
      const kneeY = getLandmarkAverage(
        landmarks,
        ["left_knee", "right_knee"],
        "y",
      );
      const visibility = getRequiredVisibility(landmarks);

      if (
        second === null ||
        shoulderY === null ||
        hipY === null ||
        ankleY === null ||
        ankleY - shoulderY < 0.05
      ) {
        return null;
      }

      return {
        second,
        hipY,
        kneeY,
        shoulderY,
        ankleY,
        visibility,
        // y grows downward in image coordinates; a larger ratio means deeper squat.
        depthRatio: (hipY - shoulderY) / (ankleY - shoulderY),
        hipKneeVerticalGap: kneeY === null ? null : kneeY - hipY,
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
      smoothedDepthRatio: average(window.map((item) => item.depthRatio)),
      smoothedHipKneeVerticalGap: average(
        window.map((item) => item.hipKneeVerticalGap),
      ),
    };
  });
}

function withCompressionSignal(features) {
  const standingHipKneeGap = percentile(
    features.map((feature) => feature.smoothedHipKneeVerticalGap),
    0.8,
  );

  if (standingHipKneeGap === null) {
    return {
      features,
      standingHipKneeGap: null,
    };
  }

  return {
    standingHipKneeGap,
    features: features.map((feature) => ({
      ...feature,
      smoothedCompressionRatio:
        feature.smoothedHipKneeVerticalGap === null
          ? null
          : Math.max(
              0,
              standingHipKneeGap - feature.smoothedHipKneeVerticalGap,
            ),
    })),
  };
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

    if (
      (peak.depthScore ?? peak.depthRatio) >
      (previousPeak.depthScore ?? previousPeak.depthRatio)
    ) {
      merged[merged.length - 1] = peak;
    }

    return merged;
  }, []);
}

function findPeakCandidates(features, highThreshold, signalField) {
  const candidates = [];
  let regionStart = null;

  for (let index = 0; index < features.length; index += 1) {
    if (features[index][signalField] >= highThreshold) {
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
      if (features[index][signalField] > features[peakIndex][signalField]) {
        peakIndex = index;
      }
    }

    return {
      index: peakIndex,
      second: features[peakIndex].second,
      depthScore: features[peakIndex][signalField],
      depthRatio: features[peakIndex].smoothedDepthRatio,
      compressionRatio: features[peakIndex].smoothedCompressionRatio ?? null,
      rawDepthRatio: features[peakIndex].depthRatio,
    };
  });
}

function findBoundaryIndex(
  features,
  peakIndex,
  direction,
  boundaryThreshold,
  signalField,
) {
  let index = peakIndex;

  while (
    index + direction >= 0 &&
    index + direction < features.length &&
    features[index][signalField] > boundaryThreshold
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

function buildCyclesFromSignal({
  features,
  config,
  firstSecond,
  lastSecond,
  highThreshold,
  boundaryThreshold,
  baselineDepthRatio,
  amplitude,
  signalField,
  source,
}) {
  const peaks = mergeNearbyPeaks(
    findPeakCandidates(features, highThreshold, signalField),
    config.minPeakGapSecond,
  );

  return peaks.map((peak, index) => {
    const startIndex = findBoundaryIndex(
      features,
      peak.index,
      -1,
      boundaryThreshold,
      signalField,
    );
    const endIndex = findBoundaryIndex(
      features,
      peak.index,
      1,
      boundaryThreshold,
      signalField,
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
      lowestPointSecond: Number(peak.second.toFixed(2)),
      peakDepthRatio: Number(peak.depthRatio.toFixed(4)),
      peakCompressionRatio:
        peak.compressionRatio === null
          ? null
          : Number(peak.compressionRatio.toFixed(4)),
      baselineDepthRatio: Number(baselineDepthRatio.toFixed(4)),
      amplitude: Number(amplitude.toFixed(4)),
      timingSignal: source,
      avgVisibility: getWindowAverageVisibility(
        features,
        startSecond,
        endSecond,
      ),
    };
  });
}

function detectDeepSquatCyclesFromFeatures(rawFeatures, config) {
  if (rawFeatures.length < config.smoothWindow * 2) {
    return {
      cycles: [],
      quality: {
        status: "insufficient_pose",
        featureFrames: rawFeatures.length,
      },
    };
  }

  const { features, standingHipKneeGap } = withCompressionSignal(
    smoothFeatures(rawFeatures, config.smoothWindow),
  );
  const depthValues = features.map((feature) => feature.smoothedDepthRatio);
  const standingDepth = percentile(depthValues, 0.2);
  const deepDepth = percentile(depthValues, 0.9);
  const amplitude = deepDepth - standingDepth;
  const compressionValues = features.map(
    (feature) => feature.smoothedCompressionRatio,
  );
  const lowCompression = percentile(compressionValues, 0.2) ?? 0;
  const deepCompression = percentile(compressionValues, 0.9) ?? 0;
  const compressionAmplitude = deepCompression - lowCompression;

  if (
    amplitude < config.minAmplitude &&
    compressionAmplitude < config.minCompressionAmplitude
  ) {
    return {
      cycles: [],
      quality: {
        status: "low_motion_amplitude",
        featureFrames: features.length,
        standingDepth,
        deepDepth,
        amplitude,
        standingHipKneeGap,
        lowCompression,
        deepCompression,
        compressionAmplitude,
      },
    };
  }

  const highThreshold = standingDepth + amplitude * config.highThresholdRatio;
  const boundaryThreshold = standingDepth + amplitude * config.boundaryRatio;
  const compressionHighThreshold =
    lowCompression +
    compressionAmplitude * config.compressionHighThresholdRatio;
  const compressionBoundaryThreshold =
    lowCompression + compressionAmplitude * config.compressionBoundaryRatio;
  const firstSecond = features[0].second;
  const lastSecond = features.at(-1).second;

  const depthCycles =
    amplitude >= config.minAmplitude
      ? buildCyclesFromSignal({
          features,
          config,
          firstSecond,
          lastSecond,
          highThreshold,
          boundaryThreshold,
          baselineDepthRatio: standingDepth,
          amplitude,
          signalField: "smoothedDepthRatio",
          source: "depth_ratio",
        })
      : [];
  const compressionCycles =
    compressionAmplitude >= config.minCompressionAmplitude
      ? buildCyclesFromSignal({
          features,
          config,
          firstSecond,
          lastSecond,
          highThreshold: compressionHighThreshold,
          boundaryThreshold: compressionBoundaryThreshold,
          baselineDepthRatio: standingDepth,
          amplitude: compressionAmplitude,
          signalField: "smoothedCompressionRatio",
          source: "hip_knee_compression",
        })
      : [];
  const cycles = dedupeOverlappingCycles(
    [...depthCycles, ...compressionCycles],
    {
      overlapThreshold: 0.5,
    },
  );

  return {
    cycles,
    quality: {
      status: "ok",
      featureFrames: features.length,
      standingDepth,
      deepDepth,
      amplitude,
      highThreshold,
      boundaryThreshold,
      standingHipKneeGap,
      lowCompression,
      deepCompression,
      compressionAmplitude,
      compressionHighThreshold,
      compressionBoundaryThreshold,
      depthCycles: depthCycles.length,
      compressionCycles: compressionCycles.length,
      mergedCycles: cycles.length,
    },
  };
}

function normalizeProcessedWindows(windows) {
  if (!Array.isArray(windows)) {
    return [];
  }

  return windows
    .map((window, index) => ({
      index,
      startSecond: window?.startSecond,
      endSecond: window?.endSecond,
    }))
    .filter(
      (window) =>
        typeof window.startSecond === "number" &&
        Number.isFinite(window.startSecond) &&
        typeof window.endSecond === "number" &&
        Number.isFinite(window.endSecond) &&
        window.endSecond > window.startSecond,
    )
    .sort((left, right) => left.startSecond - right.startSecond);
}

function sumQualityField(windowResults, field) {
  return windowResults.reduce(
    (sum, result) => sum + (result.quality?.[field] ?? 0),
    0,
  );
}

function getWindowCycleStrength(cycle) {
  return (
    (cycle.peakDepthRatio ?? 0) +
    (cycle.peakCompressionRatio ?? 0) +
    (cycle.avgVisibility ?? 0) * 0.05
  );
}

function pickDominantWindowCycle(cycles) {
  if (cycles.length <= 1) {
    return cycles;
  }

  return [
    cycles.reduce((bestCycle, cycle) =>
      getWindowCycleStrength(cycle) > getWindowCycleStrength(bestCycle)
        ? cycle
        : bestCycle,
    ),
  ];
}

function detectWindowedDeepSquatCycles(rawFeatures, windows, config) {
  const windowResults = windows.map((window) => {
    const features = rawFeatures.filter(
      (feature) =>
        feature.second >= window.startSecond &&
        feature.second <= window.endSecond,
    );
    const result = detectDeepSquatCyclesFromFeatures(features, config);

    return {
      window,
      ...result,
      candidateCycles: result.cycles,
      cycles: pickDominantWindowCycle(result.cycles),
    };
  });
  const cycles = [];

  for (const result of windowResults) {
    for (const cycle of result.cycles) {
      cycles.push({
        ...cycle,
        repetitionIndex: cycles.length + 1,
        processedWindowIndex: result.window.index + 1,
        processedWindowStartSecond: result.window.startSecond,
        processedWindowEndSecond: result.window.endSecond,
      });
    }
  }

  return {
    cycles,
    quality: {
      status: cycles.length > 0 ? "ok" : "insufficient_pose",
      detectionMode: "processed_windows",
      featureFrames: rawFeatures.length,
      processedWindows: windows.length,
      candidateCyclesTotal: cycles.length,
      depthCycles: sumQualityField(windowResults, "depthCycles"),
      compressionCycles: sumQualityField(windowResults, "compressionCycles"),
      mergedCycles: cycles.length,
      windowQualities: windowResults.map((result) => ({
        windowIndex: result.window.index + 1,
        startSecond: result.window.startSecond,
        endSecond: result.window.endSecond,
        status: result.quality.status,
        featureFrames: result.quality.featureFrames,
        candidateCycles: result.candidateCycles.length,
        detectedCycles: result.cycles.length,
      })),
    },
  };
}

export function detectDeepSquatCycles(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const rawFeatures = buildDeepSquatFrameFeatures(payload);
  const processedWindows = normalizeProcessedWindows(
    payload?.sourceVideo?.processedWindows,
  );

  if (processedWindows.length > 1) {
    return detectWindowedDeepSquatCycles(rawFeatures, processedWindows, config);
  }

  return detectDeepSquatCyclesFromFeatures(rawFeatures, config);
}

function pickCycleForSegment(cycles, segment) {
  if (!segment || cycles.length === 0) {
    return null;
  }

  const indexedCycle = cycles[segment.repetitionIndex - 1];
  if (indexedCycle) {
    return indexedCycle;
  }

  const midpoint = (segment.startSecond + segment.endSecond) / 2;
  return cycles.reduce((bestCycle, cycle) => {
    const currentDistance = Math.abs(cycle.lowestPointSecond - midpoint);
    const bestDistance = Math.abs(bestCycle.lowestPointSecond - midpoint);
    return currentDistance < bestDistance ? cycle : bestCycle;
  }, cycles[0]);
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
      label: "No reliable squat cycle",
      issues: [
        timingIssue(
          quality.status,
          "warning",
          "Pose trajectory is not strong enough to suggest segment timing.",
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
        "Segment starts after movement onset.",
      ),
    );
  }

  if (endDelta > config.timingToleranceSecond) {
    issues.push(
      timingIssue(
        "missing_return",
        "error",
        "Segment ends before return to standing.",
      ),
    );
  }

  if (coverageRatio < config.minCoverageRatio) {
    issues.push(
      timingIssue(
        "too_short",
        "error",
        "Segment does not cover the full action.",
      ),
    );
  }

  if (startDelta < -config.wideContextToleranceSecond) {
    issues.push(
      timingIssue(
        "wide_lead",
        "info",
        "Segment includes a long lead-in before motion.",
      ),
    );
  }

  if (endDelta < -config.wideContextToleranceSecond) {
    issues.push(
      timingIssue(
        "wide_tail",
        "info",
        "Segment includes a long tail after motion.",
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

export function evaluateDeepSquatSegmentTiming({
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
  const { cycles, quality } = detectDeepSquatCycles(posePayload, config);

  return evaluateSegmentAgainstCycles(cycles, quality, segment, config);
}

export function evaluateDeepSquatSegmentsTiming({
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
  const { cycles, quality } = detectDeepSquatCycles(posePayload, config);
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
      label: "No reliable squat cycle",
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
      : "All segments cover detected cycles",
    items,
    summary,
    cycles: assignedCycles,
    quality: {
      ...quality,
      candidateCyclesTotal: cycles.length,
    },
  };
}
