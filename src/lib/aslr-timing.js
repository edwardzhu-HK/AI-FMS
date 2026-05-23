const SIDES = ["left", "right"];

const DEFAULT_OPTIONS = {
  boundaryRatio: 0.24,
  highThresholdRatio: 0.55,
  minAmplitude: 0.06,
  minPeakGapSecond: 1.25,
  mergeSidesGapSecond: 0.8,
  minVisibility: 0.35,
  preBufferSecond: 0.25,
  postBufferSecond: 0.35,
  timingToleranceSecond: 0.35,
  wideContextToleranceSecond: 1.4,
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

export function buildAslrFrameFeatures(payload) {
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
    .filter(Boolean);
}

function smoothSideFeatures(features, windowSize) {
  const radius = Math.max(1, Math.floor(windowSize / 2));

  return features.map((feature, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(features.length, index + radius + 1);
    const window = features.slice(start, end);

    return {
      ...feature,
      smoothedElevation: average(window.map((item) => item.elevation)),
    };
  });
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
  const baselineAnkleY = percentile(
    sideFeatures.map((feature) => feature.ankleY),
    0.9,
  );

  if (baselineAnkleY === null) {
    return [];
  }

  return smoothSideFeatures(
    sideFeatures.map((feature) => ({
      ...feature,
      baselineAnkleY,
      // In image coordinates y grows downward, so a raised leg has lower ankle y.
      elevation: baselineAnkleY - feature.ankleY,
    })),
    config.smoothWindow,
  );
}

function findPeakCandidates(features, highThreshold) {
  const candidates = [];
  let regionStart = null;

  for (let index = 0; index < features.length; index += 1) {
    if (features[index].smoothedElevation >= highThreshold) {
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
        features[index].smoothedElevation >
        features[peakIndex].smoothedElevation
      ) {
        peakIndex = index;
      }
    }

    return {
      index: peakIndex,
      second: features[peakIndex].second,
      elevation: features[peakIndex].smoothedElevation,
      rawElevation: features[peakIndex].elevation,
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

    if (peak.elevation > previousPeak.elevation) {
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
    features[index].smoothedElevation > boundaryThreshold
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

  const elevationValues = features.map((feature) => feature.smoothedElevation);
  const lowElevation = percentile(elevationValues, 0.1);
  const highElevation = percentile(elevationValues, 0.9);
  const amplitude = highElevation - lowElevation;

  if (amplitude < config.minAmplitude) {
    return {
      cycles: [],
      quality: {
        side,
        status: "low_motion_amplitude",
        featureFrames: features.length,
        lowElevation,
        highElevation,
        amplitude,
      },
    };
  }

  const highThreshold = lowElevation + amplitude * config.highThresholdRatio;
  const boundaryThreshold = lowElevation + amplitude * config.boundaryRatio;
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
      peakSecond: Number(peak.second.toFixed(2)),
      // Keep the existing timing export/UI shape until a later schema review.
      lowestPointSecond: Number(peak.second.toFixed(2)),
      peakElevation: Number(peak.elevation.toFixed(4)),
      baselineElevation: Number(lowElevation.toFixed(4)),
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
      side,
      status: "ok",
      featureFrames: features.length,
      lowElevation,
      highElevation,
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
      cycle.peakElevation * 0.8 + (cycle.avgVisibility ?? 0) * 0.2;
    const previousStrength =
      previousCycle.peakElevation * 0.8 +
      (previousCycle.avgVisibility ?? 0) * 0.2;

    if (currentStrength > previousStrength) {
      mergedCycles[mergedCycles.length - 1] = cycle;
    }
  }

  return mergedCycles.map((cycle, index) => ({
    ...cycle,
    repetitionIndex: index + 1,
  }));
}

export function detectAslrCycles(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const rawFeatures = buildAslrFrameFeatures(payload);
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

  const indexedCycle = cycles[segment.repetitionIndex - 1];
  if (indexedCycle) {
    return indexedCycle;
  }

  const midpoint = (segment.startSecond + segment.endSecond) / 2;
  return cycles.reduce((bestCycle, cycle) => {
    const currentDistance = Math.abs(cycle.peakSecond - midpoint);
    const bestDistance = Math.abs(bestCycle.peakSecond - midpoint);
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
      label: "No reliable ASLR cycle",
      issues: [
        timingIssue(
          quality.status,
          "warning",
          "Pose trajectory is not strong enough to suggest ASLR timing.",
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
        "Segment starts after leg raise onset.",
      ),
    );
  }

  if (endDelta > config.timingToleranceSecond) {
    issues.push(
      timingIssue(
        "missing_return",
        "error",
        "Segment ends before the leg returns.",
      ),
    );
  }

  if (coverageRatio < config.minCoverageRatio) {
    issues.push(
      timingIssue(
        "too_short",
        "error",
        "Segment does not cover the full ASLR action.",
      ),
    );
  }

  if (startDelta < -config.wideContextToleranceSecond) {
    issues.push(
      timingIssue(
        "wide_lead",
        "info",
        "Segment includes a long lead-in before leg raise.",
      ),
    );
  }

  if (endDelta < -config.wideContextToleranceSecond) {
    issues.push(
      timingIssue(
        "wide_tail",
        "info",
        "Segment includes a long tail after leg return.",
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
      peakElevation: cycle.peakElevation,
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

export function evaluateAslrSegmentTiming({
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
  const { cycles, quality } = detectAslrCycles(posePayload, config);

  return evaluateSegmentAgainstCycles(cycles, quality, segment, config);
}

export function evaluateAslrSegmentsTiming({
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
  const { cycles, quality } = detectAslrCycles(posePayload, config);
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
      label: "No reliable ASLR cycle",
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
      : "All segments cover detected ASLR cycles",
    items,
    summary,
    cycles,
    quality,
  };
}
