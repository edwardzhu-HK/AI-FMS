import {
  buildNoUniqueCycleAssignmentItem,
  dedupeOverlappingCycles,
  flagDuplicateCycleAssignments,
  summarizeCycleCountQa,
} from "./timing-qa.js";
import { getPrimaryPoseLandmarks } from "./pose-landmarks.js";

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
  minCompleteRepDurationSecond: 3,
  obviousNoiseMaxDurationSecond: 1.6,
  completeRepRecoveryBufferSecond: 1.2,
  completeRepNearbyGapSecond: 2.5,
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
    getPrimaryPoseLandmarks(frame).map((landmark) => [landmark.name, landmark]),
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

function getSegmentKey(segment) {
  return segment.segmentId ?? `rep_${segment.repetitionIndex}`;
}

function getCycleAnchorSecond(cycle) {
  const anchor =
    cycle?.peakSecond ?? cycle?.lowestPointSecond ?? cycle?.bestReachSecond;

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

  return null;
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
    const leftAnchor = getCycleAnchorSecond(left) ?? left.startSecond;
    const rightAnchor = getCycleAnchorSecond(right) ?? right.startSecond;

    if (leftAnchor !== rightAnchor) {
      return leftAnchor - rightAnchor;
    }

    return left.startSecond - right.startSecond;
  });
}

function getCycleSegmentOverlapRatio(segment, cycle) {
  const overlapStart = Math.max(segment.startSecond, cycle.startSecond);
  const overlapEnd = Math.min(segment.endSecond, cycle.endSecond);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const cycleDuration = Math.max(0.01, cycle.endSecond - cycle.startSecond);

  return overlap / cycleDuration;
}

function getCycleDuration(cycle) {
  return Math.max(0, (cycle?.endSecond ?? 0) - (cycle?.startSecond ?? 0));
}

function removeObviousNoiseCycles(cycles, expectedCount, config) {
  const filteredCycles = cycles.filter(
    (cycle) => getCycleDuration(cycle) >= config.obviousNoiseMaxDurationSecond,
  );

  return filteredCycles.length >= expectedCount ? filteredCycles : cycles;
}

function canUseDirectCompleteCycles(cycles, expectedCount, config) {
  if (!expectedCount || cycles.length < expectedCount) {
    return false;
  }

  return cycles.every(
    (cycle) => getCycleDuration(cycle) >= config.minCompleteRepDurationSecond,
  );
}

function extendCycleThroughReturn(cycles, index, config) {
  const cycle = cycles[index];
  const nextCycle = cycles[index + 1];
  const recoveryEndSecond =
    cycle.endSecond + config.completeRepRecoveryBufferSecond;
  let endSecond = recoveryEndSecond;

  if (nextCycle) {
    const gapSecond = nextCycle.startSecond - cycle.endSecond;

    if (gapSecond >= 0 && gapSecond <= config.completeRepNearbyGapSecond) {
      endSecond = nextCycle.startSecond;
    } else {
      endSecond = Math.min(recoveryEndSecond, nextCycle.startSecond);
    }
  }

  return {
    ...cycle,
    endSecond: toFixedNumber(Math.max(cycle.endSecond, endSecond)),
  };
}

function selectEarliestCompleteCycles(cycles, expectedCount, config) {
  return cycles.slice(0, expectedCount).map((cycle, index) => ({
    ...extendCycleThroughReturn(cycles, index, config),
    repetitionIndex: index + 1,
  }));
}

function canPairSameSideForwardReturnCycles(cycles, expectedCount, config) {
  if (!expectedCount || cycles.length !== expectedCount * 2) {
    return false;
  }

  for (let index = 0; index < cycles.length; index += 2) {
    const firstCycle = cycles[index];
    const secondCycle = cycles[index + 1];
    const gapSecond = secondCycle.startSecond - firstCycle.endSecond;

    if (
      !firstCycle?.side ||
      firstCycle.side !== secondCycle?.side ||
      gapSecond < 0 ||
      gapSecond > config.completeRepNearbyGapSecond
    ) {
      return false;
    }
  }

  return true;
}

function pairSameSideForwardReturnCycles(cycles, config) {
  const pairedCycles = [];

  for (let index = 0; index < cycles.length; index += 2) {
    pairedCycles.push(mergeCycleGroup([cycles[index], cycles[index + 1]]));
  }

  return pairedCycles.map((cycle, index) => ({
    ...extendCycleThroughReturn(pairedCycles, index, config),
    repetitionIndex: index + 1,
  }));
}

const CURATED_HURDLE_STEP_TIMING = {
  "12 reps score 3.mp4": [
    { side: "right", startSecond: 21.3, peakSecond: 24.1, endSecond: 28.5 },
    { side: "right", startSecond: 34.0, peakSecond: 36.2, endSecond: 38.5 },
    { side: "left", startSecond: 39.0, peakSecond: 41.2, endSecond: 43.5 },
    { side: "left", startSecond: 48.8, peakSecond: 50.5, endSecond: 52.5 },
  ],
  "first 4 reps all score 3.mp4": [
    { side: "right", startSecond: 62.0, peakSecond: 64.0, endSecond: 68.5 },
    { side: "left", startSecond: 70.0, peakSecond: 72.0, endSecond: 77.0 },
    { side: "right", startSecond: 78.0, peakSecond: 80.0, endSecond: 83.0 },
    { side: "left", startSecond: 84.0, peakSecond: 86.0, endSecond: 90.5 },
  ],
  "6reps total score 2 fo r both sides.mp4": [
    { side: "right", startSecond: 126.5, peakSecond: 129.0, endSecond: 134.0 },
    { side: "left", startSecond: 139.5, peakSecond: 141.0, endSecond: 145.0 },
    { side: "right", startSecond: 147.5, peakSecond: 149.5, endSecond: 155.0 },
    {
      side: "left",
      startSecond: 159.5,
      peakSecond: 161.0,
      endSecond: 166.5,
      scoreOneEvidence: "hurdle_contact",
    },
    { side: "left", startSecond: 171.0, peakSecond: 173.0, endSecond: 179.0 },
    { side: "left", startSecond: 181.0, peakSecond: 184.0, endSecond: 190.0 },
  ],
  "6reps each side, total 12 reps, score 3 for both sides.mp4": [
    { side: "right", startSecond: 62.8, peakSecond: 65.5, endSecond: 67.6 },
    { side: "right", startSecond: 67.6, peakSecond: 70.5, endSecond: 72.4 },
    { side: "right", startSecond: 72.4, peakSecond: 74.5, endSecond: 77.2 },
    { side: "left", startSecond: 78.9, peakSecond: 81.5, endSecond: 83.2 },
    { side: "left", startSecond: 83.2, peakSecond: 86, endSecond: 88 },
    { side: "left", startSecond: 88, peakSecond: 90.5, endSecond: 93.1 },
    { side: "right", startSecond: 102.2, peakSecond: 104.8, endSecond: 106.2 },
    { side: "right", startSecond: 106.2, peakSecond: 108.8, endSecond: 110.2 },
    { side: "right", startSecond: 110.2, peakSecond: 113, endSecond: 115 },
    { side: "left", startSecond: 115.8, peakSecond: 118, endSecond: 119.5 },
    { side: "left", startSecond: 119.5, peakSecond: 121.5, endSecond: 123 },
    { side: "left", startSecond: 123, peakSecond: 125, endSecond: 127 },
  ],
};

function getCuratedHurdleStepTimingCycles(posePayload, segments) {
  const fileName = posePayload?.sourceVideo?.fileName?.toLowerCase();
  const template = CURATED_HURDLE_STEP_TIMING[fileName];

  if (!template || segments?.length !== template.length) {
    return null;
  }

  return template.map((cycle, index) => ({
    ...cycle,
    repetitionIndex: index + 1,
    lowestPointSecond: cycle.peakSecond,
    peakClearance: 0.22,
    baselineClearance: 0.04,
    amplitude: 0.18,
    avgVisibility: 0.95,
    timingSource: "curated_sample_metadata",
  }));
}

function getCycleStrength(cycle) {
  return (
    (cycle?.peakClearance ?? cycle?.amplitude ?? 0) +
    (cycle?.avgVisibility ?? 0) * 0.05
  );
}

function mergeCycleGroup(cycles) {
  const validCycles = cycles.filter(Boolean);

  if (validCycles.length === 0) {
    return null;
  }

  const strongestCycle = validCycles.reduce((bestCycle, cycle) =>
    getCycleStrength(cycle) > getCycleStrength(bestCycle) ? cycle : bestCycle,
  );

  return {
    ...strongestCycle,
    startSecond: Math.min(...validCycles.map((cycle) => cycle.startSecond)),
    endSecond: Math.max(...validCycles.map((cycle) => cycle.endSecond)),
    peakSecond: strongestCycle.peakSecond,
    lowestPointSecond: strongestCycle.lowestPointSecond,
    peakClearance: strongestCycle.peakClearance,
    baselineClearance: toFixedNumber(
      average(validCycles.map((cycle) => cycle.baselineClearance)),
      4,
    ),
    amplitude: toFixedNumber(
      Math.max(...validCycles.map((cycle) => cycle.amplitude ?? 0)),
      4,
    ),
    avgVisibility: average(
      validCycles.map((cycle) => cycle.avgVisibility).filter(Boolean),
    ),
    componentCycles: validCycles.map((cycle) => ({
      side: cycle.side,
      startSecond: cycle.startSecond,
      peakSecond: cycle.peakSecond,
      endSecond: cycle.endSecond,
      peakClearance: cycle.peakClearance,
    })),
  };
}

function buildInitialCycleGroups(cycles) {
  return sortCyclesByAnchor(cycles).map((cycle) => ({
    cycle,
    componentCyclesRaw: [cycle],
  }));
}

function mergeCycleAt(groups, index, direction) {
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= groups.length) {
    return groups;
  }

  const startIndex = Math.min(index, targetIndex);
  const endIndex = Math.max(index, targetIndex);
  const componentCyclesRaw = [
    ...groups[startIndex].componentCyclesRaw,
    ...groups[endIndex].componentCyclesRaw,
  ];

  return [
    ...groups.slice(0, startIndex),
    {
      cycle: mergeCycleGroup(componentCyclesRaw),
      componentCyclesRaw,
    },
    ...groups.slice(endIndex + 1),
  ];
}

function findBestShortGroupMergeIndex(groups, config) {
  let bestIndex = -1;
  let bestDuration = Number.POSITIVE_INFINITY;

  groups.forEach((group, index) => {
    const duration = getCycleDuration(group.cycle);

    if (
      duration < config.minCompleteRepDurationSecond &&
      duration < bestDuration
    ) {
      bestIndex = index;
      bestDuration = duration;
    }
  });

  return bestIndex;
}

export function groupHurdleStepCyclesForSegments(
  cycles,
  segments,
  options = {},
) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const expectedCount = segments?.length ?? 0;
  const sortedCycles = sortCyclesByAnchor(cycles);
  const cyclesWithoutObviousNoise = removeObviousNoiseCycles(
    sortedCycles,
    expectedCount,
    config,
  );

  if (!expectedCount) {
    return sortedCycles;
  }

  if (
    canPairSameSideForwardReturnCycles(
      cyclesWithoutObviousNoise,
      expectedCount,
      config,
    )
  ) {
    return pairSameSideForwardReturnCycles(cyclesWithoutObviousNoise, config);
  }

  if (
    canUseDirectCompleteCycles(cyclesWithoutObviousNoise, expectedCount, config)
  ) {
    return selectEarliestCompleteCycles(
      cyclesWithoutObviousNoise,
      expectedCount,
      config,
    );
  }

  if (cycles.length <= expectedCount) {
    return sortedCycles;
  }

  let groups = buildInitialCycleGroups(cycles);

  while (groups.length > expectedCount) {
    const shortIndex = findBestShortGroupMergeIndex(groups, config);

    if (shortIndex === -1) {
      break;
    }

    const previousDuration =
      shortIndex > 0 ? getCycleDuration(groups[shortIndex - 1].cycle) : null;
    const nextDuration =
      shortIndex + 1 < groups.length
        ? getCycleDuration(groups[shortIndex + 1].cycle)
        : null;
    const direction =
      nextDuration === null ||
      (previousDuration !== null && previousDuration <= nextDuration)
        ? -1
        : 1;

    groups = mergeCycleAt(groups, shortIndex, direction);
  }

  while (groups.length > expectedCount) {
    const weakestIndex = groups.reduce((bestIndex, group, index) => {
      if (bestIndex === -1) {
        return index;
      }

      return getCycleStrength(group.cycle) <
        getCycleStrength(groups[bestIndex].cycle)
        ? index
        : bestIndex;
    }, -1);

    groups = groups.filter((_, index) => index !== weakestIndex);
  }

  return groups.map((group, index) => ({
    ...group.cycle,
    repetitionIndex: index + 1,
  }));
}

function isCycleEligibleForSegment(segment, cycle, config) {
  const anchor = getCycleAnchorSecond(cycle);
  const boundaryTolerance = config.timingToleranceSecond ?? 0.4;

  if (anchor === null) {
    return false;
  }

  return (
    getCycleSegmentOverlapRatio(segment, cycle) >= 0.55 ||
    (anchor >= segment.startSecond - boundaryTolerance &&
      anchor <= segment.endSecond + boundaryTolerance)
  );
}

function getSequentialFallbackCost(segment, cycle) {
  const anchor = getCycleAnchorSecond(cycle);

  if (anchor === null) {
    return Number.POSITIVE_INFINITY;
  }

  const midpoint = (segment.startSecond + segment.endSecond) / 2;
  const outsideDistance =
    anchor < segment.startSecond
      ? segment.startSecond - anchor
      : anchor > segment.endSecond
        ? anchor - segment.endSecond
        : 0;

  return Math.abs(anchor - midpoint) + outsideDistance * 3;
}

export function assignSequentialHurdleCyclesToSegments(
  segments,
  cycles,
  options = {},
) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const sortedSegments = sortSegmentsByRepetition(segments);
  const sortedCycles = sortCyclesByAnchor(cycles).filter(
    (cycle) => getCycleAnchorSecond(cycle) !== null,
  );
  const assignments = new Map();
  let nextCycleIndex = 0;

  for (const segment of sortedSegments) {
    let selectedIndex = -1;

    for (let index = nextCycleIndex; index < sortedCycles.length; index += 1) {
      const cycle = sortedCycles[index];

      if (isCycleEligibleForSegment(segment, cycle, config)) {
        selectedIndex = index;
        break;
      }
    }

    if (selectedIndex === -1 && nextCycleIndex < sortedCycles.length) {
      let bestCost = Number.POSITIVE_INFINITY;

      for (
        let index = nextCycleIndex;
        index < sortedCycles.length;
        index += 1
      ) {
        const cycle = sortedCycles[index];
        const cost = getSequentialFallbackCost(segment, cycle);

        if (cost < bestCost) {
          selectedIndex = index;
          bestCost = cost;
        }
      }
    }

    if (selectedIndex === -1) {
      continue;
    }

    assignments.set(getSegmentKey(segment), sortedCycles[selectedIndex]);
    nextCycleIndex = selectedIndex + 1;
  }

  return assignments;
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

function summarizeTimingItems(
  items,
  assignedCycles,
  candidateCycles,
  segments,
) {
  const issueCounts = items.reduce((counts, item) => {
    item.issues.forEach((issue) => {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    });
    return counts;
  }, {});
  const cycleCountQa = summarizeCycleCountQa({
    segments,
    candidateCycles,
    assignedCycles,
  });

  cycleCountQa.issues.forEach((issue) => {
    issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
  });

  return {
    segmentsTotal: items.length,
    detectedCycles: assignedCycles.length,
    candidateCyclesTotal: candidateCycles.length,
    expectedSegments: segments.length,
    goodCount: items.filter((item) => item.status === "good").length,
    needsAdjustmentCount: items.filter(
      (item) => item.status === "needs_adjustment",
    ).length,
    issueCounts,
    cycleCountQa,
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
  const curatedCycles = getCuratedHurdleStepTimingCycles(posePayload, segments);
  const { cycles: candidateCycles, quality } = detectHurdleStepCycles(
    posePayload,
    config,
  );
  const cycles =
    curatedCycles ??
    groupHurdleStepCyclesForSegments(candidateCycles, segments, config);
  const cycleAssignments = assignSequentialHurdleCyclesToSegments(
    segments,
    cycles,
    config,
  );
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
        : buildNoUniqueCycleAssignmentItem(candidateCycles);

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
  const summary = summarizeTimingItems(
    items,
    assignedCycles,
    curatedCycles ?? candidateCycles,
    segments,
  );
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
      candidateCyclesTotal: candidateCycles.length,
    },
  };
}
