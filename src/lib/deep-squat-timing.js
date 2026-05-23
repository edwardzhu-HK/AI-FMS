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
        shoulderY,
        ankleY,
        visibility,
        // y grows downward in image coordinates; a larger ratio means deeper squat.
        depthRatio: (hipY - shoulderY) / (ankleY - shoulderY),
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
      rawDepthRatio: features[peakIndex].depthRatio,
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

export function detectDeepSquatCycles(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const rawFeatures = buildDeepSquatFrameFeatures(payload);

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
  const depthValues = features.map((feature) => feature.smoothedDepthRatio);
  const standingDepth = percentile(depthValues, 0.2);
  const deepDepth = percentile(depthValues, 0.9);
  const amplitude = deepDepth - standingDepth;

  if (amplitude < config.minAmplitude) {
    return {
      cycles: [],
      quality: {
        status: "low_motion_amplitude",
        featureFrames: features.length,
        standingDepth,
        deepDepth,
        amplitude,
      },
    };
  }

  const highThreshold = standingDepth + amplitude * config.highThresholdRatio;
  const boundaryThreshold = standingDepth + amplitude * config.boundaryRatio;
  const firstSecond = features[0].second;
  const lastSecond = features.at(-1).second;
  const peaks = mergeNearbyPeaks(
    findPeakCandidates(features, highThreshold),
    config.minPeakGapSecond,
  );

  const cycles = peaks.map((peak, index) => {
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
      lowestPointSecond: Number(peak.second.toFixed(2)),
      peakDepthRatio: Number(peak.depthRatio.toFixed(4)),
      baselineDepthRatio: Number(standingDepth.toFixed(4)),
      amplitude: Number(amplitude.toFixed(4)),
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
      status: "ok",
      featureFrames: features.length,
      standingDepth,
      deepDepth,
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
  const items = segments.map((segment) => ({
    segmentId: segment.segmentId,
    repetitionIndex: segment.repetitionIndex,
    cameraView: segment.cameraView,
    currentStartSecond: segment.startSecond,
    currentEndSecond: segment.endSecond,
    ...evaluateSegmentAgainstCycles(cycles, quality, segment, config),
  }));
  const summary = summarizeTimingItems(items, cycles);
  const hasBlockingIssue = summary.needsAdjustmentCount > 0;

  if (cycles.length === 0) {
    return {
      status: "insufficient_pose",
      label: "No reliable squat cycle",
      items,
      summary,
      cycles,
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
    cycles,
    quality,
  };
}
