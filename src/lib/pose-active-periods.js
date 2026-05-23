const TRACKED_LANDMARKS = [
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
];

const DEFAULT_OPTIONS = {
  minVisibility: 0.35,
  smoothWindow: 5,
  thresholdRatio: 0.42,
  minMotionScore: 0.006,
  minPeriodSecond: 0.9,
  mergeGapSecond: 1.6,
  preBufferSecond: 0.6,
  postBufferSecond: 0.8,
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

function getVisibleLandmarks(frame, minVisibility) {
  const landmarks = new Map();

  for (const landmark of frame?.poses?.[0]?.landmarks ?? []) {
    if (!TRACKED_LANDMARKS.includes(landmark.name)) {
      continue;
    }

    if (
      typeof landmark.x !== "number" ||
      typeof landmark.y !== "number" ||
      !Number.isFinite(landmark.x) ||
      !Number.isFinite(landmark.y)
    ) {
      continue;
    }

    if (
      typeof landmark.visibility === "number" &&
      landmark.visibility < minVisibility
    ) {
      continue;
    }

    landmarks.set(landmark.name, landmark);
  }

  return landmarks;
}

function buildFrameMotionRows(payload, config) {
  if (!Array.isArray(payload?.frames)) {
    return [];
  }

  const poseFrames = payload.frames
    .map((frame) => ({
      second: getFrameSecond(frame),
      landmarks: getVisibleLandmarks(frame, config.minVisibility),
    }))
    .filter((frame) => frame.second !== null && frame.landmarks.size > 0)
    .sort((left, right) => left.second - right.second);

  return poseFrames.map((frame, index) => {
    const previousFrame = poseFrames[index - 1];
    if (!previousFrame) {
      return {
        second: frame.second,
        motionScore: 0,
        trackedLandmarks: frame.landmarks.size,
      };
    }

    const distances = [];
    for (const name of TRACKED_LANDMARKS) {
      const current = frame.landmarks.get(name);
      const previous = previousFrame.landmarks.get(name);

      if (!current || !previous) {
        continue;
      }

      distances.push(
        Math.hypot(current.x - previous.x, current.y - previous.y),
      );
    }

    return {
      second: frame.second,
      motionScore: average(distances) ?? 0,
      trackedLandmarks: frame.landmarks.size,
    };
  });
}

function smoothRows(rows, windowSize) {
  const radius = Math.max(1, Math.floor(windowSize / 2));

  return rows.map((row, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(rows.length, index + radius + 1);
    const window = rows.slice(start, end);

    return {
      ...row,
      smoothedMotionScore: average(window.map((item) => item.motionScore)) ?? 0,
    };
  });
}

function rawPeriodsFromRows(rows, threshold) {
  const periods = [];
  let periodStart = null;

  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index].smoothedMotionScore >= threshold) {
      if (periodStart === null) {
        periodStart = index;
      }
      continue;
    }

    if (periodStart !== null) {
      periods.push([periodStart, index - 1]);
      periodStart = null;
    }
  }

  if (periodStart !== null) {
    periods.push([periodStart, rows.length - 1]);
  }

  return periods.map(([startIndex, endIndex]) => {
    const window = rows.slice(startIndex, endIndex + 1);
    return {
      startSecond: rows[startIndex].second,
      endSecond: rows[endIndex].second,
      durationSecond: rows[endIndex].second - rows[startIndex].second,
      avgMotionScore: average(window.map((row) => row.smoothedMotionScore)),
      peakMotionScore: Math.max(
        ...window.map((row) => row.smoothedMotionScore),
      ),
    };
  });
}

function expandPeriod(period, firstSecond, lastSecond, config) {
  const startSecond = Number(
    clamp(
      period.startSecond - config.preBufferSecond,
      firstSecond,
      lastSecond,
    ).toFixed(2),
  );
  const endSecond = Number(
    clamp(
      period.endSecond + config.postBufferSecond,
      firstSecond,
      lastSecond,
    ).toFixed(2),
  );

  return {
    ...period,
    startSecond,
    endSecond,
    durationSecond: Number((endSecond - startSecond).toFixed(2)),
  };
}

function mergePeriods(periods, config) {
  return periods.reduce((merged, period) => {
    const previousPeriod = merged.at(-1);
    if (
      !previousPeriod ||
      period.startSecond - previousPeriod.endSecond > config.mergeGapSecond
    ) {
      merged.push(period);
      return merged;
    }

    previousPeriod.endSecond = Math.max(
      previousPeriod.endSecond,
      period.endSecond,
    );
    previousPeriod.durationSecond = Number(
      (previousPeriod.endSecond - previousPeriod.startSecond).toFixed(2),
    );
    previousPeriod.avgMotionScore = average([
      previousPeriod.avgMotionScore,
      period.avgMotionScore,
    ]);
    previousPeriod.peakMotionScore = Math.max(
      previousPeriod.peakMotionScore ?? 0,
      period.peakMotionScore ?? 0,
    );

    return merged;
  }, []);
}

function buildRecommendedRange(periods) {
  if (periods.length === 0) {
    return null;
  }

  return {
    startSecond: periods[0].startSecond,
    endSecond: periods.at(-1).endSecond,
    periodCount: periods.length,
  };
}

export function detectPoseActivePeriods(payload, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const rawRows = buildFrameMotionRows(payload, config);

  if (rawRows.length < config.smoothWindow * 2) {
    return {
      status: "insufficient_pose",
      label: "Not enough pose frames",
      periods: [],
      recommendedRange: null,
      metrics: {
        frameCount: rawRows.length,
      },
    };
  }

  const rows = smoothRows(rawRows, config.smoothWindow);
  const motionScores = rows.map((row) => row.smoothedMotionScore);
  const lowMotion = percentile(motionScores, 0.25) ?? 0;
  const highMotion = percentile(motionScores, 0.92) ?? 0;
  const amplitude = highMotion - lowMotion;
  const threshold = Math.max(
    config.minMotionScore,
    lowMotion + amplitude * config.thresholdRatio,
  );
  const firstSecond = rows[0].second;
  const lastSecond = rows.at(-1).second;
  const periods = mergePeriods(
    rawPeriodsFromRows(rows, threshold)
      .map((period) => expandPeriod(period, firstSecond, lastSecond, config))
      .filter((period) => period.durationSecond >= config.minPeriodSecond),
    config,
  );
  const recommendedRange = buildRecommendedRange(periods);

  if (!recommendedRange) {
    return {
      status: "no_active_period",
      label: "No clear active period",
      periods: [],
      recommendedRange: null,
      metrics: {
        frameCount: rows.length,
        lowMotion,
        highMotion,
        amplitude,
        threshold,
      },
    };
  }

  return {
    status: "ok",
    label: "Active period detected",
    periods,
    recommendedRange,
    metrics: {
      frameCount: rows.length,
      lowMotion,
      highMotion,
      amplitude,
      threshold,
      activeDurationSecond: periods.reduce(
        (sum, period) => sum + period.durationSecond,
        0,
      ),
      recommendedDurationSecond:
        recommendedRange.endSecond - recommendedRange.startSecond,
    },
  };
}
